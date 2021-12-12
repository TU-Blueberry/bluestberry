import {TabType} from 'src/app/tab/model/tab-type.model';
import {EmbeddedViewRef} from '@angular/core';
import { FileType } from 'src/app/shared/files/filetypes.enum';

export interface Tab {
  type: TabType;
  title: string;
  extension?: string;
  view?: EmbeddedViewRef<any>;
  data?: any;
}
