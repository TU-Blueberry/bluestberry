import {PythonCallable, setupPythonCalls} from 'src/app/python-callable/python-callable.decorator';

class TestClass {
  @PythonCallable
  PythonCallable_test() {

  }
}

describe('@PythonCallable',  () => {
  const methodMock = jest.fn();
  const injectorMock = {
    get: jest.fn(() => {
      const instance = new TestClass();
      instance.PythonCallable_test = methodMock;
      return instance;
    }),
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setupPythonCalls',  () => {
    it('gets correct instance from injector', () => {
      setupPythonCalls(injectorMock);

      expect(injectorMock.get).toHaveBeenCalledWith(TestClass);
    });
  });

  it('binds correct method to global scope', () => {
    setupPythonCalls(injectorMock);
    // @ts-ignore
    globalThis.PythonCallable_test();

    expect(methodMock).toHaveBeenCalled();
  });
});
