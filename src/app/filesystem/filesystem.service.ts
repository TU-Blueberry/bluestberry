import { Injectable } from '@angular/core';
import * as JSZip from 'jszip';
import { Observable, concat, forkJoin, of } from 'rxjs';
import { ignoreElements, map, switchMap } from 'rxjs/operators';
import { PyodideService } from '../pyodide/pyodide.service';
import { ReplaySubject } from 'rxjs';
import { ConfigObject } from './model/config';

@Injectable({
  providedIn: 'root'
})
export class FilesystemService {
  readonly SYSTEM_FOLDERS = new Set(['/dev', '/home', '/lib', '/proc', '/tmp', '/bin']);
  HIDDEN_PATHS = new Set<string>();
  EXTERNAL_PATHS = new Set<string>();
  READONLY_PATHS = new Set<string>();
  MODULE_PATHS = new Set<string>();

  PyFS?: typeof FS & MissingInEmscripten;
  fsSubject = new ReplaySubject<typeof FS & MissingInEmscripten>(1);

  constructor(private pyService: PyodideService) {
    this.pyService.pyodide.subscribe(py => {
      this.PyFS = py.FS;

      console.log("FS: ");
      console.log(this.PyFS);

      this.fsSubject.next(this.PyFS);
    });

    this.pyService.getAfterExecution().subscribe(() => this.sync(false));
  }

  getFS() {
    return this.fsSubject;
  }

  storeConfig(config: ConfigObject): Observable<any> {
    const storeConfigObserv = new Observable(subscriber => {
      try {
          this.PyFS?.mkdir(`/configs/${config.name}`);
          this.PyFS?.writeFile(`/configs/${config.name}/config.json`, JSON.stringify(config));
          subscriber.complete();
        }
      catch (err) {
      console.error(err);
      subscriber.error(err);
      }
    });

    return concat(this.mountAndSync("configs"), concat(storeConfigObserv, this.unmountAndSync("configs")));
  }

