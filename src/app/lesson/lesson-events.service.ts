import { EventEmitter, Injectable } from '@angular/core';
import { ConfigObject } from '../filesystem/model/config';
import { ExperienceType } from './model/experience-type';

@Injectable({
  providedIn: 'root'
})
export class LessonEventsService {
  onExperienceOpened: EventEmitter<{open: {path: string, on: string}[], name: string, type: ExperienceType, tabSizes: number[]}> = new EventEmitter();
  onExperienceClosed: EventEmitter<string> = new EventEmitter();

  constructor() { }

  emitExperienceOpened(config: ConfigObject): void {
    const fullPath = config.type === 'LESSON' ? `/${config.name}` : `/sandboxes/${config.name}`;
    this.onExperienceOpened.emit({open: config.open.map(({path, on}) => ({path: `${fullPath}/${path}`, on})), name: config.name, type: config.type, tabSizes: config.tabSizes});
  }

  emitExperienceClosed(name: string): void {
    this.onExperienceClosed.emit(name);
  }
}
