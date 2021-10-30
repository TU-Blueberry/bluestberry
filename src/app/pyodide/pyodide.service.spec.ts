import {PyodideService} from 'src/app/pyodide/pyodide.service';
import {fakeAsync, tick} from '@angular/core/testing';
import initCode from '!raw-loader!../../assets/util/init.py'
import {mockPyodide} from 'src/__mocks__/globalMocks';

describe('Pyodide Service', () => {
  let pyodideService: PyodideService;
  beforeEach(() => {
    jest.clearAllMocks();
    pyodideService = new PyodideService();
  });

  it('instantiates', () => {
    expect(pyodideService).toBeDefined();
  });

  it('does not call loadPyodide on startup', () => {
    expect(loadPyodide).toHaveBeenCalledTimes(0);
  });

  it('lazyly initializes Pyodide', fakeAsync(() => {
    pyodideService.runCode('1+1').subscribe();
    tick();
    expect(loadPyodide).toHaveBeenCalledWith({ indexURL: '/assets/pyodide' });
  }));

  it('calls loadPyodide only Once', fakeAsync(() => {
    pyodideService.runCode('1+1').subscribe();
    tick();
    pyodideService.runCode('1+1').subscribe();
    tick();
    expect(loadPyodide).toBeCalledTimes(1);
  }));

  it('runs initialization code', fakeAsync(() => {
    pyodideService.runCode('1+1').subscribe();
    tick();
    expect(mockPyodide.runPythonAsync).toHaveBeenCalledWith(initCode);
  }));

  describe('runCode', () => {
    it('runsCodeAsync', fakeAsync(() => {
      pyodideService.runCode('1+1').subscribe();
      tick();
      expect(mockPyodide.runPythonAsync).toHaveBeenCalled();
    }));
  });
});
