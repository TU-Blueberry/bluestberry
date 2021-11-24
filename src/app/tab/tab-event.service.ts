import { Injectable } from '@angular/core';
import {Subject} from 'rxjs';
import {Tab} from 'src/app/tab/model/tab.model';
import {EventService} from 'src/app/filesystem/events/event.service';
import {filter, map} from 'rxjs/operators';
import {FilesystemService} from 'src/app/filesystem/filesystem.service';
import {TabType} from 'src/app/tab/model/tab-type.model';

@Injectable({
  providedIn: 'root'
})
export class TabEventService {
  private _openTab = new Subject<Tab>();

  get openTab$() {
    return this._openTab.asObservable();
  }

  constructor(private fileEventService: EventService) {
    fileEventService.onOpenFile.pipe(
      filter(e => e.byUser),
      map(e => ({
        title: e.path.split('/').pop(),
        icon: this.mapPathToIcon(e.path),
        type: this.mapPathToType(e.path),
        data: { path: e.path },
      })),
    )
  }

  mapPathToIcon(path: string): string {
    const extension = this.getFileExtension(path);
    switch (extension) {
      case 'py':
      case 'txt':
        return 'hero-document-text';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return 'hero-photograph';
      default:
        return 'hero-document';
    }
  }

  mapPathToType(path: string): TabType {
    const extension = this.getFileExtension(path);
    switch (extension) {
      case 'py':
      case 'txt':
        return 'CODE';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return 'IMAGE';
      default:
        return 'CODE';
    }
  }

  private getFileExtension(path: string) {
    return path.split('.').pop();
  }
}