  // TODO: Glaube config wird aktuell noch in normales Verzeichnis geschrieben
  // Müsste geändert werden, sodass in external config geschrieben
  getConfig(lessonName: string) {
    const getConfigObservable = new Observable<ConfigObject>(subscriber => {

      try {
        const config = this.PyFS?.readFile(`/configs/${lessonName}/config.json`);
        
        if (config) {
          const convertedConfig = <ConfigObject>JSON.parse(new TextDecoder().decode(config));       
          subscriber.next(convertedConfig); 
          subscriber.complete()
        } else {
          subscriber.error("No config found!")
        } 
    } catch (err) {
      subscriber.error("Error retrieving config!")
    }})

    return this.mountAndSync("configs")
      .pipe(switchMap(_ => getConfigObservable))
      .pipe(switchMap(config => concat(this.unmountAndSync("configs").pipe(ignoreElements()), of(config))))
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

      concat(this.unmountAndSync(path), this.mountAndSync(config.name), this.storeLesson(zip, config.name), this.sync(false))
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
      console.log(`%cMount and sync ${name}`, "color: green")

      try {
        const fullPath = `/${name}`;
        const node = this.PyFS?.analyzePath(fullPath, false);

        if (!node?.exists) {
          this.PyFS?.mkdir(fullPath);
          this.PyFS?.mount(this.PyFS?.filesystems.IDBFS, {}, fullPath);
          setTimeout(() => {
            this.PyFS?.syncfs(true, err => { // (subscriber.error(err), console.error(err))
              subscriber.next(fullPath); subscriber.complete();
            });
          }, 500)
 
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

  // loops over whole mountpoint and verifies that all modules, readonly and hidden paths have readonly permissions
  // additionally verifies that no external path is present (or deletes it if found)

  // TODO: Refactor so that mergedPaths is already passed as parameter
  checkPermissions(mountpoint: string, onlyCheckExternalPermissions: boolean): void {
   

    const mergedPaths = new Set([...this.HIDDEN_PATHS, ...this.READONLY_PATHS, ...this.MODULE_PATHS]);

    this.testCurrentPath(mountpoint, mergedPaths);

    // muss es halt wieder rekursiv machen nech
    // for all folders, subfolders and files
    //    if abstractCheck(mergedPaths) === true: check if permissions are set
    //        if yes: continue
    //        if no: set permission to readonly (rx)

    //    if is external path: delete
    //    (kann dafür auch abstractCheck nutzen; new Set('/external/' + lessonName))
  }

  mountExternal(): void {
    // TODO: Mount, call checkPermissions for extenral mountpoint
  }

  private testCurrentPath(currentPath: string, mergedPaths: Set<string>) {

    if (!this.isEmpty(currentPath)) {
      const node =  this.getNodeByPath(currentPath);

      if (node) {
        if (!(node.contents instanceof Uint8Array)) {
          const entries = node.contents;

          for (const entry in entries) {
            this.testCurrentPath(`${currentPath}/${entry}`, mergedPaths);
          }
        }

        // check if current node (may be folder or file) needs special permissions
        this.abstractCheck(mergedPaths, currentPath) ? this.setPermissionsReadExecute(currentPath) : {};
      }
    }
  }


  private setPermissionsReadExecute(path: string) {
    try {
      this.PyFS?.chmod(path, 0o500);
    } catch(err) {
      console.error(err);
    }
  }

  // TODO:
  // Die external sachen liegen dann im mountpoint /external/<lessonName>
  // Müssen beim Import da reingeschoben werden und beim export wieder rausgeholt werden
  // Muss beim mounten vorsorligh alle permission einfach setzen
  private abstractCheck(paths: Set<string>, path: string): boolean {
    for (const forbiddenPath of paths) {
      if (path.startsWith(forbiddenPath)) {
        return true;
      }
    }

    return false;
  }

  public isSystemDirectory(path: string): boolean {
    return this.abstractCheck(this.SYSTEM_FOLDERS, path);
  }

  public isHiddenPath(path: string): boolean {
    const res =  this.abstractCheck(this.HIDDEN_PATHS, path);
    return res;
  }

  public isModulePath(path: string): boolean {
    return this.abstractCheck(this.MODULE_PATHS, path);
  }

  unmountAndSync(name: string): Observable<string> {
    console.log(`%c UNMOUNT AND SYNC ${name}"`, "color: blue");

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
      stream?.on("end", () => {});

      stream?.accumulate().then(accumulated => {
        try {
          if (file !== "config.json") {
            this.PyFS?.writeFile(`${name}/${file}`, new Uint8Array(accumulated));
          }      
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

  /* Returns all non-hidden and non-module subfolders and - if requested - files of the given path as seperate arrays */
  scan(path: string, depth: number, includeFiles: boolean) {
    const node = this.getNodeByPath(path);
    
    if (node && !(node.contents instanceof Uint8Array)) {
      return this.scanWithoutFetch(node.contents, path, depth, includeFiles);
    } else {
      return [];
    }
  }

  scanWithoutFetch(entries: FSNode, path: string, depth: number, includeFiles: boolean) {
    const subfolders: FSNode[] = [];
    const filesInFolder: FSNode[] = [];

    Object.entries(entries)
      .filter(([_, value], key) => !this.isHiddenPath(`${path}/${value.name}`) && !this.isModulePath(`${path}/${value.name}`))
      .forEach(([_, value], key) =>  {
      const currentPath = `${path}/${value.name}`;

      if (!this.isSystemDirectory(currentPath) && this.isDirectory(currentPath)) {
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
            if (!this.isSystemDirectory(`${path}${entry}`)) {
              this.fillZip(`${path}${entry}/`, zip, lessonName);
            }
          }
        }
      } else {
        if (!this.isSystemDirectory(path)) {
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
          if (!this.isSystemDirectory(`${path}${entry}`) && !this.isHiddenPath(`${path}${entry}`) && !this.isModulePath(`${path}${entry}`)) {
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
      if (this.isSystemDirectory(name)) {
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
    return concat(folderObs, forkJoin(fileObservables), this.sync(false));
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

  isFile2(path: string): Observable<boolean> {
    return new Observable(subscriber => {
      try {
        const node = this.PyFS?.lookupPath(path, {}).node;
        const isFile = this.PyFS?.isFile((node as FSNode).mode);

        if (isFile !== undefined) {
          subscriber.next(isFile);
          subscriber.complete();
        } else {
          subscriber.error("Error checking file")
        }        
      } catch (e) {
        subscriber.error("Error while checking file");
      }
    })
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

  getNodeByPath2(path: string): Observable<FSNode> {
    return new Observable(subscriber => {
      try {
        const node = (this.PyFS?.lookupPath(path, {}).node as FSNode);
        subscriber.next(node);
        subscriber.complete();
      } catch(e) {
        subscriber.error("No node at specified path");
      }
    });
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

  getFileContent(path: string, _encoding: allowedEncodings): Observable<Uint8Array | string> {
    return new Observable(subscriber => {
      if (!this.isFile(path)) {
        subscriber.error("Path doesn't belong to a file");
      } else {
        try {
          if (this.PyFS) {
            const content = this.PyFS.readFile(path, { encoding: _encoding});
            subscriber.next(content);
            subscriber.complete();
          } else {
            subscriber.error("Error reading file");
          }
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
