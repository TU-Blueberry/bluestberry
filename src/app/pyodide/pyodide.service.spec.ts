import {PyodideService} from 'src/app/pyodide/pyodide.service';
import {fakeAsync} from '@angular/core/testing';

describe('Pyodide Service', () => {
  let pyodideService: PyodideService;
  beforeEach(() => {
    pyodideService = new PyodideService();
  });

  it('instantiates', () => {
    expect(pyodideService).toBeDefined();
  });

  it('loads Pyodide', fakeAsync(() => {
    expect(pyodideService.init()).resolves.toBeDefined();
  }));
});
