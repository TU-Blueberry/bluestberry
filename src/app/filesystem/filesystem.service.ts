import { Injectable } from '@angular/core';
import * as JSZip from 'jszip';
import { Observable, concat, forkJoin, of, throwError, EMPTY, defer, from, zip } from 'rxjs';
import { ignoreElements, switchMap, filter, mergeAll, tap, shareReplay } from 'rxjs/operators';
import { PyodideService } from '../pyodide/pyodide.service';
import { ReplaySubject } from 'rxjs';
import { Config } from 'src/app/experience/model/config';
import { FileType, FileTypes } from '../shared/files/filetypes.enum';

@Injectable({
  providedIn: 'root'
})
export class FilesystemService {
  readonly SYSTEM_FOLDERS = new Set(['/dev', '/home', '/lib', '/proc', '/tmp', '/bin']);
  readonly CUSTOM_FOLDERS = new Set(['/glossary']);
  
  // use sets (even for single values like hint root, glossary path) to avoid pitfalls with empty values
  EXP_HIDDEN_PATHS = new Set<string>();
  EXP_EXTERNAL_PATHS = new Set<string>();
  EXP_READONLY_PATHS = new Set<string>();
  EXP_MODULE_PATHS = new Set<string>();
  EXP_HINT_ROOT_PATH = new Set<string>();
  EXP_GLOSSARY_PATH = new Set<string>();

  // Keep track of readonly folders as they need to be adjusted before and after syncing 
  private READONLY_FOLDERS = new Set<string>(); 
  
  public test = this.init();
  PyFS?: typeof FS & MissingInEmscripten;
  fsSubject = new ReplaySubject<typeof FS & MissingInEmscripten>(1);

  constructor(private pyService: PyodideService) {
    this.pyService.getAfterExecution().subscribe(() => this.sync(false)); // TODO: Funktioniert das?
  }

  getFS() {
    return this.fsSubject;
  }

  private init(): Observable<never> {
    return concat(
      this.pyService.pyodide.pipe(tap(py => { 
        this.PyFS = py.FS; 
        console.log("FS: ", this.PyFS)
        this.fsSubject.next(this.PyFS);
      }), ignoreElements()),
      this.mount("glossary"),
      this.sync(true)
    ).pipe(shareReplay(1));
  }

  public mountManySyncOnce(paths: string[]) {
    return concat(
      ...paths.map(path => this.mount(path)),
      this.sync(true)
    )
  }

  public syncOnceUnmountMany(paths: string[]) {
    return concat(
      this.sync(false),
      ...paths.map(path => this.unmount(path)) 
    )
  }

  public unmountMany(paths: string[]) {
    return concat(
      ...paths.map(path => this.unmount(path))
    )
  }

  public reset(): Observable<never> {
    return defer(() => {
      this.EXP_HIDDEN_PATHS = new Set();
      this.EXP_EXTERNAL_PATHS = new Set();
      this.EXP_READONLY_PATHS = new Set();
      this.EXP_MODULE_PATHS = new Set();
      this.READONLY_FOLDERS = new Set();
      this.EXP_GLOSSARY_PATH = new Set();
      this.EXP_HINT_ROOT_PATH = new Set();
    });
  }

  // TODO: External: <uuid>_external als mountpoint, dann symlink!

  private _sync(fromPersistentToVirtual: boolean): Observable<never> {
    return new Observable(subscriber => {
      let r = (Math.random() + 1).toString(36).substring(7);
      console.log("Sync start! " + r + `(${fromPersistentToVirtual ? 'persistent':'virtual'}---->${fromPersistentToVirtual ? 'virtual':'persistent'})`)

      if (!this.PyFS) {
        subscriber.error("FS error");
      }

      try {
        this.PyFS!.syncfs(fromPersistentToVirtual, err => {     
          console.log("in callback")     
          err ? (console.log(err), subscriber.error("Couldn't complete sync")) : (console.log("Sync complete! " + r), subscriber.complete());
        });
      } catch (e) {
        subscriber.error("Error while syncing the filesystem");
      }
    });
  }

  // workaround to fix sync issue for folders with no write permissions
  public sync(fromPersistentToVirtual: boolean): Observable<never> {
    return concat(
      this.chmodFolders(true),
      this._sync(fromPersistentToVirtual),
      this.chmodFolders(false)
    )
  }

