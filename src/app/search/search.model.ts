import {FileType} from "../shared/filetypes.enum";

export interface SearchEntry {
  file: FSNode;
  path: string;
  type: FileType
}
