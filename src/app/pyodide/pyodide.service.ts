import {Injectable} from '@angular/core';
import {Location} from '@angular/common';
import {BehaviorSubject, defer, Observable, of, race, Subject, timer} from 'rxjs';
import {filter, map, mapTo, shareReplay, tap} from 'rxjs/operators';
import {MessageType, PyodideWorkerMessage, PythonCallableData} from 'src/app/pyodide/pyodide.types';
import {Actions, ofActionSuccessful} from '@ngxs/store';
import {ExperienceAction} from '../experience/actions';

@Injectable({
  providedIn: 'root',
})
export class PyodideService {
  private static FILESYSTEM_DEBUG = false;
  // This pyodide is only used for FS access
  pyodide = this.initPyodide();
  private worker!: Worker;

  onMessageListener$ = new Subject<PyodideWorkerMessage>();
  preloadComplete$ = new BehaviorSubject(false);

  private interruptBuffer = new Uint8Array(new SharedArrayBuffer(1));
  private loadedLibs: Set<string> = new Set<string>();
  private pythonCallbacks: string[] = [];
  private mountPoint = '';
  private _modulePaths: string[] = [];
  set modulePaths(paths: string[]) {
    this._modulePaths = paths;
    this.worker.postMessage({ type: MessageType.SET_SYSPATH, data: paths });
  }

  constructor(private location: Location,
              private action$: Actions) {
    this.onMessageListener$.pipe(
      filter(message => message.type === MessageType.PRELOAD_COMPLETE)
    ).subscribe(() => this.preloadComplete$.next(true));

    this.action$.pipe(
      ofActionSuccessful(ExperienceAction.ChangeCurrent)
    ).subscribe((action: ExperienceAction.ChangeCurrent) => {

      if (action.exp.preloadedPythonLibs) {
        action.exp.preloadedPythonLibs?.forEach(lib => this.loadedLibs.add(lib));
        this.worker.postMessage({ type: MessageType.PRELOAD_LIBS, data: Array.from(this.loadedLibs) });
        this.preloadComplete$.next(false);

        this.mountPoint = action.exp.uuid;
        this.worker.postMessage({ type: MessageType.MOUNT, data: this.mountPoint });
      }
    })

    this.initWorker();
  }

  private initPyodide(): Observable<Pyodide> {
    return defer(() => {
      // unset define as pyodide is a little POS
      const anyWindow = (window as any);
      const define = anyWindow.define;
      anyWindow.define = undefined;

      return loadPyodide({
        indexURL: this.location.prepareExternalUrl('/assets/pyodide'),
      }).then(pyodide => {
        // restore define to original value
        anyWindow.define = define;
        return pyodide;
      });
    }).pipe(
      map(pyodide => {
        if (PyodideService.FILESYSTEM_DEBUG) {
          const interceptMethodCalls = (obj: any, fn: any) => {
            return new Proxy(obj, {
              get(target, prop) { // (A)
                if (typeof target[prop] === 'function') {
                  return new Proxy(target[prop], {
                    apply: (target, thisArg, argumentsList) => { // (B)
                      fn(prop, argumentsList);
                      return Reflect.apply(target, thisArg, argumentsList);
                    }
                  });
                } else {
                  return Reflect.get(target, prop);
                }
              }
            });
          };
          pyodide.FS = interceptMethodCalls(pyodide.FS, (key: any, args: any) => {
            console.debug(`${key}`, ...args);
          });
        }
        return pyodide;
      }),
      shareReplay(1),
    );
  }

