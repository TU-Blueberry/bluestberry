import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as JSZip from 'jszip';
import { iif, from, Observable, concat, forkJoin, EMPTY } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { PyodideService } from '../pyodide/pyodide.service';
import { ReplaySubject } from 'rxjs';
import { ConfigObject } from './shared/configObject';
import { isSystemDirectory } from './shared/system_folder';
import { Location } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class FilesystemService {
  PyFS?: typeof FS & MissingInEmscripten;
  zipper: JSZip = new JSZip();;
  fsSubject = new ReplaySubject<typeof FS & MissingInEmscripten>(1);

  constructor(private http: HttpClient, private pyService: PyodideService, private location: Location) {
    this.pyService.pyodide.subscribe(py => {
      this.PyFS = py.FS;
      this.fsSubject.next(this.PyFS);
    });
  }

  getFS() {
    return this.fsSubject;
  }

  /** Checks whether lesson with the given name already exists in the local filesystem. 
   * If yes, the content from the local filesystem is used.
   * If no, the lesson with the given name will be requested from the server and stored afterwards 
   * Intended for situations where user shall choose between multiple lessons (e.g. application startup)
   * */
  openLessonByName(name: string): Observable<any> {
    return concat(this.checkIfLessonDoesntExistYet(name).pipe(
      mergeMap(isEmpty => iif(() => isEmpty, this.loadFromServerAndOpen(name), EMPTY))
    ), this.sync(false))
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

  /** Retrieves lesson from server and stores it */
  loadFromServerAndOpen(name: string) {
    const url = this.location.prepareExternalUrl(`/assets/${name}.zip`);

    return this.http.get(url, { responseType: 'arraybuffer' }).pipe(mergeMap(
      buff => {
        return this.loadZip(buff).pipe(mergeMap(zip => this.storeLesson(zip, name)));
      }
    ));
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

  loadZip(buff: ArrayBuffer): Observable<JSZip> {
    return from(this.zipper.loadAsync(buff));
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

  exportLesson(name: string): Observable<Blob> {
    return new Observable(subscriber => {
      const zip = new JSZip();
      this.fillZip(`/${name}/`, zip, name);
      zip.generateAsync({ type: "blob" }).then(function (blob) {
        subscriber.next(blob);
        subscriber.complete();
      }, function (err) {
        subscriber.error();
      });
    });
  }

  storeLesson(unzippedLesson: JSZip, name: string): Observable<any> {
    const folders: string[] = [];
    const files: string[] = [];

    unzippedLesson.forEach(entry => {
      if (entry !== `${name}/`) {
        this.zipper.file(entry) ? files.push(entry) : folders.push(entry);
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

  // TODO: How to handle errors?
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
  getTopLevelOfLesson(path: string): FSNode {
    const node = this.PyFS?.lookupPath(path, {}).node;
    return (node as FSNode);
  }

  // TODO: How to handle errors?
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


  // -------------------------- TODO
  
  // TODO: Fetch from server (browser cache), unzip and replace specified file
  // Sync afterwards
  resetFile(): void {

  }

  resetLesson(): void {

  }

  // ----- V2: 
  usercreateFile(): void {
    // kann im popup namen + erweiterung angeben, dann öffnet sich neuer tab und man kann text content pasten
    // bilder lohnt sich nicht, dafür gibts ja img uploader
  }

  updateLesson(): void {
  }
}
