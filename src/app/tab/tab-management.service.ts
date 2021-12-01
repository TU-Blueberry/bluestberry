import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';
import {Tab} from 'src/app/tab/model/tab.model';
import {filter, map} from 'rxjs/operators';
import {TabType} from 'src/app/tab/model/tab-type.model';
import {FilesystemEventService} from 'src/app/filesystem/events/filesystem-event.service';
import {FileType} from 'src/app/shared/filetypes.enum';

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
        icon: this.mapTypeToIcon(e.type),
        type: this.mapFileTypeToTabType(e.type),
        data: { path: e.path, content: e.fileContent },
      })),
    ).subscribe(t => this._openTab.next(t));
  }

  mapTypeToIcon(fileType?: FileType): string {
    switch (fileType) {
      case FileType.PY:
      case FileType.MD:
      case FileType.JSON:
      case FileType.TEX:
      case FileType.CSV:
        return 'hero-document-text';
      case FileType.BMP:
      case FileType.JPEG:
      case FileType.JPG:
      case FileType.PNG:
        return 'hero-photograph';
      default:
        return 'hero-document';
    }
  }

  mapFileTypeToTabType(fileType?: FileType): TabType {
    switch (fileType) {
      case FileType.PY:
      case FileType.MD:
      case FileType.JSON:
      case FileType.TEX:
      case FileType.CSV:
        return 'CODE';
      case FileType.BMP:
      case FileType.JPEG:
      case FileType.JPG:
      case FileType.PNG:
        return 'IMAGE';
      default:
        return 'CODE';
    }
  }
}
