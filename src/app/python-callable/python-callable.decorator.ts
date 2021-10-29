import {Injector} from '@angular/core';

const pythonCalls: ((injector: Injector) => void)[] = [];

export function PythonCallable(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    pythonCalls.push((injector: Injector) => {
      const serviceInstance = injector.get(target.constructor);
      if (!serviceInstance) {
        console.error(`Can not find service instance of type ${target?.constructor?.name}! Please make sure the service is injected in 'root' scope.`);
        return;
      }
      // @ts-ignore
      globalThis[propertyKey] = () => serviceInstance[propertyKey]();
    });
}

export const setupPythonCalls = (injector: Injector) => {
  pythonCalls.forEach(setup => setup(injector));
}