  private initWorker() {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('./pyodide.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        this.onMessageListener$.next(data);
      };
      this.worker.postMessage({ type: MessageType.SET_PYODIDE_LOCATION, data: this.location.prepareExternalUrl('/assets/pyodide')});
      this.worker.postMessage({ type: MessageType.SET_INTERRUPT_BUFFER, data: { buffer: this.interruptBuffer }});
      if (this._modulePaths.length > 0) {
        // just execute the setter again
        this.modulePaths = this._modulePaths;
      }
      if (this.pythonCallbacks.length > 0) {
        this.setupPythonCallables(this.pythonCallbacks);
      }
      if (this.mountPoint.length > 0) {
        this.worker.postMessage({ type: MessageType.MOUNT, data: this.mountPoint });
      }
      if (this.loadedLibs.size > 0) {
        this.worker.postMessage({ type: MessageType.PRELOAD_LIBS, data: [...this.loadedLibs] });
        this.preloadComplete$.next(false);
      }
    } else {
      console.error('WebWorkers not supported by this Environment...');
    }
  }

  runCode(code: string): Observable<any> {
    this.worker.postMessage({ type: MessageType.EXECUTE, data: { code }})
    return this.onMessageListener$.pipe(
      filter(message => message.type === MessageType.AFTER_EXECUTION),
      map(message => message.data),
    );
  }

  terminateCode(gracePeriod: number): Observable<'soft' | 'hard'> {
    // This cryptic statement will in theory interrupt a running python script
    // It works as follows: the interruptBuffer is shared between the worker thread and main thread
    // Pyodide uses this shared buffer to listen for posix style interrupts
    // The number for SIGINT is 2 so we set a 2 into this buffer
    const softTerminate$: Observable<'soft'> = this.onMessageListener$.pipe(
      filter(message => message.type === MessageType.TERMINATED),
      mapTo('soft')
    );

    const hardTerminate$: Observable<'hard'> = timer(gracePeriod).pipe(mapTo('hard'));

    this.interruptBuffer[0] = 2;
    this.worker.postMessage({ type: MessageType.TERMINATED });

    return race(
      softTerminate$,
      hardTerminate$
    ).pipe(
      tap(result => {
        if (result === 'hard') {
          // The worker didn't terminate itself in the grace period
          // We need a hard terminate
          // The worker is completely terminated and reinitialized
          this.worker.terminate();
          this.initWorker();
          this.onMessageListener$.next({ type: MessageType.STD_OUT, data: `Worker did not terminate after ${gracePeriod}ms! Reinitializing Context...`})
        }
      }),
    );
  }

  // We use python globals() to store the result from matplotlib
  private getGlobal(key: string): Observable<string[]> {
    this.worker.postMessage({ type: MessageType.GET_GLOBAL, data: { key }})
    return this.onMessageListener$.pipe(
      filter(message => message.type === MessageType.GET_GLOBAL),
      map(message => message.data as string[]),
    );
  }

  private setGlobal(key:string, value: any): Observable<void> {
    this.worker.postMessage({ type: MessageType.SET_GLOBAL, data: { key, value }})
    return this.onMessageListener$.pipe(
      filter(message => message.type === MessageType.SET_GLOBAL),
      map(_ => {})
    );
  }

  private deleteGlobal(key: string): Observable<void> {
    return this.pyodide.pipe(map(pyodide => {
      if (pyodide.globals.has(key)) {
        pyodide.globals.delete(key);
      }
    }));
  }

  getResults(): Observable<any> {
    return this.onMessageListener$.pipe(
      filter(message => message.type === MessageType.RESULT),
      map(message => message.data),
    );
  }

  getStdOut(): Observable<string> {
    return this.onMessageListener$.pipe(
      filter(message => message.type === MessageType.STD_OUT),
      map(message => message.data as string),
    );  }

  getStdErr(): Observable<string> {
    return this.onMessageListener$.pipe(
      filter(message => message.type === MessageType.STD_ERR),
      map(message => message.data as string),
    );
  }

  getAfterExecution(): Observable<void> {
    return this.onMessageListener$.pipe(
      filter(message => message.type === MessageType.AFTER_EXECUTION),
      map(_ => {}),
    );
  }

  setupPythonCallables(callbacks: string[]): Observable<PythonCallableData> {
    this.pythonCallbacks = callbacks;
    this.worker.postMessage({ type: MessageType.SETUP_PYTHON_CALLABLE, data: callbacks });
    return this.onMessageListener$.pipe(
      filter(({ type }) => type === MessageType.PYTHON_CALLABLE),
      map(({ data }) => data as PythonCallableData),
    );
  }

  addToSysPath(paths: string[]): void {
    this.modulePaths = [...this._modulePaths, ...paths];
  }

  preloadComplete(): Observable<boolean> {
    return this.preloadComplete$.asObservable();
  }

  // TODO: Funktioniert noch nicht richtig
  // Muss alle entfernen, die von mir sind (vom system drin lassen!)
  removeFromSysPath(paths: string[]) {
    // this.modulePaths = this._modulePaths.filter(p => !paths.includes(p));
  }
}
