import {Injectable} from '@angular/core';
import {concat, defer, EMPTY, merge, Observable, of, Subject} from 'rxjs';
import {catchError, filter, finalize, map, switchMap} from 'rxjs/operators';
import {TabType} from 'src/app/tab/model/tab-type.model';
import {FilesystemEventService} from 'src/app/filesystem/events/filesystem-event.service';
import {OpenTabEvent} from 'src/app/tab/model/open-tab-event';
import {FilesystemService} from 'src/app/filesystem/filesystem.service';
import {FileType} from '../shared/files/filetypes.enum';
import { Actions, ofActionSuccessful, Store } from '@ngxs/store';
import { ExperienceAction } from '../experience/actions';
import { ConfigService } from '../shared/config/config.service';
import { ExperienceState, ExperienceStateModel } from '../experience/experience.state';
import { FromConfig } from '../viewer/actions/from-config.action';
import { ImportAction } from '../actionbar/actions/import.action';

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
    private store: Store, 
    private action$: Actions, 
    private conf: ConfigService
  ) {
    const lesson$ = merge(
      action$.pipe(ofActionSuccessful(ExperienceAction.Open)),
      action$.pipe(ofActionSuccessful(ImportAction.OverwriteCurrent))
    ).pipe(
      switchMap((e: ExperienceAction.Open) => conf.getConfigByExperience(e.exp)),
      switchMap(conf => {
        return concat(...conf.open.map(file => {
          if (file.path.toLowerCase().endsWith('unity')) {
            return of({
              groupId: file.on,
              title: 'Simulation',
              type: 'UNITY' as TabType,
              path: '',
              active: file.active
            });
          } else if (file.path.toLowerCase().endsWith('hint')) {
            return of({
              groupId: file.on,
              title: 'Hinweise',
              type: 'HINT' as TabType,
              path: '',
              active: file.active
            });
          }
          return this.createOpenTabEvent(`/${conf.uuid}/${file.path}`, file.active).pipe(map(ote => ({...ote, groupId: file.on})))
        })
        ).pipe(
          finalize(() => this.store.dispatch(new FromConfig(conf.splitSettings, conf.open)))
        )
      })
    )

    const userOpenEvent$ = filesystemEventService.onOpenFile.pipe(
      filter(e => e.byUser),
      switchMap(e => this.createOpenTabEvent(e.path, true, e.type, e.fileContent)),
    );

    merge(lesson$, userOpenEvent$).subscribe(t => this._openTab.next(t));
  }

  openHints(): Observable<never> {
    return this.getHintRoot().pipe(
      switchMap(path => this.filesystemService.getFileAsBinary(path).pipe(
        switchMap(data => defer(() => {
          const full = ({ content: data, base_path: path });
          this._openTab.next({groupId: 'right', title: 'Hinweise', type: 'HINT' as TabType, path: '', data: full, active: true})
        }))
      ))
    );
  }

  createOpenTabEvent(path: string, active: boolean, type?: FileType, fileContent?: Uint8Array): Observable<OpenTabEvent> {
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
      data: { content: fileContent },
      path: path,
      active: active
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
      case FileType.JSON:
      case FileType.TEX:
      case FileType.DATA:
        return 'left';
      case FileType.IMAGE:
      case FileType.MARKDOWN:
        return 'right';
      default:
        return 'left';
    }
  }

  private getHintRoot(): Observable<string> {
    return this.store.selectOnce<ExperienceStateModel>(ExperienceState).pipe(
      switchMap(state => {
        if (!state.current) {
          return of('')
        } else {
          return this.conf.getHintRoot(state.current);
        }
      })
    )
  }
}
