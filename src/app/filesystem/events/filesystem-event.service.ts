import { EventEmitter, Injectable } from '@angular/core';
import { PyodideService } from 'src/app/pyodide/pyodide.service';
import { FilesystemService } from 'src/app/filesystem/filesystem.service';
import { FileType } from 'src/app/shared/files/filetypes.enum';

@Injectable({
  providedIn: 'root'
})
export class FilesystemEventService {
  willMovePath: EventEmitter<{oldPath: string, newPath: string}> = new EventEmitter();
  onMovePath: EventEmitter<{oldPath: string, newPath: string, extension: string}> = new EventEmitter();
  willDeletePath: EventEmitter<string> = new EventEmitter();
  onDeletePath: EventEmitter<string> = new EventEmitter();
  onOpenFile: EventEmitter<{path: string, byUser: boolean, fileContent?: Uint8Array, type?: FileType, extension?: string}> = new EventEmitter();
  onReadFile: EventEmitter<{path: string, bytesRead: number}> = new EventEmitter();
  onWriteToFile: EventEmitter<{path: string, bytesWritten: number}> = new EventEmitter();
  onSeekFile: EventEmitter<{path: string, position: number, whence: any}> = new EventEmitter();
  onCloseFile: EventEmitter<string> = new EventEmitter();
  onMakeDirectory: EventEmitter<{path: string, mode: any}> = new EventEmitter();
  onMakeSymlink: EventEmitter<{oldPath: string, newPath: string}> = new EventEmitter();
  onNewNodeByUser: EventEmitter<{path: string, isFile: boolean}> = new EventEmitter();
  onNewNodeByUserSynced: EventEmitter<{path: string, isFile: boolean}> = new EventEmitter();
  onFailedCreationFromUi: EventEmitter<{path: string, isFile: boolean}> = new EventEmitter();

  constructor(private fsService: FilesystemService, private py: PyodideService) {
    // hook into emscripten filesystem callbacks where possible
    fsService.getFS().subscribe(fs => {
      fs.trackingDelegate['willMovePath'] = (_oldPath: string, _newPath: string) => this.willMovePath.emit({oldPath: _oldPath, newPath: _newPath});
      fs.trackingDelegate['willDeletePath'] = (_path: string) => this.willDeletePath.emit(_path);
      fs.trackingDelegate['onDeletePath'] = (_path: string) => this.onDeletePath.emit(_path);
      fs.trackingDelegate['onMovePath'] = (_oldPath: string, _newPath: string) => this.onPathMoved(_oldPath, _newPath);

      fs.trackingDelegate['onOpenFile'] = (_path: string, _flags: any) => {
        if (!this.fsService.isSystemDirectory(_path)) {
          this.onOpenFile.emit({path: _path, byUser: false});
        }
      }

      fs.trackingDelegate['onWriteToFile'] = (_path: string, _bytesWritten: number) => {
        this.onWriteToFile.emit({path: _path, bytesWritten: _bytesWritten})
      }
    });
  }

  // --- methods to emit events after user interactions 
  onPathMoved(oldPath: string, newPath: string): void {
    this.onMovePath.emit({oldPath: oldPath, newPath: newPath, extension: this.fsService.getExtension(newPath)});
  }

  onUserOpenFile(_path: string, node: FSNode) {
    if (!this.fsService.isSystemDirectory(_path)) {
      const content = node.contents instanceof Uint8Array ? node.contents : undefined;
      const fileType = this.fsService.getFileType(_path);
      this.onOpenFile.emit({path: _path, byUser: true, fileContent: content, type: fileType});
    }
  }

  createNewNodeByUser(path: string, isFile: boolean): void {
    this.onNewNodeByUser.emit({path: path, isFile: isFile});
  }
  
  updateSyncStatusOfTentative(path: string, isFile: boolean): void {
    this.onNewNodeByUserSynced.emit({path: path, isFile: isFile});
  }

  failedCreationFromUi(path: string, isFile: boolean): void {
    this.onFailedCreationFromUi.emit({path: path, isFile: isFile});
  }
}
