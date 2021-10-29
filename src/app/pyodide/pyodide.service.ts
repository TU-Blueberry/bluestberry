import { Injectable } from '@angular/core'
import initCode from '!raw-loader!../../assets/util/init.py'
import {defer, forkJoin, from, Observable, of} from 'rxjs';
import {map, shareReplay, switchMap} from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class PyodideService {
  static readonly DEFAULT_LIBS = ['matplotlib', 'numpy', 'plotly', 'pandas'];
  pyodide = this.initPyodide();

  // Overwrite stderr and stdout. Sources:
  // https://pyodide.org/en/stable/usage/faq.html#how-can-i-control-the-behavior-of-stdin-stdout-stderr
  // https://github.com/pyodide/pyodide/issues/8

  private initPyodide(): Observable<Pyodide> {
    return defer(() => loadPyodide({indexURL: '/pyodide'})).pipe(
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
      return pyodide.runPythonAsync('run_code(code_to_run)');
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
}
