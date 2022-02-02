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
  }

  dataChanges = new ReplaySubject<any>(1)

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
        this.tab!.path.replace(event.oldPath, event.newPath)
        this.tab!.title = event.newPath.split('/').pop() || event.newPath
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
    return this.filesystemService.writeToFile(this.tab?.path, content, true)
  }
}
