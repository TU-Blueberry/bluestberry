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
  onStartSimulation: EventEmitter<void> = new EventEmitter();
  onCloseAllContextMenues: EventEmitter<void> = new EventEmitter();
  onClickOutsideOfFiltree: EventEmitter<{ev: MouseEvent, isGlossary: boolean}> = new EventEmitter();
  onAboutToggle: EventEmitter<boolean> = new EventEmitter();

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

  startSimulation() {
    this.onStartSimulation.emit();
  }

  closeAllContextMenues(): void {
    this.onCloseAllContextMenues.emit();
  }

  clickOutsideOfFiletree(ev: MouseEvent, isGlossary: boolean) {
    this.onClickOutsideOfFiltree.emit({ev: ev, isGlossary: isGlossary});
  }

  toggleAbout(visible: boolean) {
    this.onAboutToggle.emit(visible);
  }
}
