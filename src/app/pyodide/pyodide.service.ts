import { EventEmitter, Injectable } from '@angular/core';
import { Location } from '@angular/common';
import initCode from '!raw-loader!../../assets/util/init.py';
import {BehaviorSubject, defer, forkJoin, from, Observable, ReplaySubject} from 'rxjs';
import {map, shareReplay, switchMap, tap} from 'rxjs/operators';
import {PythonCallable} from 'src/app/python-callable/python-callable.decorator';
import { EventService } from '../filesystem/events/event.service';

@Injectable({
  providedIn: 'root',
})
export class PyodideService {
  // standard packages included with pyodide
  static readonly DEFAULT_LIBS = ['micropip', 'matplotlib', 'numpy', 'pandas'];
  // packages that should be included by installing with micropip
  // this should probably be handled dynamically e.g. by parsing a requirements.txt file in the project
  static readonly MICROPIP_LIBS = ['plotly'];
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
    return defer(() =>  {
      // unset define as pyodide is a little POS
      const anyWindow = (window as any);
      const define = anyWindow.define;
      anyWindow.define = undefined;

      return loadPyodide({
        indexURL: this.location.prepareExternalUrl('/assets/pyodide'),
        stdout: (text) => {this.stdOut$.next(text)},
        stderr: (text) => {this.stdErr$.next(text)}
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

  @PythonCallable
  packages(): string[] {
    return PyodideService.MICROPIP_LIBS;
  }

  // TODO: There is another function named loadPackagesFromImport which loads all packages found in a given code snippet
  // This might be helpful for us?
  // see https://pyodide.org/en/stable/usage/api/js-api.html
  runCode(code: string): Observable<any> {
    return this.pyodide.pipe(switchMap(pyodide => {
      return defer(() => from(pyodide.runPythonAsync(code)))
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
}
