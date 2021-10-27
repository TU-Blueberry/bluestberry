global.loadPyodide = jest.fn(async () => await ({
  loadPackage: jest.fn(),
  runPythonAsync: jest.fn(),
}));
