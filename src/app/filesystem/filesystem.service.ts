import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as JSZip from 'jszip';
import { Observable, concat, forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { PyodideService } from '../pyodide/pyodide.service';
import { ReplaySubject } from 'rxjs';
import { ConfigObject } from './shared/configObject';
import { isSystemDirectory } from './shared/system_folder';

@Injectable({
  providedIn: 'root'
})
export class FilesystemService {
  PyFS?: typeof FS & MissingInEmscripten;
  fsSubject = new ReplaySubject<typeof FS & MissingInEmscripten>(1);

  constructor(private http: HttpClient, private pyService: PyodideService) {
    this.pyService.pyodide.subscribe(py => {
      this.PyFS = py.FS;
      this.fsSubject.next(this.PyFS);
    });

    this.pyService.getAfterExecution().subscribe(() => this.sync(false));
  }

  getFS() {
    return this.fsSubject;
  }

  /** Lesson exists, if the corresponding dir either already exists OR if we can create the
   * corresponding dir and it is not empty after synching with IDBFS
   */
  checkIfLessonDoesntExistYet(name: string) {
    return this.mountAndSync(name).pipe(
      map(path => this.isEmpty(path)));
  }

  sync(fromPersistentStorageToVirtualFS: boolean) {
    return new Observable(subscriber => {
      try {
        this.PyFS?.syncfs(fromPersistentStorageToVirtualFS, err => {
          if (err) {
            subscriber.error();
          } else {
            subscriber.complete();
           // this.printRecursively("/", 0, 2);
          }
        });
      } catch (e) {
        subscriber.error();
      }
    });
  }

  importLesson(existsAlready: boolean, config: ConfigObject, zip?: JSZip): Observable<any> {
    return new Observable(subscriber => {
      const path = `/${config.name}`;

      if (!zip || !config.name) {
        subscriber.error("No zip provided or invalid configuration file");
        return;
      }

      if (existsAlready) {
        this.deleteFolder(path);
      }

      concat(this.unmountAndSync(path), this.mountAndSync(config.name), this.storeLesson(zip, config.name))
      .subscribe(
        () => {},
        err => subscriber.error(err),
        () =>  subscriber.complete());
    });

  }

  // TODO: Error handling (catchError)
  // TODO: Ggf. sycnfs durch sync() ersetzen
  mountAndSync(name: string): Observable<string> {
    return new Observable(subscriber => {
      try {
        const fullPath = `/${name}`;
        const node = this.PyFS?.analyzePath(fullPath, false);

        if (!node?.exists) {
          this.PyFS?.mkdir(fullPath);
          this.PyFS?.mount(this.PyFS?.filesystems.IDBFS, {}, fullPath);
          this.PyFS?.syncfs(true, err => {
            err ? subscriber.error(err) : (subscriber.next(fullPath), subscriber.complete());
          });
        } else {
          subscriber.next(fullPath);
          subscriber.complete(); // path is already mounted
        }
      } catch (e) {
        console.log(e);
        subscriber.error(e);
      }
    });
  }

  unmountAndSync(name: string): Observable<string> {
    return new Observable(subscriber => {
      try {
        const fullPath = `/${name}`;
        const node = this.PyFS?.analyzePath(fullPath, false);

        if (node?.exists) {
          this.PyFS?.syncfs(false, err => {
            if (!err) {
              this.PyFS?.unmount(fullPath);
              this.PyFS?.rmdir(fullPath);
              subscriber.complete();
            } else {
              subscriber.error("Error while unmounting");
            }
          });
        } else {
          subscriber.error("Erorr: Path to unmount doesn't exist");
        }
      } catch (e) {
        subscriber.error("Error before unmount");
      }
    });
  }

  createFileFromZip(unzippedLesson: JSZip, file: string, name: string): Observable<ArrayBuffer> {
    return new Observable(subscriber => {
      let stream = unzippedLesson.file(file)?.internalStream("arraybuffer");
      stream?.on("error", () => subscriber.error('Error reading zip'));
      stream?.on("end", () => console.log("END"));

      stream?.accumulate().then(accumulated => {
        try {
          this.PyFS?.writeFile(`${name}/${file}`, new Uint8Array(accumulated));
          subscriber.next(accumulated);
          subscriber.complete();
        } catch (err) {
          subscriber.error("Error writing file");
        }
      });
    });
  }

  deleteFile(path: string): void {
    if (this.isFile(path)) {
      try {
        this.PyFS?.unlink(path);
      } catch (e) {
        console.error(e);
      }
    }
  }

  deleteFolder(path: string): void {       
    if (this.isDirectory(path)) {
      try {
        if (this.isEmpty(path)) {
          this.PyFS?.rmdir(path);
        } else {
          const entries = (this.PyFS?.lookupPath(path, {}).node as FSNode).contents;

          for (const [key, value] of Object.entries(entries)) {
            const nextElement = `${path}/${value.name}`;

            if (this.isDirectory(nextElement)) {
              this.deleteFolder(nextElement);
            } else if (this.isFile(nextElement)) {
              this.deleteFile(nextElement);
            }
          }

          // can't delete root path /<lessonName> as it also is a mountpoint
          // /<lessonName> will be split into ['', '<lessonName>']
          if (path.split('/').length > 2) {
            this.PyFS?.rmdir(path);
          } 
        }
      } catch (e) {
        console.error(e);
      }
    }
  }

  /* Returns all subfolders and - if requested - files of the given path as seperate arrays */
  scan(path: string, depth: number, includeFiles: boolean) {
    const entries = (this.PyFS?.lookupPath(path, {}).node as FSNode).contents;
    const subfolders: FSNode[] = [];
    const filesInFolder: FSNode[] = [];

    Object.entries(entries).forEach(([_, value], key) =>  {
      const currentPath = `${path}/${value.name}`;

      if (!isSystemDirectory(currentPath) && this.isDirectory(currentPath)) {
        subfolders.push(value);
      }

      if (this.isFile(currentPath) && !(depth == 0 && value.name === 'config.json') && includeFiles) {
        filesInFolder.push(value);
      }
    });

    return [subfolders, filesInFolder];
  }

  // TODO: Probably also check if path exists?
  fillZip(path: string, zip: JSZip, lessonName: string) {
    try {
      if (!this.isEmpty(path)) {
        const entries = (this.PyFS?.lookupPath(path, {}).node as FSNode).contents;

        for (const entry in entries) {
          if (this.isFile(`${path}${entry}`)) {
            const file = this.PyFS?.readFile(`${path}${entry}`);

            // prevent first level of zip from only containing a folder with the lessonName
            if (file) {
              const noPrefix = path.replace(`/${lessonName}`, '');
              zip.file(`${noPrefix}${entry}`, file, { createFolders: true }); // create folders along the way
            } else {
              // TODO: Error
            }
          } else {
            if (!isSystemDirectory(`${path}${entry}`)) {
              this.fillZip(`${path}${entry}/`, zip, lessonName);
            }
          }
        }
      } else {
        if (!isSystemDirectory(path)) {
          const noPrefix = path.replace(`/${lessonName}`, '');
          zip.folder(noPrefix); // also export empty folders (without prefix)
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  // https://github.com/emscripten-core/emscripten/issues/2602
  printRecursively(path: string, startDepth: number, offsetPerLevel: number): void {
    try {
      if (!this.isEmpty(path)) {
        const entries = (this.PyFS?.lookupPath(path, {}).node as FSNode).contents;

        for (const entry in entries) {
          if (!isSystemDirectory(`${path}${entry}`)) { // TODO: Test
            if (this.isDirectory(`${path}${entry}`)) {
              console.log("-".repeat(startDepth + offsetPerLevel) + ` ${entry}`);
              this.printRecursively(`${path}${entry}/`, startDepth + offsetPerLevel, offsetPerLevel);
            } else {
              console.log("-".repeat(startDepth + offsetPerLevel) + ` ${entry}`);
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  storeLesson(unzippedLesson: JSZip, name: string): Observable<any> {
    const folders: string[] = [];
    const files: string[] = [];

    unzippedLesson.forEach(entry => {
      if (entry !== `${name}/`) {
        unzippedLesson.file(entry) ? files.push(entry) : folders.push(entry);
      }
    });

    const folderObs = new Observable(subscriber => {
      if (isSystemDirectory(name)) { // TODO: Test!
        subscriber.error("Invalid lesson name (system directory)")
      }

      try {
        folders.forEach(folder => {
          this.PyFS?.mkdir(`${name}/${folder}`);
        });
        subscriber.complete();
      } catch (err) {
        subscriber.error(err);
      }
    });

    const fileObservables: any[] = [];
    files.forEach(file => fileObservables.push(this.createFileFromZip(unzippedLesson, file, name)));
    return concat(folderObs, forkJoin(fileObservables));
  }

  /**
   * Eigtl. bei allen Pfaden noch zusätzlich vorher prüfen, ob sie existieren
   * Schreit nach einer eigenen Methode, die trim() etc. macht und dann prüft, ob Pfad existiert
   */

  // TODO: How to handle errors?
  // TODO: Check if path exists
  isEmpty(path: string): boolean {
    try {
      const node = this.PyFS?.lookupPath(path, {}).node;
      return Object.keys((node as FSNode).contents).length === 0;
    } catch (e) {
      console.log(e);
      return false;
    }
  }

  // TODO: Fehlerbehandlung
  // TODO: Check if path exists
  getTopLevelOfLesson(path: string): FSNode {
    const node = this.PyFS?.lookupPath(path, {}).node;
    return (node as FSNode);
  }

  // TODO: How to handle errors?
  // TODO: Check if path exists
  isFile(path: string): boolean {
    try {
      const node = this.PyFS?.lookupPath(path, {}).node;
      return this.PyFS?.isFile((node as FSNode).mode) || false;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  // TODO: How to handle errors?
  isDirectory(path: string): boolean {
    try {
      const node = this.PyFS?.lookupPath(path, {}).node;
      return this.PyFS?.isDir((node as FSNode).mode) || false;
    } catch (e) {
      return false;
    }
  }

  // TODO: errors
  getNodeByPath(path: string): FSNode | undefined {
    try {
      return (this.PyFS?.lookupPath(path, {}).node as FSNode);
    } catch(e) {
      console.error(e);
      return undefined;
    }
  }

  exists(path: string): Observable<boolean> {
    return new Observable(subscriber => {
      try {
        const node = this.PyFS?.analyzePath(path, false);

        if (!node) {
          subscriber.error("Error analyzing path");
        } else {
          subscriber.next(node.exists);
          subscriber.complete();
        }
      } catch (e) {
        subscriber.error("Error checking existence of path");
      }
    });
  }

  /** Writes to an existing file */
  writeToFile(path: string, content: Uint8Array): Observable<any> {
    const writing = new Observable(subscriber => {
      if (!this.isFile(path)) {
        subscriber.error("Path doesn't belong to a file");
      } else {
        try {
          this.PyFS?.writeFile(path, content);
          subscriber.complete();
        } catch (e) {
          subscriber.error("Error while writing to file");
        }
      }
    });

    return concat(writing, this.sync(false));
  }

  createFile(path: string, content: Uint8Array): Observable<any> {
    const writing = new Observable(subscriber => {
      try {
        this.PyFS?.writeFile(path, content);
        subscriber.complete();
      } catch (e) {
        subscriber.error("Error while writing to file");
      }
    });

    return concat(writing, this.sync(false));
  }

  createFolder(path: string): Observable<any> {
    return concat(this.exists(path).pipe(switchMap(exists => {
      const mkDir = new Observable(subscriber => {
        if (exists) {
          subscriber.error("Destination is not empty");
          return;
        }
  
        try {
          this.PyFS?.mkdir(path);
          subscriber.complete();
        } catch (e) {
          subscriber.error("Error creating directory");
        }
  
      });
  
      return mkDir;
    })), this.sync(false));
  }

  getFileContent(path: string, _encoding: allowedEncodings): Observable<Uint8Array | string | undefined> {
    return new Observable(subscriber => {
      if (!this.isFile(path)) {
        subscriber.error("Path doesn't belong to a file");
      } else {
        try {
          const content = this.PyFS?.readFile(path, { encoding: _encoding});
          subscriber.next(content);
          subscriber.complete();
        } catch (e) {
          subscriber.error("Error reading file");
        }
      }
    });
  }

  /** Renaming and moving (works for both files and folders) */
  rename(oldPath: string, newPath: string): Observable<any> {
    return concat(this.exists(newPath).pipe(switchMap(exists => {
      return new Observable(subscriber => {  
        if (exists) {
          subscriber.error("New path not empty");
          return;
        }
  
        try {
          this.PyFS?.rename(oldPath, newPath);
          subscriber.complete();
        } catch (e) {
          subscriber.error("Error while moving node");
        }
      });
    })), this.sync(false));
  }

  // -------------------------- TODO
  
  // TODO: Fetch from server (browser cache), unzip and replace specified file
  // Sync afterwards
  resetFile(): void {

  }

  resetLesson(): void {

  }

  updateLesson(): void {
  }
}
