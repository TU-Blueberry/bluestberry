import { Component, EventEmitter, Input, Output } from '@angular/core';
import { forkJoin, from } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-common-actions',
  templateUrl: './common-actions.component.html',
  styleUrls: ['./common-actions.component.scss']
})
export class CommonActionsComponent {
  READONLY_MESSAGE_FOLDER = "Nicht möglich (Order ist schreibgeschützt)";
  READONLY_MESSAGE_FILE = "Nicht möglich (Datei ist schreibgeschützt)";
  isReadonly = false;

  @Input() isFile?: boolean = false;
  @Input() isRoot?: boolean = false;
  @Input() set mode(mode: number) {
      this.isReadonly = mode === 33088 || mode === 16704;
  }

  @Output() delete: EventEmitter<Event> = new EventEmitter();
  @Output() startRenaming: EventEmitter<Event> = new EventEmitter();
  @Output() createNewFromUI: EventEmitter<{ev: Event, isFile: boolean}> = new EventEmitter();
  @Output() selectedFiles: EventEmitter<{name: string, convertedFile: Uint8Array}[]> = new EventEmitter();
  constructor() { }

  stopPropagation(ev: Event): void {
    ev.stopPropagation();

    if (this.isReadonly) {
      ev.preventDefault();
    }
  }

  emitCreateFromUi(params: {ev: Event, isFile: boolean}): void {
    if (!this.isReadonly) {
      this.createNewFromUI.emit(params);
    }
  }

  emitDelete(ev: Event): void {
    if (!this.isReadonly) {
      this.delete.emit(ev);
    }
  }

  emitStartRenaming(ev: Event): void {
    if (!this.isReadonly) {
      this.startRenaming.emit(ev);
    }
  }

  filesChange(ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();

    if (this.isReadonly) {
      return;
    }

    const fileList = (ev.target as HTMLInputElement)?.files;

    if (fileList) {
      // TODO: Vielleicht kann man die errors irgendwie aggregieren, sodass man nach dem import eine anzeige kriegt, welche Dateien erfolgreich importiert werden
      // konnten und welche nicht (z.B. weil sie schon existieren)
      forkJoin(Array.from(fileList).map(file => this.createUint8ArrayFromFile(file)))
      .subscribe(
        (arrs) => { this.selectedFiles.emit(arrs)}, 
        (err) => console.error(err))     
    } else {
      // TODO: Error
    }
  } 

  createUint8ArrayFromFile(file: File) {
   return from(file.arrayBuffer()).pipe(
      map(buffer => ({ name: file.name, convertedFile: new Uint8Array(buffer)}))
    );
  }
}