  private chmodFolders(addWritePermission: boolean): Observable<never> {
    return defer(() => {
      const mode = addWritePermission ? 0o777 : 0o555;
      Array.from(this.READONLY_FOLDERS).forEach(path => { 
        this.chmod(path, mode);
      });
    })
  }

  // TODO: siehe rumpf
  public importLesson(existsAlready: boolean, config: Config, zip?: JSZip): Observable<never> {
    const path = `/${config.name}`; // TODO: Hier muss nach Sandbox y/n unterschieden wieder
    // TODO: uuid

    const preReq: Observable<never> = new Observable(subscriber => {
      if (!zip || !config.uuid) {
        subscriber.error("No zip provided or invalid configuration file");
        return;
      }
      subscriber.complete()
    });

    return concat(
      preReq.pipe(
        filter(() => existsAlready === true),
        switchMap(() => this.deleteFolder(path, false))
      ),
      this.unmount(path), // TODO
      this.mount(config.uuid),  
      this.storeLesson(zip!, config.uuid),
      this.sync(false) // TODO
    );
  }

  public mount(uuid: string): Observable<never> {
    const fullPath = uuid.startsWith("/") ? uuid : `/${uuid}`;

    return this.exists(fullPath).pipe(
      switchMap(exists => { 
        return exists === true ? 
          throwError(`Path ${fullPath} already exists`) :
          defer(() => { 
            this.N_mkdir(fullPath);
            this.N_mount(fullPath);
          })
      })
    )
  }

  // emscripten provides no real way of permanently deleting IDBs, see https://github.com/emscripten-core/emscripten/issues/4952
  public deleteIDB(name: string): Observable<never> {
    return new Observable<never>(subscriber => {
      if (!this.PyFS) {
        subscriber.error("No filesystem available");
      }

      // get existing connection so we can close it and delete idb
      const res = Object.entries(this.PyFS!.filesystems.IDBFS.dbs)
                        .filter(([dbName, idb]) => dbName === name);

      if (res.length !== 0) {
        res.forEach(([name, db]) => {
          db.close();
          const req = (this.PyFS! as any).indexedDB().deleteDatabase(name);
          req.onsuccess = () => {
            delete this.PyFS!.filesystems.IDBFS.dbs[name]; 
            subscriber.complete();
          }
          req.onerror = (err:any) => subscriber.error(err),
          req.onblocked = (err: any) => subscriber.error(err)
        });
      }
    });
  }

  public checkPermissionsForExperience(mountpoint: string): Observable<never> {
    const mergedPaths = new Set([...this.EXP_READONLY_PATHS, ...this.EXP_MODULE_PATHS, ...this.EXP_GLOSSARY_PATH, ...this.EXP_HINT_ROOT_PATH]); 
    return this.checkPermissions(mountpoint, mergedPaths);
  }

  public checkPermissionsForGlobalGlossary(): Observable<never> {
    return this.checkPermissions('/glossary', new Set(['/glossary']));
  }

  // loops over whole mountpoint and verifies that all modules and readonly paths have readonly permissions
  // would probably need to be revisited if "external" is implemented
  private checkPermissions(mountpoint: string, paths: Set<string>): Observable<never> {  
    return this.getNodeByPath(mountpoint).pipe(
      switchMap(node => this.testCurrentPath(node, mountpoint, paths))
    )
  }
  
  mountExternal(): void {
    // TODO: Mount, call checkPermissions for extenral mountpoint
    // TODO: read/write permissions?
  }

  /// TODO: mergeAll ist hässlich?
  private testElementsInCurrentFolder(node: FSNode, currentPath: string, mergedPaths: Set<string>): Observable<never> {
    const obsv = Object.entries(node.contents)
        .map(([name, value]) => this.testCurrentPath(value, `${currentPath}/${name}`, mergedPaths))
    return forkJoin(obsv).pipe(mergeAll());
  }

  private testCurrentPath(node: FSNode, currentPath: string, mergedPaths: Set<string>): Observable<never> {  
    return of(Object.keys(node.contents || {}).length).pipe(
      filter(length => length > 0),
      tap(() => this.setPermissionsReadExecute(currentPath, mergedPaths, this.N_isFile(node))),
      switchMap(() =>  {
          if (this.N_isFile(node)) {
            return EMPTY
          } else {
            return this.testElementsInCurrentFolder(node, currentPath, mergedPaths)
          }
      })
    );
  }

