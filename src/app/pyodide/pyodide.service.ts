import {Injectable} from '@angular/core';
import {Location} from '@angular/common';
import {defer, Observable, Subject} from 'rxjs';
import {filter, map, shareReplay} from 'rxjs/operators';
import {MessageType, PyodideWorkerMessage, PythonCallableData} from 'src/app/pyodide/pyodide.types';

@Injectable({
  providedIn: 'root',
})
export class PyodideService {
  // This pyodide is only used for FS access
  pyodide = this.initPyodide();
  private worker!: Worker;

  onMessageListener$ = new Subject<PyodideWorkerMessage>();

  constructor(private location: Location) {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('./pyodide.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        this.onMessageListener$.next(data);
      };
    } else {
      console.error('WebWorkers not supported by this Environment...');
    }
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
      shareReplay(1),
    );
  }

  runCode(code: string): Observable<any> {
    this.worker.postMessage({ type: MessageType.EXECUTE, data: { code }})
    return this.onMessageListener$.pipe(
      filter(message => message.type === MessageType.AFTER_EXECUTION),
      map(message => message.data),
    );
  }

  // We use python globals() to store the result from matplotlib
  getGlobal(key: string): Observable<string[]> {
    this.worker.postMessage({ type: MessageType.GET_GLOBAL, data: { key }})
    return this.onMessageListener$.pipe(
      filter(message => message.type === MessageType.GET_GLOBAL),
      map(message => message.data as string[]),
    );
  }

  setGlobal(key:string, value: any): Observable<void> {
    this.worker.postMessage({ type: MessageType.SET_GLOBAL, data: { key, value }})
    return this.onMessageListener$.pipe(
      filter(message => message.type === MessageType.SET_GLOBAL),
      map(_ => {})
    );
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

  private runCodeSilently(code: string): Observable<void> {
    return this.pyodide.pipe(switchMap(pyodide => {
      return defer(() => from(pyodide.runPythonAsync(code)));
    }));
  }

  set modulePaths(paths: string[]) {
    this.worker.postMessage({ type: MessageType.SET_SYSPATH, data: paths })
  }

  setupPythonCallables(callbacks: string[]): Observable<PythonCallableData> {
    this.worker.postMessage({ type: MessageType.SETUP_PYTHON_CALLABLE, data: callbacks });
    return this.onMessageListener$.pipe(
      filter(({ type }) => type === MessageType.PYTHON_CALLABLE),
      map(({ data }) => data as PythonCallableData),
    );
  }
}
