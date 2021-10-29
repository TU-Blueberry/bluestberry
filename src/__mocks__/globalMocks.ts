export const mockPyodide = {
  loadPackage: jest.fn(() => Promise.resolve()),
  runPythonAsync: jest.fn(() => Promise.resolve()),
  globals: new Map<string, any>(),
}

global.loadPyodide = jest.fn(async () => mockPyodide);
