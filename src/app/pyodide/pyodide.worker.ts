/// <reference lib="webworker" />

import {bindCallback, concat, defer, forkJoin, from, merge, Observable, ReplaySubject, Subject} from 'rxjs';
import {map, shareReplay, switchMap, tap} from 'rxjs/operators';
import initCode from '!raw-loader!./../../assets/util/init.py';
import {
  ExecutionRequestData,
  MessageType,
  PyodideWorkerMessage,
  PythonCallableData
} from 'src/app/pyodide/pyodide.types';

importScripts("/assets/pyodide/pyodide.js");

const DEFAULT_LIBS = ['micropip'];
const results$ = new Subject<any>();
// cache 1000 lines of stdout and stderr
const stdOut$ = new ReplaySubject<string>(1000);
const stdErr$ = new ReplaySubject<string>(1000);
const afterExecution$ = new Subject<void>();
const pythonCallable$ = new Subject<PythonCallableData>();
let _modulePaths: string[] = [];
const pyodide = initPyodide();

const messageMapper = (type: MessageType) => map(data => ({ type, data }));

merge(
  results$.pipe(messageMapper(MessageType.RESULT)),
  stdOut$.pipe(messageMapper(MessageType.STD_OUT)),
  stdErr$.pipe(messageMapper(MessageType.STD_ERR)),
  afterExecution$.pipe(messageMapper(MessageType.AFTER_EXECUTION)),
  pythonCallable$.pipe(messageMapper(MessageType.PYTHON_CALLABLE)),
).subscribe(message => {
  console.log('posting message to main thread: ', message);
  postMessage(message);
})


addEventListener('message', ({ data }: { data: PyodideWorkerMessage }) => {
  console.log('got message in worker: ', data);
  switch (data.type) {
    case MessageType.EXECUTE:
      runCode((data.data as ExecutionRequestData).code).subscribe();
      break;
    case MessageType.SET_SYSPATH:
      _modulePaths = data.data as string[];
      break;
    case MessageType.SETUP_PYTHON_CALLABLE:
      (data.data as string[]).forEach(name => {
        // @ts-ignore
        globalThis[name] = (...params: any[]) => {
          pythonCallable$.next({ name, params });
        };
      });
      break;
    default:
      console.warn(`unknown messageType: ${data.type} Ingoring...`);
  }
});


function initPyodide(): Observable<Pyodide> {
  return from(loadPyodide({
      indexURL: '/assets/pyodide',
      stdout: (text) => {
        stdOut$.next(text)
      },
      stderr: (text) => {
        stdErr$.next(text)
      }
    })).pipe(
    switchMap(pyodide => forkJoin(
      DEFAULT_LIBS.map(lib => from(pyodide.loadPackage(lib)))
    ).pipe(map(() => pyodide))),
    map(pyodide => {
      // TODO: this should be dynamic
      const path = '/sortierroboter';
      pyodide.FS.mkdir(path);
      pyodide.FS.mount(pyodide.FS.filesystems.IDBFS, {}, path);
      return pyodide;
    }),
    switchMap(pyodide => from(pyodide.runPythonAsync(initCode)).pipe(map(() => pyodide))),
    shareReplay(1),
  );
}

const pyodideSyncFs = (pyodide: Pyodide) => bindCallback((populate: boolean, callback: (msg: string) => void) => pyodide.FS.syncfs(populate, callback));

function runCode(code: string): Observable<any> {
  return pyodide.pipe(switchMap(pyodide => pyodideSyncFs(pyodide)(true).pipe(map(_ => pyodide))),
    switchMap(pyodide => {
    pyodide.globals.set('editor_input', code);
    return defer(() => concat(
      from(pyodide.runPythonAsync(addToSysPath())),
      from(pyodide.runPythonAsync('await run_code()')))
    ).pipe(tap(res => results$.next(res)), tap(() => afterExecution$.next()));
  }));
}

// We use python globals() to store the result from matplotlib
function getGlobal(key: string): Observable<string[]> {
  return pyodide.pipe(map(pyodide => {
    const strings = pyodide.globals.get(key)?.toJs();
    return strings !== undefined ? strings : [];
  }));
}

function setGlobal(key: string, value: any): Observable<void> {
  return pyodide.pipe(map(pyodide => {
    pyodide.globals.set(key, value);
  }));
}

function deleteGlobal(key: string): Observable<void> {
  return pyodide.pipe(map(pyodide => {
    if (pyodide.globals.has(key)) {
      pyodide.globals.delete(key);
    }
  }));
}

function getResults(): Observable<any> {
  return results$.asObservable();
}

function getStdOut(): Observable<string> {
  return stdOut$.asObservable();
}

function getStdErr(): Observable<string> {
  return stdErr$.asObservable();
}

function getAfterExecution(): Subject<void> {
  return afterExecution$;
}

function addToSysPath(): string {
  let glueCode = '';

  for (const module of _modulePaths) {
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
