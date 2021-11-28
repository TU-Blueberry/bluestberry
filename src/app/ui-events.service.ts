import { EventEmitter, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UiEventsService {
  onActiveElementChange: EventEmitter<string> = new EventEmitter();
  onFiletreeToggle: EventEmitter<boolean> = new EventEmitter();
  constructor() { }

  changeActiveElement(newActiveElement: string): void {
    this.onActiveElementChange.emit(newActiveElement);
  }

  changeFiletree(visible: boolean): void {
    this.onFiletreeToggle.emit(visible);
  }
}