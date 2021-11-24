import {TabType} from 'src/app/tab/model/tab-type.model';
import {EmbeddedViewRef} from '@angular/core';

export interface Tab {
  type: TabType;
  title: string;
  icon?: string;
  view?: EmbeddedViewRef<any>;
  data?: any;
}
