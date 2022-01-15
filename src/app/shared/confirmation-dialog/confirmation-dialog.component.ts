import { Component, ElementRef, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-confirmation-dialog',
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.scss']
})
export class ConfirmationDialogComponent {
  _okText = 'Ja'

  @Input() set
  okText(text: string) {
    this._okText = text;
  }

  @Output() choice: EventEmitter<boolean> = new EventEmitter();
  @Output() closed: EventEmitter<void> = new EventEmitter();
  constructor() { }

  public emit(selectedChoice: boolean): void {
    this.choice.emit(selectedChoice)
  }
}
