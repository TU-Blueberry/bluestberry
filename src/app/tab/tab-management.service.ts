import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';
import {Tab} from 'src/app/tab/model/tab.model';
import {filter, map} from 'rxjs/operators';
import {TabType} from 'src/app/tab/model/tab-type.model';
import {FilesystemEventService} from 'src/app/filesystem/events/filesystem-event.service';
import {FileType} from 'src/app/shared/files/filetypes.enum';

@Injectable({
  providedIn: 'root'
})
export class TabManagementService {
  private _openTab = new Subject<Tab>();

  get openTab$() {
    return this._openTab.asObservable();
  }

  constructor(private filesystemEventService: FilesystemEventService) {
    filesystemEventService.onOpenFile.pipe(
      filter(e => e.byUser),
      map(e => ({
        title: e.path.split('/').pop() || e.path,
        extension: e.extension,
        type: this.mapFileTypeToTabType(e.type),
        data: { path: e.path, content: e.fileContent },
      })),
    ).subscribe(t => this._openTab.next(t));
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
}
