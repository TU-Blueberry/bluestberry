import { EventEmitter, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UiEventsService {
  onActiveElementChange: EventEmitter<string> = new EventEmitter();
  onFiletreeToggle: EventEmitter<boolean> = new EventEmitter();
  onNewUserInputLocation: EventEmitter<string> = new EventEmitter();
  constructor() { }

  changeActiveElement(newActiveElement: string): void {
    this.onActiveElementChange.emit(newActiveElement);
  }

  changeFiletree(visible: boolean): void {
    this.onFiletreeToggle.emit(visible);
  }

  changeUserInputLocation(path: string): void {
    console.log("New userinput location: " + path)
    this.onNewUserInputLocation.emit(path);
  }
}
