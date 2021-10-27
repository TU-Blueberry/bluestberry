import { Injectable } from '@angular/core'
import initCode from '!raw-loader!../../assets/util/init.py'
import {PythonCallable} from 'src/app/python-callable/python-callable.decorator';

@Injectable({
  providedIn: 'root',
})
export class PyodideService {
  constructor() { }

  initialising: boolean = false
  initialised: boolean = false
  test: string = '';
  pyodide: any;
  // Overwrite stderr and stdout. Sources:
  // https://pyodide.org/en/stable/usage/faq.html#how-can-i-control-the-behavior-of-stdin-stdout-stderr
  // https://github.com/pyodide/pyodide/issues/8

  // TODO: Run init once the app loads?
  // Discuss! Might delay first render, but we could conceal this using a nice loading animation
  // Otherwise we'd have loading animation when decker/code/challenge/sandbox is opened every time / for the first time

  @PythonCallable
  test2() {
    console.log("test");
  }

  //load pyodide
  init(): Promise<void> {

    return new Promise((resolve, reject) => {
      if (this.initialising || this.initialised) {
        resolve();
        return; //Pyodide already initialised
      }

      this.initialising = true;

      loadPyodide({indexURL: '/assets/pyodide'}).then(pyodide => {
        // Pyodide is now ready to use...
        this.pyodide = pyodide;
        this.initialised = true
        this.initialising = false
        return this.loadDefaultLibs();
      }).then(() => {
        resolve();
        return this.runCustomInit();
      }).then(() => {
        resolve();
      }).catch((err: any) => {
        // error loading pyodide
        console.log(err);
        reject();
      });
    });
  }

  // Pyodide does this weird thing where promises always resolve (no matter if the operation succeeded or failed)
  // Instead, they use two different callbacks (success/error) on the resolve function
  loadDefaultLibs(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      let defaultLibs = ['matplotlib', 'numpy', 'plotly', 'pandas'];
      let status = [false, false, false, false];

      const successFn = (index: number) => {
        status[index] = true;

        if (status.every(val => val)) {
          resolve();
        }
      }

      for (const [index, lib] of defaultLibs.entries()) {
        this.pyodide.loadPackage(lib).then(() => successFn(index), () => reject());
      }
    });
  }

  runCustomInit(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.pyodide.runPythonAsync(initCode).then(() => resolve(), () =>  reject());
    });
  }

  // TODO: There is another function namend loadPackagesFromImport which loads all packages found in a given code snippet
  // This might be helpful for us?
  // see https://pyodide.org/en/stable/usage/api/js-api.html
  async runCode(code: string): Promise<any> {
    this.pyodide.globals.set('code_to_run', code);

    return new Promise((resolve, reject) => {
      const codePromise = this.pyodide.runPythonAsync('run_code(code_to_run)');

      codePromise.then((res: any) => {
        resolve(res);
      }, (err: any) => {
        reject(err);
      });
    });
  }


  async runCode2(code: string): Promise<any> {
    (window as any).testVar = code;

    const codeStr = `
from js import testVar

with open('/example.py', 'wt') as fh:
  fh.write(testVar)

log = open('/example.py', 'rt')
for line in log:
  print("----")
  print(line)
      `


    this.pyodide.globals.set('code_to_run', codeStr);

    return new Promise((resolve, reject) => {
      const codePromise = this.pyodide.runPythonAsync('run_code(code_to_run)');

      codePromise.then((res: any) => {
        resolve(res);
      }, (err: any) => {
        reject(err);
      });
    });
  }

  // https://pyodide.org/en/stable/usage/faq.html#why-can-t-i-load-files-from-the-local-file-system
  // "Cant load files from local filesystem"
  // Vielleicht kann man das durch virtual filesystem umgehen?


  // We use python globals() to store the result from matplotlib
  getGlobal(key: string): string[] {
    const strings = this.pyodide.globals.get(key)?.toJs();
    return strings !== undefined ? strings : []
  }

  deleteGlobal(key: string): void {
    // check if key exists before deleting
    if (this.pyodide.globals.has(key)) {
      this.pyodide.globals.delete(key);
    }
  }
}
