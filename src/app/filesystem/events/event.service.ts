import { EventEmitter, Injectable } from '@angular/core';
import { PyodideService } from 'src/app/pyodide/pyodide.service';
import { FilesystemService } from '../filesystem.service';
import { isSystemDirectory } from '../shared/system_folder'; 

@Injectable({
  providedIn: 'root'
})
export class EventService { 
  willMovePath: EventEmitter<{oldPath: string, newPath: string}> = new EventEmitter();
  onMovePath: EventEmitter<{oldPath: string, newPath: string}> = new EventEmitter();
  willDeletePath: EventEmitter<string> = new EventEmitter();
  onDeletePath: EventEmitter<string> = new EventEmitter();
  onOpenFile: EventEmitter<{path: string, byUser: boolean, fileContent?: Uint8Array}> = new EventEmitter();
  onReadFile: EventEmitter<{path: string, bytesRead: number}> = new EventEmitter();
  onWriteToFile: EventEmitter<{path: string, bytesWritten: number}> = new EventEmitter();
  onSeekFile: EventEmitter<{path: string, position: number, whence: any}> = new EventEmitter();
  onCloseFile: EventEmitter<string> = new EventEmitter();
  onMakeDirectory: EventEmitter<{path: string, mode: any}> = new EventEmitter();
  onMakeSymlink: EventEmitter<{oldPath: string, newPath: string}> = new EventEmitter();
  onActiveElementChange: EventEmitter<string> = new EventEmitter();
  afterCodeExecution: EventEmitter<void> = new EventEmitter();
  
  // TODO: Kann sein, dass ich alles rund um path noch in file/directory aufschlüsseln muss
  // TODO: isSystemDirectory einheitlich regeln (d.h. entweder hier oder in den aufrufenden Methoden abfangen)
  constructor(private fsService: FilesystemService, private py: PyodideService) { 
    fsService.getFS().subscribe(fs => {
      fs.trackingDelegate['willMovePath'] = (_oldPath: string, _newPath: string) => this.willMovePath.emit({oldPath: _oldPath, newPath: _newPath});
      fs.trackingDelegate['willDeletePath'] = (_path: string) => this.willDeletePath.emit(_path);
      fs.trackingDelegate['onDeletePath'] = (_path: string) => this.onDeletePath.emit(_path);
      fs.trackingDelegate['onMovePath'] = (_oldPath: string, _newPath: string) => this.onMovePath.emit({oldPath: _oldPath, newPath: _newPath});
      
      fs.trackingDelegate['onOpenFile'] = (_path: string, _flags: any) => {
        if (!isSystemDirectory(_path)) {
          this.onOpenFile.emit({path: _path, byUser: false});
        }
      }

      fs.trackingDelegate['onWriteToFile'] = (_path: string, _bytesWritten: number) => this.onWriteToFile.emit({path: _path, bytesWritten: _bytesWritten})
    });

    py.getAfterExecution().subscribe(() => this.afterCodeExecution.emit());
  }

  onUserOpenFile(_path: string, content: Uint8Array) {
    if (!isSystemDirectory(_path)) {
      this.onOpenFile.emit({path: _path, byUser: true, fileContent: content});
    }
  }

  changeActiveElement(newActiveElement: string): void {
    this.onActiveElementChange.emit(newActiveElement);
  }
}
