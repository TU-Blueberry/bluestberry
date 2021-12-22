export interface PyodideWorkerMessage {
  type: MessageType;
  data: MessageData;
}

export enum MessageType {
  EXECUTE = 'EXECUTE',
  RESULT = 'RESULT',
  AFTER_EXECUTION = 'AFTER_EXECUTION',
  STD_OUT = 'STD_OUT',
  STD_ERR = 'STD_ERR',
  STD_IN = 'STD_IN',
  SET_SYSPATH = 'SET_SYSPATH',
  SET_GLOBAL = 'SET_GLOBAL',
  GET_GLOBAL = 'GET_GLOBAL',
  SETUP_PYTHON_CALLABLE = 'SETUP_PYTHON_CALLABLE',
  PYTHON_CALLABLE = 'PYTHON_CALLABLE',
}

export type MessageData = ExecutionRequestData | GlobalRequestData | PythonCallableData | string | string[];

export interface ExecutionRequestData {
  code: string;
  context: any;
}

export interface GlobalRequestData {
  name: string;
  value: any;
}

export interface PythonCallableData {
  name: string;
  params: any[];
}
