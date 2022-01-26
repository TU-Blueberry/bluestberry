import { EventEmitter, Injectable } from '@angular/core';
import { Config } from 'src/app/experience/model/config';
import { SplitAreaSettings } from '../viewer/model/split-settings';
import { ExperienceType } from './model/experience-type';

@Injectable({
  providedIn: 'root'
})
export class ExperienceEventsService {
  onExperienceOpened: EventEmitter<{open: {path: string, on: string}[], uuid: string, name: string, type: ExperienceType, splitSettings: [string, SplitAreaSettings][] }> = new EventEmitter();
  onExperienceClosed: EventEmitter<string> = new EventEmitter();

  constructor() { }

  emitExperienceOpened(config: Config): void {
    const fullPath = `/${config.uuid}`;
    this.onExperienceOpened.emit({open: config.open.map(({path, on}) => ({path: `${fullPath}/${path}`, on})), uuid: config.uuid, name: config.name, type: config.type, splitSettings: config.splitSettings});
  }

  emitExperienceClosed(name: string): void {
    this.onExperienceClosed.emit(name);
  }
}
