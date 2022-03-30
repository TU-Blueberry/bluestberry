import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, NgZone, OnInit, Output, Renderer2 } from '@angular/core';
import { forkJoin, from, fromEvent } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';

@Component({
  selector: 'app-common-actions',
  templateUrl: './common-actions.component.html',
  styleUrls: ['./common-actions.component.scss']
})

// dual purpose: 
// Context-menu for right clicks on files/folders
// if current experience contains no user-visible files (e.g. after creating a new sandbox), some options like create new file etc. are display using this component
export class CommonActionsComponent implements OnInit {
  DELETE_MSG: string = '';
  RENAME_MSG: string = '';
  CREATE_FOLDER_MSG: string = 'Neuen Ordner erstellen';
  CREATE_FILE_MSG: string = 'Neue Datei erstellen';
  UPLOAD_MSG: string = "Dateien hochladen"
  READONLY_MSG = '';

  isReadonly = false;

  @Input() isInlineMenu: boolean = false;
  @Input() isVisible: boolean = false;
  @Input() isFile?: boolean = false;
  @Input() isRoot?: boolean = false;
  @Input() hasReadonlyChild?: boolean = false;
  @Input() isGlossary?: boolean = false;
  @Input() set mode(mode: number) {
      this.isReadonly = mode === 33133 || mode === 16749;
      this.setMessages();
  }

  @Output() delete: EventEmitter<Event> = new EventEmitter();
  @Output() startRenaming: EventEmitter<Event> = new EventEmitter();
  @Output() createNewFromUI: EventEmitter<{ev: Event, isFile: boolean}> = new EventEmitter();
  @Output() selectedFiles: EventEmitter<{name: string, convertedFile: Uint8Array}[]> = new EventEmitter();
  @Output() close: EventEmitter<void> = new EventEmitter();
  constructor(private ref: ElementRef, private cd: ChangeDetectorRef, private zone: NgZone, private r2: Renderer2) { }

  private setMessages() {
    this.DELETE_MSG = `${this.isFile ? 'Datei' : 'Ordner'} löschen`;
    this.RENAME_MSG = `${this.isFile ? 'Datei' : 'Ordner'} umbenennen`;
    this.READONLY_MSG = `${this.isFile ? 'Datei' : 'Ordner'} ist schreibgeschützt`;
  }

  ngOnInit(): void {
    this.setMessages();

    // see https://stackoverflow.com/questions/39729846/angular-2-click-event-callback-without-triggering-change-detection
    // listening to document.click inside the zone would trigger change detection on every component, even if detached
    // running it outside of angulars zone should circumvent change detection (it still looks like it's doing some sort of
    // change detection, but it's way faster at least)
    this.zone.runOutsideAngular(() => {
      fromEvent(document, 'click').pipe(
        filter(ev => !this.ref.nativeElement.contains(ev.target) && this.isVisible),
        tap((ev) => this.emit(ev))
      ).subscribe()

      fromEvent(document, 'keydown').pipe(
        filter(ev => (ev as KeyboardEvent).key === 'Escape'),
        tap(ev => this.emit(ev))
      ).subscribe();
    });
  }

  emit(ev: Event): void {
    this.stopPropagation(ev);
    this.close.emit();
  }

  stopPropagation(ev: Event): void {
    ev.stopPropagation();

    if (this.isReadonly) {
      ev.preventDefault();
    }
  }

  emitCreateFromUi(params: {ev: Event, isFile: boolean}): void {
    this.stopPropagation(params.ev);

    if (!this.isReadonly) {
      this.createNewFromUI.emit(params);
      this.close.emit();
    }
  }

  emitDelete(ev: Event): void {
    this.stopPropagation(ev);

    if (!this.isReadonly) {
      this.delete.emit(ev);
      this.close.emit();
    }
  }

  emitStartRenaming(ev: Event): void {
    this.stopPropagation(ev);

    if (!this.isReadonly) {
      this.startRenaming.emit(ev);
      this.close.emit();
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
      // could use some proper error handling (maybe it's possible to aggregate errors and show a list of failed failes afterwards)
      forkJoin(Array.from(fileList).map(file => this.createUint8ArrayFromFile(file)))
      .subscribe(
        (arrs) => this.selectedFiles.emit(arrs),
        (err) => console.error(err))
    } else {
      // should display errors to user
    }

    this.close.emit();
  }

  createUint8ArrayFromFile(file: File) {
   return from(file.arrayBuffer()).pipe(
      map(buffer => ({ name: file.name, convertedFile: new Uint8Array(buffer)}))
    );
  }
}
