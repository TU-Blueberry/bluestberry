import {Injectable} from '@angular/core';
import {concat, defer, EMPTY, merge, Observable, of, Subject} from 'rxjs';
import {catchError, filter, map, switchMap} from 'rxjs/operators';
import {TabType} from 'src/app/tab/model/tab-type.model';
import {FilesystemEventService} from 'src/app/filesystem/events/filesystem-event.service';
import {OpenTabEvent} from 'src/app/tab/model/open-tab-event';
import {FilesystemService} from 'src/app/filesystem/filesystem.service';
import {FileType} from '../shared/files/filetypes.enum';
import {ExperienceEventsService} from '../experience/experience-events.service';
import { Tab } from './model/tab.model';
import { Store } from '@ngxs/store';

@Injectable({
  providedIn: 'root'
})
export class TabManagementService {
  private _openTab = new Subject<OpenTabEvent>();
  private _openTabGroups = new Subject<{[id: string]: Tab[]}>();
  private _activeTabSubject = new Subject<{ [id: string]: Tab | undefined }>();

  private _tabGroups: { [id: string]: Tab[] } = {};
  private _activeTabs: { [id: string]: Tab | undefined } = {}

  get openTab$() {
    return this._openTab.asObservable();
  }

  get currentlyOpenTabs$() {
    return this._openTabGroups.asObservable();
  }

  get activeTabs$() {
    return this._activeTabSubject.asObservable();
  }

  constructor(
    private filesystemEventService: FilesystemEventService,
    private filesystemService: FilesystemService,
    private experienceEventService: ExperienceEventsService,
    private store: Store
  ) {
    const lesson$ = experienceEventService.onExperienceOpened.pipe(
        switchMap(({open}) => concat(...open.map(file => {
          if (file.path.toLowerCase().endsWith('unity')) {
            return of({
              groupId: file.on,
              title: 'Simulation',
              type: 'UNITY' as TabType,
              path: ''
            });
          } else if (file.path.toLowerCase().endsWith('hint')) {
            return of({
              groupId: file.on,
              title: 'Hinweise',
              type: 'HINT' as TabType,
              path: ''
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

  openHintsManually(): Observable<never> {
    return this.getCurrentExperience().pipe(
      switchMap(path => this.filesystemService.getFileAsBinary(path).pipe(
        switchMap(data => defer(() => {
          const full = ({ content: data });
          this._openTab.next({groupId: 'right', title: 'Hinweise', type: 'HINT' as TabType, path: path, data: full})
        }))
      ))
    );
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
      data: { content: fileContent },
      path: path
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
  
  // TODO: probably need to clear tabGroups and active tabs on expclose
  updateTabGroups(id: string, tabs: Tab[]): void {
    this._tabGroups[id] = [...tabs];
    this._openTabGroups.next(this._tabGroups);
  }

  updateActiveTabs(id: string, tab?: Tab): void {
    this._activeTabs[id] = tab;
    this._activeTabSubject.next(this._activeTabs);
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

  // TODO: Load currentExp from Store
  private getCurrentExperience(): Observable<string> {
    return of('/abc/hint_files/root.yml');
  }
}
