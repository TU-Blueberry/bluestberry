import { Component, EventEmitter, Input, Output } from '@angular/core';
import { forkJoin, from } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-common-actions',
  templateUrl: './common-actions.component.html',
  styleUrls: ['./common-actions.component.scss']
})
export class CommonActionsComponent {

  @Input() isFile?: boolean = false;
  @Input() isRoot?: boolean = false;
  @Output() delete: EventEmitter<Event> = new EventEmitter();
  @Output() startRenaming: EventEmitter<Event> = new EventEmitter();
  @Output() createNewFromUI: EventEmitter<{ev: Event, isFile: boolean}> = new EventEmitter();
  @Output() selectedFiles: EventEmitter<{name: string, convertedFile: Uint8Array}[]> = new EventEmitter();
  constructor() { }

  stopPropagation(ev: Event): void {
    ev.stopPropagation();
  }

  filesChange(ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();

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
