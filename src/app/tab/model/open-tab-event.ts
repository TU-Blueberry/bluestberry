import {TabType} from 'src/app/tab/model/tab-type.model';

export interface OpenTabEvent {
  groupId: string;
  type: TabType;
  title: string;
  icon?: string;
  data?: any;
}
