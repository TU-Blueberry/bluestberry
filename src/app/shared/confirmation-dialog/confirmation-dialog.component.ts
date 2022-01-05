import { Component, ElementRef, EventEmitter, OnInit, Output } from '@angular/core';
import { fromEvent } from 'rxjs';
import { filter, tap } from 'rxjs/operators';

@Component({
  selector: 'app-confirmation-dialog',
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.scss']
})
export class ConfirmationDialogComponent implements OnInit {

  @Output() choice: EventEmitter<boolean> = new EventEmitter();
  @Output() close: EventEmitter<void> = new EventEmitter();
  constructor(private ref: ElementRef) { }

  ngOnInit(): void {
    fromEvent(document, 'click').pipe(
      filter(event => !this.ref.nativeElement.contains(event.target)),
      tap(() => this.close.emit())
    ).subscribe()

    fromEvent(document, 'keydown').pipe(
      filter(ev => (ev as KeyboardEvent).key === 'Escape'),
      tap(() => this.close.emit())
    ).subscribe()
  }

  public emit(selectedChoice: boolean): void {
    this.choice.emit(selectedChoice)
  }

}
