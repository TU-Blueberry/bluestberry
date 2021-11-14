import { EventEmitter, Injectable } from '@angular/core';
import { FilesystemService } from './filesystem.service';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  
  willMovePath: EventEmitter<{oldPath: string, newPath: string}> = new EventEmitter();
  onMovePath: EventEmitter<{oldPath: string, newPath: string}> = new EventEmitter();
  willDeletePath: EventEmitter<string> = new EventEmitter();
  onDeletePath: EventEmitter<string> = new EventEmitter();
  onOpenFile: EventEmitter<{path: string, flags: any}> = new EventEmitter();
  onReadFile: EventEmitter<{path: string, bytesRead: number}> = new EventEmitter();
  onWriteToFile: EventEmitter<{path: string, bytesWritten: number}> = new EventEmitter();
  onSeekFile: EventEmitter<{path: string, position: number, whence: any}> = new EventEmitter();
  onCloseFile: EventEmitter<string> = new EventEmitter();
  onMakeDirectory: EventEmitter<{path: string, mode: any}> = new EventEmitter();
  onMakeSymlink: EventEmitter<{oldPath: string, newPath: string}> = new EventEmitter();
  

  // TODO: Kann sein, dass ich alles rund um path noch in file/directory aufschlüsseln muss
  constructor(private fsService: FilesystemService) { 
    fsService.getFS().subscribe(fs => {
      fs.trackingDelegate['willMovePath'] = (_oldPath: string, _newPath: string) => this.willMovePath.emit({oldPath: _oldPath, newPath: _newPath});

      fs.trackingDelegate['willDeletePath'] = (_path: string) => this.willDeletePath.emit(_path);
      fs.trackingDelegate['onDeletePath'] = (_path: string) => this.onDeletePath.emit(_path);
    });
  }
}
