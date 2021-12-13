 import {Injectable} from '@angular/core';
import {concat, EMPTY, merge, Observable, of, Subject} from 'rxjs';
import {catchError, filter, map, switchMap} from 'rxjs/operators';
import {TabType} from 'src/app/tab/model/tab-type.model';
import {FilesystemEventService} from 'src/app/filesystem/events/filesystem-event.service';
import {FileType} from 'src/app/shared/filetypes.enum';
import {OpenTabEvent} from 'src/app/tab/model/open-tab-event';
import {FilesystemService} from 'src/app/filesystem/filesystem.service';


@Injectable({
  providedIn: 'root'
})
export class TabManagementService {
  private _openTab = new Subject<OpenTabEvent>();

  get openTab$() {
    return this._openTab.asObservable();
  }

  constructor(
    private filesystemEventService: FilesystemEventService,
    private filesystemService: FilesystemService
  ) {
    const lesson$ = filesystemEventService.onOpenLesson.pipe(
        switchMap(({open}) => concat(...open.map(file => {
          if (file.path.toLowerCase().endsWith('unity')) {
            return of({
              groupId: file.on,
              icon: 'hero-chip',
              title: 'Simulation',
              type: 'UNITY' as TabType,
            });
          } else if (file.path.toLowerCase().endsWith('hint')) {
            return of({
              groupId: file.on,
              icon: 'hero-lightning-bolt',
              title: 'Hinweise',
              type: 'HINT' as TabType,
            });
          }
          return this.createOpenTabEvent(file.path).pipe(map(ote => ({...ote, groupId: file.on})))
        })
        )
      )
    );

    const userOpenEvent$ = filesystemEventService.onOpenFile.pipe(
      filter(e => e.byUser),
      switchMap(e => this.createOpenTabEvent(e.path, e.type, e.fileContent)),
    );

    merge(lesson$, userOpenEvent$).subscribe(t => this._openTab.next(t));
  }

  createOpenTabEvent(path: string, type?: FileType, fileContent?: Uint8Array): Observable<OpenTabEvent> {
    const fileType = type || this.filesystemService.getFileType(path);
    return (
      fileContent ? of(fileContent) : this.filesystemService.getFileAsBinary(path)
    ).pipe(
      catchError(error => {
        console.error('could not read file, error: ', error);
        return EMPTY;
      }),
      map((fileContent) => ({
      title: path.split('/').pop() || path,
      groupId: this.mapFileTypeToTabGroup(fileType),
      icon: this.mapTypeToIcon(fileType),
      type: this.mapFileTypeToTabType(fileType),
      data: { path: path, content: fileContent },
    })));
  }

  mapTypeToIcon(fileType?: FileType): string {
    switch (fileType) {
      case FileType.PY:
      case FileType.JSON:
      case FileType.TEX:
      case FileType.CSV:
        return 'hero-document-text';
      case FileType.BMP:
      case FileType.JPEG:
      case FileType.JPG:
      case FileType.PNG:
        return 'hero-photograph';
      case FileType.MD:
        return 'hero-book-open';
      default:
        return 'hero-document';
    }
  }

  mapFileTypeToTabType(fileType?: FileType): TabType {
    switch (fileType) {
      case FileType.PY:
      case FileType.JSON:
      case FileType.TEX:
      case FileType.CSV:
        return 'CODE';
      case FileType.BMP:
      case FileType.JPEG:
      case FileType.JPG:
      case FileType.PNG:
        return 'IMAGE';
      case FileType.MD:
        return 'MARKDOWN'
      default:
        return 'CODE';
    }
  }

  private mapFileTypeToTabGroup(fileType?: FileType): string {
    switch (fileType) {
      case FileType.PY:
      case FileType.MD:
      case FileType.JSON:
      case FileType.TEX:
      case FileType.CSV:
        return 'left';
      case FileType.BMP:
      case FileType.JPEG:
      case FileType.JPG:
      case FileType.PNG:
        return 'right';
      default:
        return 'left';
    }
  }
}
