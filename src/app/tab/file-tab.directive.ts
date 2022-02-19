import { Directive, EventEmitter, Input, OnInit, Output } from '@angular/core'
import { Tab } from 'src/app/tab/model/tab.model'
import { FilesystemEventService } from 'src/app/filesystem/events/filesystem-event.service'
import { FilesystemService } from 'src/app/filesystem/filesystem.service'
import { filter, map, switchMap, tap } from 'rxjs/operators'
import { EMPTY, Observable, ReplaySubject } from 'rxjs'

@Directive({
  selector: '[appFileTab]',
})
export class FileTabDirective implements OnInit {
  @Output()
  close = new EventEmitter<void>()

  private _tab?: Tab
  @Input('appFileTab')
  get tab(): Tab | undefined {
    return this._tab
  }

  set tab(value: Tab | undefined) {
    if (!value) {
      return
    }
    this._tab = value
    this.dataChanges.next(value.data)
    this.propertyChanges.next({ type: value.type, path: value.path, title: value.title });
  }

  dataChanges = new ReplaySubject<any>(1)
  propertyChanges = new ReplaySubject<Tab>(1); // for tab props only (no data, no view)

  constructor(
    private filesystemEventService: FilesystemEventService,
    private filesystemService: FilesystemService
  ) {}

  ngOnInit(): void {
    this.filesystemEventService.onDeletePath
      .pipe(filter((path) => this.tab?.path.startsWith(path) || false))
      .subscribe(() => this.close.next())

    this.filesystemEventService.onMovePath
      .pipe(filter((event) => this.tab?.path?.startsWith(event.oldPath) || false))
      .subscribe((event) => {
        this.tab!.path = event.newPath;

        console.log("onMovePath", event)

        this.tab!.title = event.newPath.split('/').pop() || event.newPath;
        this.propertyChanges.next({ title: this._tab!.title, path: this._tab!.path, type: this._tab!.type });
      })

    this.filesystemEventService.onWriteToFile
      .pipe(
        filter((event) => this.tab?.path === event.path),
        switchMap((event) =>
          this.filesystemService.getFileAsBinary(event.path)
        ),
        map((content) => content as Uint8Array)
      )
      .subscribe((content) => {
        this.tab!.data.content = content
        this.dataChanges.next(this.tab!.data)
      })
  }

  saveCurrentFile(content: Uint8Array): Observable<void> {
    if (!this.tab?.path) {
      console.warn('Tried to save file without path')
      return EMPTY
    }

    console.log("save current file", this.tab)
    return this.filesystemService.writeToFile(this.tab?.path, content, true)
  }
}