  private setPermissionsReadExecute(currentPath: string, mergedPaths: Set<string>, isFile: boolean): void {
    if (this.abstractCheck(mergedPaths, currentPath)) {
      if (isFile) {
        this.chmod(currentPath, 0o555) 
      } else {
        this.READONLY_FOLDERS.add(currentPath);
        this.chmod(currentPath, 0o555)
      }
    }
  }

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
    return this.abstractCheck(this.EXP_HIDDEN_PATHS, path);
  }

  public isModulePath(path: string): boolean {
    return this.abstractCheck(this.EXP_MODULE_PATHS, path);
  }

  public isHintPath(path: string): boolean {
    return this.abstractCheck(this.EXP_HINT_ROOT_PATH, path);
  }

  public isGlossaryPath(path: string): boolean {
    return this.abstractCheck(this.EXP_GLOSSARY_PATH, path);
  }

  public unmount(name: string): Observable<never> {
    const fullPath = name.startsWith("/") ? name : `/${name}`;

    return this.exists(fullPath).pipe(switchMap(exists => { 
      return !exists ? 
        throwError(`Path ${fullPath} doesnt exist, can't unmount`) :
        defer(() => {
          this.N_unmount(fullPath);
          this.rmdir(fullPath);
        })
    }));
  }

  // no restrictions, displays everything (for zip export, hint viewer etc.)
  public scanAll(path: string, depth: number, includeFiles: boolean): Observable<FSNode[][]> {
    return this.scanB(path, depth, includeFiles, true, true)
  }

  // for search (no hidden files, no modules, no hints, no config, BUT include glossary)
  public scanForSearch(path: string, depth: number, includeFiles: boolean): Observable<FSNode[][]> {
    return this.scanB(path, depth, includeFiles, false, true)
  }

  // for filetree/treenode (no hidden files, no modules, no hints, no config, no glossary)
  public scanUser(path: string, depth: number, includeFiles: boolean): Observable<FSNode[][]> {
    return this.scanB(path, depth, includeFiles, false, false)
  }

  private scanB(path: string, depth: number, includeFiles: boolean, scanAll: boolean, includeGlossary: boolean): Observable<FSNode[][]> {
    return this.getNodeByPath(path).pipe(
      switchMap(node => {
        return this.N_isFile(node) ? of([]) : this.scanWithOutFetch((node.contents as FSNode), path, depth, includeFiles, scanAll, includeGlossary)
      })
    )
  }

  public scanWithOutFetchUser(node: FSNode, path: string, depth: number, includeFiles: boolean): Observable<FSNode[][]> {
    return this.scanWithOutFetch(node, path, depth, includeFiles, false, false);
  }

  private scanWithOutFetch(node: FSNode, path: string, depth: number, includeFiles: boolean, scanAll: boolean, includeGlossary: boolean) {
    const subfolders: FSNode[] = [];
    const filesInFolder: FSNode[] = [];

    // keep everything if scanAll is set to true
    // else remove all elements which are hidden, modules, system dirs, hints; potentially also remove glossary entries
    const remainingObjects = Object.entries(node)
      .filter(([_, value], key) => (scanAll || !this.isHiddenPath(`${path}/${value.name}`))
                                    && (scanAll || !this.isModulePath(`${path}/${value.name}`))
                                    && (scanAll || !this.isSystemDirectory(`${path}/${value.name}`))
                                    && (scanAll || !this.isHintPath(`${path}/${value.name}`))
                                    && (scanAll || includeGlossary || !this.isGlossaryPath(`${path}/${value.name}`)));

    // for each remaining object, get the results from isFile and isDirectory in parallel
    // depending on the results we put the node into the corresponding array
    const test = remainingObjects.map(([_, value], key) =>
      forkJoin([this.isFile(`${path}/${value.name}`), this.isDirectory(`${path}/${value.name}`)]).pipe(
        tap(([isFile, isDirectory]) => {
          if (isDirectory) {
            subfolders.push(value)
          } else if (isFile && includeFiles && (scanAll || !(depth === 0 && value.name === 'config.json'))) { // allow files named "config.json" on depths > 0
            filesInFolder.push(value)
          }
        })
      ))

    return concat(
      forkJoin(test).pipe(ignoreElements()),
      of([subfolders, filesInFolder])
    );
  }

  private getFileAsBuffer(unzippedLesson: JSZip, file: string): Observable<ArrayBuffer>{
    return defer(() => of(unzippedLesson.file(file)?.internalStream("arraybuffer"))).pipe(
      switchMap(stream => {
        return !stream ? throwError("Error reading zip") : from(stream.accumulate())
    }))
  }

  public storeLesson(unzippedLesson: JSZip, name: string): Observable<never> {
    const folders: string[] = [];
    const files: string[] = [];

    unzippedLesson.forEach(entry => {
      if (entry !== `${name}/`) {
        unzippedLesson.file(entry) ? files.push(entry) : folders.push(entry);
      }
    });

    const folderObservables = folders.map(folder => this.createFolder(`${name}/${folder}`, false));
    const fileObservables = files
      .map(file => this.getFileAsBuffer(unzippedLesson, file).pipe(
            switchMap(buffer => this.createFile(`${name}/${file}`, new Uint8Array(buffer), false))
          )
      );

    // create all folders sequentially (because they might be nested), then create all files in parallel
    return concat(
      ...folderObservables, 
      forkJoin(fileObservables).pipe(ignoreElements())
    );
  }

  public isEmpty(path: string): Observable<boolean> {
    return this.basicFactory<boolean>(path, 
      "Error checking whether object is empty or not",
      (node) => { return Object.keys(node.contents).length === 0 }
    );
  }

  public isFile(path: string): Observable<boolean> {
    return this.basicFactory<boolean>(path, 
      "Error checking whether path is a file",
      (node) => { return this.N_isFile(node)}
    );
  }

  public isDirectory(path: string): Observable<boolean> {
    return this.basicFactory<boolean>(path, 
      "Error checking whether path is a directory",
      (node) => { return this.isDir(node.mode)},
    );
  }

  public getNodeByPath(path: string): Observable<FSNode> {
    return this.basicFactory<FSNode>(path, 
      "Error getting node",
      (node) => { return node }
    );
  }

  public writeFileTest(path: string, content: Uint8Array | string, mode?: number): Observable<never> {
    return this.basicFactory<never>(path, 
      `Error writing to file ${path}`, 
      (_) => this.N_writeFile(path, content, mode), 
      true,
      false
    );
  }

  // TODO: Könnte ich das mit dem neuen "needsToExist" param der factory nicht auch lösen?
  public exists(path: string) {
    /* return this.basicFactory<FSNode>(path, "Error",
      (node) => { return node }
    ).pipe(catchError(val => of(`I caught: ${val}`)));  */

    return new Observable<boolean>(subscriber => {
      try {
        const analyzeObject = this.N_analyzePath(path);

        if (analyzeObject.exists !== undefined) {
          subscriber.next(analyzeObject.exists);
          subscriber.complete();
        } else {
          subscriber.error("No information about given path could be contained");
        }
      } catch (err) {
        subscriber.error("Generic error");
      }
    });
  }

  /** Creates a symlink node at destination linking to source */
  public createSymlink(source: string, destination: string): Observable<never> {
    return zip(
      this.exists(source), 
      this.exists(destination)
    ).pipe(
      switchMap(([oldPathExists, newPathExists]) => 
        (!oldPathExists || newPathExists) ? 
          throwError("Old path doesn't exist or new path is already in use") :
          defer(() => this.N_createSymlink(source, destination))
      )
    )
  }

  public unlinkPath(path: string): Observable<never> {
    return this.exists(path).pipe(
      switchMap(exists => !exists ? 
        throwError(`Given path ${path} does not exist`) : 
        defer(() => this.N_unlinkPath(path))
    ))
  }

  public changeWorkingDirectory(to: string): Observable<never> {
    return this.exists(to).pipe(
      switchMap(exists => !exists ? 
        throwError(`Couldn't change working directory (path ${to} doesn't exist)`) : 
        defer(() => this.N_changeWorkingDirectory(to))
      )
    )
  }

  public writeToFile(path: string, content: Uint8Array | string, withSync: boolean, mode?: number): Observable<never> {
    const writeObservable =  this.exists(path).pipe(
      switchMap(exists => !exists ? 
        throwError("File doesn't yet exist. Use createFile instead") :
        (!this.isSystemDirectory(path) ? 
          this.writeFileTest(path, content, mode) : 
          throwError("Can't write to system files")
        )
      )
    );

    return withSync ? concat(writeObservable, this.sync(false)) : writeObservable;
  }

  public overwriteFile(path: string, content: Uint8Array | string, mode?: number): Observable<never> {
    return this.isSystemDirectory(path) ?
      throwError("Can't write to system files") :
      defer(() => {
        this.chmod(path, 0o777);
        this.N_writeFile(path, content, mode);
      })
  }

  public createFile(path: string, content: Uint8Array | string, withSync: boolean, mode?: number): Observable<never> {
    const createFileObservable =  this.exists(path).pipe(
      switchMap(exists => exists ? 
        throwError(`File ${path} already exists. Use writeFile instead`) :
        (!this.isSystemDirectory(path) ? 
          this.writeFileTest(path, content, mode) : 
          throwError("Can't create file in system directory")
        )
      )
    );

    return withSync ? concat(createFileObservable, this.sync(false)) : createFileObservable;
  }

  public deleteFile(path: string, withSync: boolean): Observable<never> {
    const deleteFileObservable =  this.basicFactory<never>(path, 
      "Error removing file",
      (node) => this.unlink(path),
      true
    );

    const full = this.isFile(path).pipe(
      switchMap(isFile => isFile ? 
        deleteFileObservable : 
        throwError("Path is not a file")
      )
    );

    return withSync ? concat(full, this.sync(false)) : full;
  }

  public createFolder(path: string, withSync: boolean, mode?: number): Observable<never> {
    const createFolderObservable = this.exists(path).pipe(
      switchMap(exists => exists ? 
        throwError("Path is not empty!") :
        (!this.isSystemDirectory(path) ? 
          defer(() => this.N_mkdir(path, mode)) : 
          throwError("Can't create folder in system directory")
        )
      )
    );

    return withSync ? concat(createFolderObservable, this.sync(false)) : createFolderObservable;
  }

  public deleteFolder(path: string, withSync: boolean): Observable<never> {
    const deleteFolderObservable = this.isDirectory(path).pipe(
      switchMap(isDir => isDir ? 
        this.isEmpty(path) : 
        throwError("Path is not a directory")
      )).pipe(
        switchMap(isEmpty => {
          if (isEmpty && path.split('/').length > 2) {
            return defer(() => this.rmdir(path)) // isEmpty and not root directory --> delete
          } else {
            return concat(
              this.getNodeByPath(path).pipe(
                switchMap(node => this.deleteEntriesInFolder(node, path))
              ), 
              defer(() => this.rmdir(path))) // else: recursive delete
          }
    }))

    return withSync ? concat(deleteFolderObservable, this.sync(false)) : deleteFolderObservable;
  }

  // for each subnode of current node, check if it is a file and map to corresponding delete observable
  public deleteEntriesInFolder(node: FSNode, path: string): Observable<never> {
    return this.getEntriesOfFolder(node, path).pipe(
      switchMap(entries =>
        entries.map(entry => this.isFile(entry).pipe(
          switchMap(isFile => isFile ? 
            this.deleteFile(entry, false) : 
            this.deleteFolder(entry, false))
        ))
      ), mergeAll()
    )
  }

  private getEntriesOfFolder(node: FSNode, path: string): Observable<string[]>{
    return of(Object.entries(node.contents)
                .map(([key, value]) => `${path}/${value.name}`));
  }

  public getFileAsString(path: string): Observable<string> {
    return this.isFile(path).pipe(
      switchMap(isFile => {
        if (isFile) {
          return of(this.N_readFileAsString(path)) 
        } else {
          return throwError("Given path is no file")
        }
      }
      ));
  }

  public getFileAsBinary(path: string): Observable<Uint8Array> {
    return this.isFile(path).pipe(
      switchMap(isFile => isFile ? 
        of(this.N_readFileAsBinary(path)) : 
        throwError("Given path is no file")
    ));
  }

  /** Renaming and moving (works for both files and folders) */
  public rename(oldPath: string, newPath: string): Observable<never> {
    const renameObservable = this.exists(newPath).pipe(
      switchMap(exists => { 
        if (!exists) {
          if (this.isSystemDirectory(oldPath) && !this.isSystemDirectory(newPath)) {
            return defer(() => this.N_rename(oldPath, newPath))
          } else {
            return throwError("Can't rename system directories")
          } 
        } else {
          return throwError("New path is not empty")
        }
      }));

    return concat(renameObservable, this.sync(false));
  }

  // ---- Helper methods

  // T = return type of the observable
  private basicFactory<T>(path: string, errorMsg: string, fn: (node: FSNode) => any, never: boolean = false, needsToExist: boolean = true): Observable<T> {
    return new Observable<T>(subscriber => {
      try {
        const analyzeObject = this.N_analyzePath(path);

        if (analyzeObject.exists) {
          if (analyzeObject.object) {
            if (never) {
              fn(analyzeObject.object);
            } else {
              subscriber.next(fn(analyzeObject.object));
            }

            subscriber.complete();
          } else {
            needsToExist ? subscriber.error(`Path ${path} exists but no corresponding object could be found in the fileystem`) :
            (subscriber.next(fn(analyzeObject.object)), subscriber.complete());
          }
        } else {
          needsToExist ? subscriber.error(`Path ${path} doesn't exist`) :
          (subscriber.next(fn(analyzeObject.object)), subscriber.complete());
        }
      } catch (err) {
        console.error(err);
        subscriber.error(errorMsg);
      }
    });
  }

  // wrappers for emscripten functions for easier use later on
  private N_analyzePath(path: string) {
    this.checkFilesystem();
    return this.PyFS!.analyzePath(path, false);
  }

  public N_isFile(node: FSNode) {
    this.checkFilesystem();
    return this.PyFS!.isFile(node.mode);
  }

  private N_writeFile(path: string, data: Uint8Array | string, mode?: number) {
    this.checkFilesystem();
    this.PyFS?.writeFile(path, data);

    if (mode !== undefined) {
      this.chmod(path, mode);
    }
  }

  private N_readFileAsString(path: string) {
    this.checkFilesystem();
    return this.PyFS!.readFile(path, { encoding: "utf8" });
  }

  private N_readFileAsBinary(path: string) {
    this.checkFilesystem();
    return this.PyFS!.readFile(path, { encoding: "binary" });
  }

  private N_rename(oldPath: string, newPath: string) {
    this.checkFilesystem();
    this.PyFS?.rename(oldPath, newPath);
  }

  private N_mkdir(path: string, mode?: number) {
    this.checkFilesystem();
    mode ? this.PyFS?.mkdir(path, mode) : this.PyFS?.mkdir(path);
  }

  private N_mount(path: string) {
    console.log("MOUNT ", path)
    this.checkFilesystem();
    this.PyFS?.mount(this.PyFS?.filesystems.IDBFS, {}, path);
  }

  private chmod(path: string, permission: number) {
    this.checkFilesystem();
    this.PyFS?.chmod(path, permission);
  }

  private N_unmount(path: string) {
    console.log("UNMOUNT ", path)
    this.checkFilesystem();
    this.PyFS?.unmount(path);
  }

  private rmdir(path: string) {
    this.checkFilesystem();
    this.PyFS?.rmdir(path);
  }

  private unlink(path: string) {
    this.checkFilesystem();
    this.PyFS?.unlink(path);
  }

  private isDir(mode: number) {
    this.checkFilesystem();
    return this.PyFS!.isDir(mode);
  }
  
  // TODO: Additional checks?
  private N_createSymlink(oldPath: string, newPath: string) {
    this.checkFilesystem();
    this.PyFS!.symlink(oldPath, newPath);
  }

  private N_unlinkPath(path: string) {
    this.checkFilesystem();
    this.PyFS!.unlink(path);
    console.log("unlinked " + path)
  }

  private N_changeWorkingDirectory(path: string) {
    this.checkFilesystem();
    this.PyFS!.chdir(path);
  }

  private checkFilesystem(): void {
    if (!this.PyFS) {
      throw new Error("No filesystem available");
    }
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

  getFileType(path: string): FileType {
    const extension = path.split(".");
    const trimmedExtension = extension[extension.length - 1];
    return FileTypes.getType(trimmedExtension);
  }

  getExtension(name: string): string {
    const extension_match = name.split(".");
    return extension_match[extension_match.length - 1].toUpperCase();
  }
}
