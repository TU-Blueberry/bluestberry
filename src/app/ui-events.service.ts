import { EventEmitter, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UiEventsService {
  onActiveElementChange: EventEmitter<string> = new EventEmitter();
  onNewUserInputLocation: EventEmitter<string> = new EventEmitter();
  onCloseAllContextMenues: EventEmitter<void> = new EventEmitter();
  onClickOutsideOfFiltree: EventEmitter<{ev: MouseEvent, isGlossary: boolean}> = new EventEmitter();

  constructor() { }
  clickOutsideOfFiletree(ev: MouseEvent, isGlossary: boolean) {
    this.onClickOutsideOfFiltree.emit({ev: ev, isGlossary: isGlossary});
  }

  // could also use store with new state for the following three
  changeActiveElement(newActiveElement: string): void {
    this.onActiveElementChange.emit(newActiveElement);
  }

  changeUserInputLocation(path: string): void {
    this.onNewUserInputLocation.emit(path);
  }

  closeAllContextMenues(): void {
    this.onCloseAllContextMenues.emit();
  }
}
