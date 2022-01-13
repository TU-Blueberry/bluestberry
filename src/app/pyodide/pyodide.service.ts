import {EventEmitter, Injectable} from '@angular/core';
import {Location} from '@angular/common';
import initCode from '!raw-loader!../../assets/util/init.py';
import {BehaviorSubject, concat, defer, forkJoin, from, Observable, ReplaySubject} from 'rxjs';
import {map, shareReplay, switchMap, tap} from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class PyodideService {
  // standard packages included with pyodide
  static readonly DEFAULT_LIBS = ['micropip'];
  private results$ = new BehaviorSubject([]);
  // cache 1000 lines of stdout and stderr
  private stdOut$ = new ReplaySubject<string>(1000);
  private stdErr$ = new ReplaySubject<string>(1000);
  private afterExecution$ = new EventEmitter<void>();
  pyodide = this.initPyodide();

  // Overwrite stderr and stdout. Sources:
  // https://pyodide.org/en/stable/usage/faq.html#how-can-i-control-the-behavior-of-stdin-stdout-stderr
  // https://github.com/pyodide/pyodide/issues/8

  constructor(private location: Location) {
  }

  private initPyodide(): Observable<Pyodide> {
    return defer(() => {
      // unset define as pyodide is a little POS
      const anyWindow = (window as any);
      const define = anyWindow.define;
      anyWindow.define = undefined;

      return loadPyodide({
        indexURL: this.location.prepareExternalUrl('/assets/pyodide'),
        stdout: (text) => {
          this.stdOut$.next(text)
        },
        stderr: (text) => {
          this.stdErr$.next(text)
        }
      }).then(pyodide => {
        // restore define to original value
        anyWindow.define = define;
        return pyodide;
      });
    }).pipe(
     switchMap(pyodide => forkJoin(
        PyodideService.DEFAULT_LIBS.map(lib => from(pyodide.loadPackage(lib)))
      ).pipe(map(() => pyodide))),
      switchMap(pyodide => from(pyodide.runPythonAsync(initCode)).pipe(map(() => pyodide))),
      shareReplay(1),
    );
  }

  // TODO: There is another function named loadPackagesFromImport which loads all packages found in a given code snippet
  // This might be helpful for us?
  // see https://pyodide.org/en/stable/usage/api/js-api.html
  runCode(code: string): Observable<any> {
    return this.pyodide.pipe(switchMap(pyodide => {
      pyodide.globals.set('editor_input', code);
      return defer(() => from(pyodide.runPythonAsync('await run_code()')))
        .pipe(tap(res => this.results$.next(res)), tap(() => this.afterExecution$.emit()));
    }));
  }

  // We use python globals() to store the result from matplotlib
  getGlobal(key: string): Observable<string[]> {
    return this.pyodide.pipe(map(pyodide => {
      if(pyodide.globals.has(key)) {
        return pyodide.globals.get(key);
      } else {
        return []
      }
    }));
  }

  setGlobal(key:string, value: any): Observable<void> {
    return this.pyodide.pipe(map(pyodide => {
      pyodide.globals.set(key, value);
    }));
  }

  deleteGlobal(key: string): Observable<void> {
    return this.pyodide.pipe(map(pyodide => {
      if (pyodide.globals.has(key)) {
        pyodide.globals.delete(key);
      }
    }));
  }


  tempTests(): void {
    console.log("temp tests")
    this.pyodide.subscribe(py => {

      console.log(py);
      console.log("has bla " + py.globals.has("bla"));
      console.log("has huhu " + py.globals.has("huhu"));
      console.log("has html " + py.globals.has("htmlOutput"));
      console.log("has ownKeys " + py.globals.has("ownKeys"));
      console.log(py.globals.get("editor_input"));
      console.log(py.globals.get("plotly_output"));
      console.log(py.globals.get("my_output"));

      console.log(py.globals.keys());

    });
  }


  getResults(): Observable<any> {
    return this.results$.asObservable();
  }

  getStdOut(): Observable<string> {
    return this.stdOut$.asObservable();
  }

  getStdErr(): Observable<string> {
    return this.stdErr$.asObservable();
  }

  getAfterExecution(): EventEmitter<void> {
    return this.afterExecution$;
  }

  private runCodeSilently(code: string): Observable<void> {
    return this.pyodide.pipe(switchMap(pyodide => {
      return defer(() => from(pyodide.runPythonAsync(code)));
    }));
  }

  public addToSysPath(path: string): Observable<void> {
    console.log("ADD TO SYS PATH!")
    const fullPath = path.startsWith("/") ? path : `/${path}`;

    const code = `
import sys

if "${fullPath}" not in sys.path:
    sys.path.append("${fullPath}")`

    return this.runCodeSilently(code);
  }

  public removeFromSysPath(path: string): Observable<void> {
    const fullPath = path.startsWith("/") ? path : `/${path}`;
    const code = `
import sys

if "${fullPath}" in sys.path:
    sys.path.remove("${fullPath}")`

    return this.runCodeSilently(code);
  }
}
