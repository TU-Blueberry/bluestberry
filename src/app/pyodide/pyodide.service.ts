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
  private _modulePaths: string[] = [];
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
      return defer(() => concat(from(pyodide.runPythonAsync(this.addToSysPath())), from(pyodide.runPythonAsync('await run_code()'))))
        .pipe(tap(res => this.results$.next(res)), tap(() => this.afterExecution$.emit()));
    }));
  }

  // We use python globals() to store the result from matplotlib
  getGlobal(key: string): Observable<string[]> {
    return this.pyodide.pipe(map(pyodide => {
      const strings = pyodide.globals.get(key)?.toJs();
      return strings !== undefined ? strings : [];
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

  set modulePaths(paths: string[]) {
    this._modulePaths = paths;
  }

  private addToSysPath(): string {
    let glueCode = '';

    for (const module of this._modulePaths) {
      glueCode += `
import sys

if "${module}" not in sys.path:
    sys.path.append("${module}")
      `
    }

    // Only for the purpose of not screwing ourselves over in the presentation.
    glueCode += `
if "sortierroboter/" not in sys.path:
    sys.path.append("/sortierroboter")
`
    return glueCode;
  }
}
