import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as JSZip from 'jszip';
import { iif, from, Observable, concat, forkJoin, EMPTY } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { PyodideService } from '../pyodide/pyodide.service';
import { ReplaySubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FilesystemService {
  readonly SYSTEM_FOLDERS = ['/dev', '/home', '/lib', '/proc', '/tmp', '/bin'];

  PyFS?: typeof FS & MissingInEmscripten;
  zipper: JSZip = new JSZip();;
  fsSubject = new ReplaySubject<typeof FS & MissingInEmscripten>(1);

  constructor(private http: HttpClient, private pyService: PyodideService) {
    this.pyService.pyodide.subscribe(py => {
      this.PyFS = py.FS;
      this.fsSubject.next(this.PyFS);
      console.log("FSSERVICE HAS RECEVIED FS");
      console.log(this.PyFS);
    });
  }

  // TODO: ggf. auslagern und openLesson direkt die ZIP übergeben
  getLessonAsZip(lessonName: string): Observable<ArrayBuffer> {
    return this.http.get(`/assets/${lessonName}.zip`, { responseType: 'arraybuffer' });
  }

  getFS() {
    return this.fsSubject;
  }

  openLesson3(name: string): Observable<any> {
    return concat(this.mountAndSync(name).pipe(
      map(path => this.isEmpty(path)),
      mergeMap(isEmpty => iif(() => isEmpty, this.openNewLesson(name), this.openExistingLesson(name)))
    ), this.sync(false))
  }

  sync(fromPersistentStorageToVirtualFS: boolean) {
    return new Observable(subscriber => {
      try {
        this.PyFS?.syncfs(fromPersistentStorageToVirtualFS, err => {
          if (err) {
            console.log("SYNC ERROR!");
            subscriber.error();
          } else {
            console.log("SYNC COMPLETE!!");
            subscriber.next();
            subscriber.complete();
          }
        });
        this.printRecursively("/", 0, 2);
      } catch (e) {
        subscriber.error();
      }
    });
  }

  openExistingLesson(name: string) {
    console.log("OPEN EXISTING LESSON");
    return EMPTY;
  }

  openNewLesson(name: string) {
    console.log("OPEN NEW LESSON!;")

    return this.getLessonAsZip(name).pipe(mergeMap(
      buff => {
        return from(this.zipper.loadAsync(buff))
          .pipe(mergeMap(zip => this.storeLesson(zip, name)));
      }
    ));
  }

  // TODO: Error handling (catchError)
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


  // TODO: rewrite using observables
  unmountAndSync(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const fullPath = `/${path}`;
        const node = this.PyFS?.analyzePath(fullPath, false);

        if (node?.exists) {
          this.PyFS?.syncfs(false, err => {
            if (!err) {
              this.PyFS?.unmount(fullPath);
              resolve();
            } else {
              reject();
            }
          });
        } else {
          reject(); // path doesn't exist
        }
      } catch (e) {
        reject();
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
          this.PyFS?.rmdir(path);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }

  fillZip(path: string, zip: JSZip, lessonName: string) {
    console.log(`Fill zip for path ${path}`);

    try {
      if (!this.isEmpty(path)) {
        const entries = (this.PyFS?.lookupPath(path, {}).node as FSNode).contents;

        for (const entry in entries) {
          if (this.isFile(`${path}${entry}`)) {
            const file = this.PyFS?.readFile(`${path}${entry}`);

            // prevent first level of zip from only containing a folder with the lessonName
            if (file) {
              const noPrefix = path.replace(`/${lessonName}`, '');
              zip.file(`${noPrefix}${entry}`, file, { createFolders: true });
            } else {
              // TODO 
            }
          } else {
            if (!this.isSystemDirectory(`${path}${entry}`)) {
              this.fillZip(`${path}${entry}/`, zip, lessonName);
            }
          }
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
          if (!this.isSystemDirectory(`${path}${entry}`)) { // TODO: Test
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

  // TODO: Name des zip archivs sollte name der lesson sein
  exportLesson(name: string): Observable<Blob> {
    return new Observable(subscriber => {
      const zip = new JSZip();
      this.fillZip(`/${name}/`, zip, name);
      zip.generateAsync({ type: "blob" }).then(function (blob) {
        subscriber.next(blob);
        // subscriber.next(URL.createObjectURL(blob));
        subscriber.complete();
      }, function (err) {
        subscriber.error();
      });
    });
  }


  storeLesson(unzippedLesson: JSZip, name: string): Observable<any> {
    console.log("STORELESSOn" + name);

    const folders: string[] = [];
    const files: string[] = [];

    unzippedLesson.forEach(entry => {
      if (entry !== `${name}/`) {
        this.zipper.file(entry) ? files.push(entry) : folders.push(entry);
      }
    });

    const folderObs = new Observable(subscriber => {
      if (this.isSystemDirectory(name)) { // TODO: Test!
        subscriber.error("Invalid lesson name (system directory)")
      }

      try {
        folders.forEach(folder => {
          this.PyFS?.mkdir(`${name}/${folder}`);
          console.log("MAKEDIR " + `${name}/${folder}`);

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

  isSystemDirectory(path: string): boolean {
    for (const systemPath of this.SYSTEM_FOLDERS) {
      const reg = new RegExp(`(\/)?${systemPath}(\/)*`);

      if (reg.test(path)) {
        return true;
      }
    }

    return false;
  }

  getDirectChildrenAsArray(path: string): string[] {
    console.log("getDirectCHildren " + path);

    const children: string[] = [];

    try {
      const entries = (this.PyFS?.lookupPath(path, {}).node as FSNode).contents;
      console.log("Entries: ");
      console.log(entries);

      for (const entry in entries) {
        if (this.isDirectory(`${path}/${entry}`)) {
          children.push(`${path}/${entry}/`);
        } else {
          children.push(`${path}/${entry}`);
        }
      }
    } catch (e) {
      console.error(e);
      // TODO
    }

    return children;
  }


  // -------------------------- TODO


  // TODO: Fetch from server (browser cache), unzip and replace specified file
  // Sync afterwards
  resetFile(): void {

  }

  resetLesson(): void {

  }

  importLesson(): void {
    // UI: file handler --> if exists --> sure?
    // dann: store lesson
  }



  // ----- V2: 
  usercreateFile(): void {
    // kann im popup namen + erweiterung angeben, dann öffnet sich neuer tab und man kann text content pasten
    // bilder lohnt sich nicht, dafür gibts ja img uploader
  }

  updateLesson(): void {
  }
}
