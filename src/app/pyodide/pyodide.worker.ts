/// <reference lib="webworker" />

import {bindCallback, concat, defer, forkJoin, from, merge, Observable, ReplaySubject, Subject} from 'rxjs';
import {ignoreElements, map, shareReplay, switchMap, tap} from 'rxjs/operators';
import initCode from '!raw-loader!./../../assets/util/init.py';
import {
  ExecutionRequestData,
  InterruptBufferData,
  MessageType,
  PyodideWorkerMessage,
  PythonCallableData
} from 'src/app/pyodide/pyodide.types';


const DEFAULT_LIBS = ['micropip'];
const results$ = new Subject<any>();
// cache 1000 lines of stdout and stderr
const stdOut$ = new ReplaySubject<string>(1000);
const stdErr$ = new ReplaySubject<string>(1000);
const afterExecution$ = new Subject<void>();
const pythonCallable$ = new Subject<PythonCallableData>();
const loadedLib$ = new Subject<string>();
const preloadComplete$ = new Subject<void>();
const terminated$ = new Subject<void>();
let _modulePaths: string[] = [];
let interruptBuffer: Uint8Array;
let pyodide: Observable<Pyodide>;
let mountPoint = '';
let pythonRunningPromise = Promise.resolve();
const messageMapper = (type: MessageType) => map(data => ({ type, data }));

// This just fixes console logging. No idea why it broke...
console = self.console;

merge(
  results$.pipe(messageMapper(MessageType.RESULT)),
  stdOut$.pipe(messageMapper(MessageType.STD_OUT)),
  stdErr$.pipe(messageMapper(MessageType.STD_ERR)),
  afterExecution$.pipe(messageMapper(MessageType.AFTER_EXECUTION)),
  pythonCallable$.pipe(messageMapper(MessageType.PYTHON_CALLABLE)),
  loadedLib$.pipe(messageMapper(MessageType.LOADED_LIB)),
  preloadComplete$.pipe(messageMapper(MessageType.PRELOAD_COMPLETE)),
  terminated$.pipe(messageMapper(MessageType.TERMINATED)),
).subscribe(message => {
  console.log('posting message to main thread: ', message);
  postMessage(message);
})


addEventListener('message', ({ data }: { data: PyodideWorkerMessage }) => {
  console.log('got message in worker: ', data);
  switch (data.type) {
    case MessageType.SET_PYODIDE_LOCATION:
      if (pyodide) {
        console.warn('Pyodide already initialized!');
        return;
      }
      importScripts(`${data.data}/pyodide.js`);
      pyodide = initPyodide(data.data as string);
      break;
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
    case MessageType.PRELOAD_LIBS:
      preloadLibs(data.data as string[]);
      break;
    case MessageType.MOUNT:
      pyodide.pipe(
        switchMap(pyodide => {console.log(pythonRunningPromise); return pythonRunningPromise.then(() => pyodide)})
      ).subscribe(pyodide => {
        // we only ever have one path mounted.
        if (mountPoint) {
         deleteFolder(pyodide, mountPoint, true);
         pyodide.FS.unmount(mountPoint);
        }
        const path = `/${data.data}`;
        if (!pyodide.FS.analyzePath(path, false).exists) {
          pyodide.FS.mkdir(path);
        }
        pyodide.FS.mount(pyodide.FS.filesystems.IDBFS, {}, path);
        mountPoint = path;
      });
      break;
    case MessageType.SET_INTERRUPT_BUFFER:
      pyodide.subscribe(pyodide => {
        const sharedBuffer = (data.data as InterruptBufferData).buffer;
        interruptBuffer = new Uint8Array(sharedBuffer);
        pyodide.setInterruptBuffer(sharedBuffer);
      });
      break;
    case MessageType.TERMINATED:
      // just a simple ping pong, because we can't detect the interrupt otherwise
      terminated$.next();
      break;
    default:
      console.warn(`unknown messageType: ${data.type} Ingoring...`);
  }
});

// delete folders recursively (need to unlink files first before folder can be deleted)
function deleteFolder(py: Pyodide, path: string, isRoot: boolean) {
  const node = py.FS.analyzePath(path, false);
  if (node.exists) {
    if (py.FS.isFile(node.object.mode)) {
      py.FS.unlink(path);
    } else {
      const entries = Object.entries(node.object.contents);
      if (entries.length === 0) {
        return;
      } else {
        entries.forEach(([entry, ]) => deleteFolder(py, `${path}/${entry}`, false))
        if (!isRoot) {
          py.FS.rmdir(path);
        }
      }
    }
  }
}

function initPyodide(pyodideLocation: string): Observable<Pyodide> {
  return from(loadPyodide({
      indexURL: pyodideLocation,
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
    switchMap(pyodide => from(runPythonInternal(pyodide, initCode)).pipe(map(() => pyodide))),
    shareReplay(1),
  );
}

const pyodideSyncFs = (pyodide: Pyodide) => bindCallback((populate: boolean, callback: (msg: string) => void) => pyodide.FS.syncfs(populate, callback));

function runCode(code: string): Observable<any> {
  return pyodide.pipe(switchMap(pyodide => pyodideSyncFs(pyodide)(true).pipe(map(_ => pyodide))),
    switchMap(pyodide => {
    pyodide.globals.set('editor_input', code);
    return defer(() => concat(
      from(runPythonInternal(pyodide, addToSysPath())).pipe(ignoreElements()),
      from(runPythonInternal(pyodide, 'await run_code()')).pipe(
        switchMap(res => pyodideSyncFs(pyodide)(false)
          .pipe(tap(_ => results$.next(res)), tap(() => afterExecution$.next())))
      ))
    )
  }));
}

function preloadLibs(libs: string[]) {
  const libString = `["${libs.join('","')}"]`;
  pyodide.pipe(
    switchMap(pyodide => runPythonInternal(pyodide, `await load_libs(${libString})`))
  ).subscribe(() => {
    preloadComplete$.next();
  }, () => {
    preloadComplete$.next();
  });
}

function runPythonInternal(pyodide: Pyodide, code: string): Promise<any> {
  pythonRunningPromise = pythonRunningPromise.then(res => {
    if (interruptBuffer && interruptBuffer[0] === 2) {
      console.log('interrupt requested!');
      terminated$.next();
      return;
    }
    return pyodide.runPythonAsync(code)
  });
  return pythonRunningPromise;
}

function notifyLoadedPackage(lib: string) {
  loadedLib$.next(lib);
}

// os.chdir("${mountPoint}")
function addToSysPath(): string {
  let glueCode = '';
  glueCode += `
import os
import sys`
  if (mountPoint != "") {
    glueCode += `
if "${mountPoint}" not in sys.path:
    sys.path.append("${mountPoint}")
if os.getcwd() != "${mountPoint}":
    os.chdir("${mountPoint}")
    `
  }
  console.error('this is the mount point: ', mountPoint)
  for (const module of _modulePaths) {
    const path = module.startsWith('/') ? module : `/${module}`
    glueCode += `
if "${path}" not in sys.path:
    sys.path.append("${path}")
      `
  }
  return glueCode;
}
