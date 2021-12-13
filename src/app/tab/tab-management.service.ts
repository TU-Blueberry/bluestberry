 import {Injectable} from '@angular/core';
import {concat, EMPTY, merge, Observable, of, Subject} from 'rxjs';
import {catchError, filter, map, switchMap} from 'rxjs/operators';
import {TabType} from 'src/app/tab/model/tab-type.model';
import {FilesystemEventService} from 'src/app/filesystem/events/filesystem-event.service';
import {OpenTabEvent} from 'src/app/tab/model/open-tab-event';
import {FilesystemService} from 'src/app/filesystem/filesystem.service';
import { FileType } from '../shared/files/filetypes.enum';
import { LessonEventsService } from '../lesson/lesson-events.service';


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
    private filesystemService: FilesystemService,
    private lessonEventService: LessonEventsService
  ) {
    const lesson$ = lessonEventService.onLessonOpened.pipe(
        switchMap(({open}) => concat(...open.map(file => {
          if (file.path.toLowerCase().endsWith('unity')) {
            return of({
              groupId: file.on,
              title: 'Simulation',
              type: 'UNITY' as TabType,
            });
          } else if (file.path.toLowerCase().endsWith('hint')) {
            return of({
              groupId: file.on,
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
      type: this.mapFileTypeToTabType(fileType),
      data: { path: path, content: fileContent },
    })));
  }

  mapFileTypeToTabType(fileType?: FileType): TabType {
    switch (fileType) {
      case FileType.IMAGE: return 'IMAGE';
      case FileType.PROGRAMMING_LANGUAGE: return 'CODE';
      case FileType.MARKDOWN: return 'MARKDOWN';
      default:
        return 'CODE';
    }
  }

  private mapFileTypeToTabGroup(fileType?: FileType): string {
    switch (fileType) {
      case FileType.PROGRAMMING_LANGUAGE:
      case FileType.MARKDOWN:
      case FileType.JSON:
      case FileType.TEX:
      case FileType.DATA:
        return 'left';
      case FileType.IMAGE:
        return 'right';
      default:
        return 'left';
    }
  }
}
