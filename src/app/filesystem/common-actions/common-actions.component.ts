import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-common-actions',
  templateUrl: './common-actions.component.html',
  styleUrls: ['./common-actions.component.scss']
})
export class CommonActionsComponent {

  @Input() parentPath: string = '';
  @Input() isFile: boolean = false;
  @Output() delete: EventEmitter<Event> = new EventEmitter();
  @Output() startRenaming: EventEmitter<Event> = new EventEmitter();
  @Output() createNewFromUI: EventEmitter<{ev: Event, newFile: boolean}> = new EventEmitter();
  @Output() selectedFiles: EventEmitter<Event> = new EventEmitter();
  constructor() { }

  stopPropagation(ev: Event): void {
    ev.stopPropagation();
  }
}
