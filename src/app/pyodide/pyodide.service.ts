import { Injectable } from '@angular/core'
import initCode from '!raw-loader!../../assets/util/init.py'
import {BehaviorSubject, defer, forkJoin, from, Observable} from 'rxjs';
import {map, shareReplay, switchMap, tap} from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class PyodideService {
  static readonly DEFAULT_LIBS = ['matplotlib', 'numpy', 'plotly', 'pandas'];
  private results$: BehaviorSubject<any> = new BehaviorSubject([]);
  private stdOut$: BehaviorSubject<string> = new BehaviorSubject('');
  private stdErr$: BehaviorSubject<string> = new BehaviorSubject('');
  pyodide = this.initPyodide();

  // Overwrite stderr and stdout. Sources:
  // https://pyodide.org/en/stable/usage/faq.html#how-can-i-control-the-behavior-of-stdin-stdout-stderr
  // https://github.com/pyodide/pyodide/issues/8

  private initPyodide(): Observable<Pyodide> {
    return defer(() =>  {
      // unset define as pyodide is a little POS
      const anyWindow = (window as any);
      const define = anyWindow.define;
      anyWindow.define = undefined;

      return loadPyodide({
        indexURL: 'assets/pyodide',
        stdout: (text) => {this.stdOut$.next(this.stdOut$.value + text)},
        stderr: (text) => {this.stdErr$.next(this.stdErr$.value + text)}
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
      pyodide.globals.set('code_to_run', code);
      return defer(() => from(pyodide.runPythonAsync('run_code(code_to_run)')))
        .pipe(tap(res => this.results$.next(res)));
    }));
  }

  // https://pyodide.org/en/stable/usage/faq.html#why-can-t-i-load-files-from-the-local-file-system
  // "Cant load files from local filesystem"
  // Vielleicht kann man das durch virtual filesystem umgehen?


  // We use python globals() to store the result from matplotlib
  getGlobal(key: string): Observable<string[]> {
    return this.pyodide.pipe(map(pyodide => {
      const strings = pyodide.globals.get(key)?.toJs();
      return strings !== undefined ? strings : [];
    }));
  }

  deleteGlobal(key: string): Observable<void> {
    return this.pyodide.pipe(map(pyodide => {
      if (pyodide.globals.has(key)) {
        pyodide.globals.delete(key);
      }
    }));
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
}
