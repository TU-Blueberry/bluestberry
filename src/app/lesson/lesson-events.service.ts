import { EventEmitter, Injectable } from '@angular/core';
import { ConfigObject } from '../filesystem/model/config';

@Injectable({
  providedIn: 'root'
})
export class LessonEventsService {
  onLessonOpened: EventEmitter<{open: {path: string, on: string}[], name: string}> = new EventEmitter();
  onLessonClosed: EventEmitter<string> = new EventEmitter();

  constructor() { }

  emitLessonOpened(config: ConfigObject, name: string): void {
    console.log("emit lesson opened ", config)
    this.onLessonOpened.emit({open: config.open.map(({path, on}) => ({path: `${config.name}/${path}`, on})), name: name});
  }

  emitLessonClosed(name: string): void {
    this.onLessonClosed.emit(name);
  }
}
