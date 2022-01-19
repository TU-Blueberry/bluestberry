import {Injector} from '@angular/core';
import {PyodideService} from 'src/app/pyodide/pyodide.service';

const pythonCalls: ((injector: Injector) => void)[] = [];

const pyodideWorkerReverseProxy: { [key: string]: (...args: any) => void } = {};

export function PythonCallable(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    pythonCalls.push((injector: Injector) => {
      const serviceInstance = injector.get(target.constructor);
      if (!serviceInstance) {
        console.error(`Can not find service instance of type ${target?.constructor?.name}! Please make sure the service is injected in 'root' scope.`);
        return;
      }
      // @ts-ignore
      pyodideWorkerReverseProxy[propertyKey] = (...args) => serviceInstance[propertyKey](...args);
    });
}

export const setupPythonCalls = (injector: Injector, pyodideService: PyodideService) => {
  pythonCalls.forEach(setup => setup(injector));
  pyodideService.setupPythonCallables(Object.keys(pyodideWorkerReverseProxy)).subscribe(({ name, params}) => {
    pyodideWorkerReverseProxy[name](...params);
  });
}

