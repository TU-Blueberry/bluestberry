import {TabType} from 'src/app/tab/model/tab-type.model';

export interface OpenTabEvent {
  groupId: string;
  type: TabType;
  path: string;
  title: string;
  active: boolean;
  data?: any;
}
