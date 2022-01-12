import { Component, ElementRef, EventEmitter, NgZone, OnInit, Output, ViewChild } from '@angular/core';
import { fromEvent } from 'rxjs';
import { filter, tap } from 'rxjs/operators';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss']
})
export class ModalComponent implements OnInit {
  
  @Output() close = new EventEmitter<void>();
  @ViewChild('modal') modal?: ElementRef;
  constructor(private zone: NgZone) { }

  ngOnInit(): void {
    this.zone.runOutsideAngular(() => {
      fromEvent(document, 'click').pipe(
        filter(event => !this.contains(event)),
        tap(event => this.closeModal(event))
      ).subscribe()
  
      fromEvent(document, 'keydown').pipe(
        filter(event => (event as KeyboardEvent).key === 'Escape'),
        tap(event => this.closeModal(event))
      ).subscribe()
    })
  }

  private closeModal(ev: Event): void {
    ev.stopPropagation();
    ev.preventDefault();
    this.close.emit();
  }

  private contains(ev: Event): boolean {
    if (this.modal) {
      return this.modal.nativeElement.contains(ev.target);
    }

    return false;
  }
}
