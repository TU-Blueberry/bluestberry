import { EventEmitter, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UiEventsService {
  onActiveElementChange: EventEmitter<string> = new EventEmitter();
  onFiletreeToggle: EventEmitter<boolean> = new EventEmitter();
  onNewUserInputLocation: EventEmitter<string> = new EventEmitter();
  onHintChange: EventEmitter<void> = new EventEmitter();
  onToggleTerminal: EventEmitter<void> = new EventEmitter();
  onStartTour: EventEmitter<void> = new EventEmitter();
  onCloseAllContextMenues: EventEmitter<void> = new EventEmitter();

  constructor() { }

  changeActiveElement(newActiveElement: string): void {
    this.onActiveElementChange.emit(newActiveElement);
  }

  changeFiletree(visible: boolean): void {
    this.onFiletreeToggle.emit(visible);
  }

  changeUserInputLocation(path: string): void {
    this.onNewUserInputLocation.emit(path);
  }

  changeHints(): void {
    this.onHintChange.emit();
  }

  toggleTerminal(): void {
    this.onToggleTerminal.emit();
  }

  startTour(): void {
    this.onStartTour.emit();
  }

  closeAllContextMenues(): void {
    this.onCloseAllContextMenues.emit();
  }
}
