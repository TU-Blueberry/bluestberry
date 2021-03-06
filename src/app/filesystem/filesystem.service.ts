import { Injectable } from '@angular/core';
import * as JSZip from 'jszip';
import { Observable, concat, forkJoin, of, throwError, EMPTY, defer, from, zip, merge, Subject } from 'rxjs';
import { ignoreElements, switchMap, filter, mergeAll, tap, shareReplay, finalize } from 'rxjs/operators';
import { PyodideService } from '../pyodide/pyodide.service';
import { ReplaySubject } from 'rxjs';
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
  EXP_TABINFO_PATH = new Set<string>();

  // Keep track of readonly folders as they need to be adjusted before and after syncing
  private READONLY_FOLDERS = new Set<string>();

  public afterExecutionAndSync$ = new Subject<void>();
  public initFs = this.init();
  PyFS?: typeof FS & MissingInEmscripten;
  fsSubject = new ReplaySubject<typeof FS & MissingInEmscripten>(1);

  constructor(private pyService: PyodideService) {
    // worker will execute code, sync fs to indexeddb and then send a message
    // need to sync indexeddb with fs in main thread before treenodes can get new content
    this.pyService.getAfterExecution().pipe(
      switchMap(_ => this.sync(true).pipe(
        finalize(() => this.afterExecutionAndSync$.next())
      ))
    ).subscribe();
  }

  getFS() {
    return this.fsSubject;
  }

  private init(): Observable<never> {
    return concat(
      this.pyService.pyodide.pipe(tap(py => {
        this.PyFS = py.FS;
        // console.log("FS: ", this.PyFS)
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
      this.EXP_TABINFO_PATH = new Set();
    });
  }

  // sync fs content to idb or vice versa, depending on the  boolean
  private _sync(fromPersistentToVirtual: boolean): Observable<never> {
    return new Observable(subscriber => {
      // helpful to know which sync started and finished if multiple syncs occur concurrently/shortly after each other
      // let r = (Math.random() + 1).toString(36).substring(7);
      // console.log("Sync start! " + r + `(${fromPersistentToVirtual ? 'persistent':'virtual'}---->${fromPersistentToVirtual ? 'virtual':'persistent'})`)

      if (!this.PyFS) {
        subscriber.error("FS error");
      }

      try {
        this.PyFS!.syncfs(fromPersistentToVirtual, err => {     
          err ? (console.log(err), subscriber.error("Couldn't complete sync")) : (
            // console.log("Sync complete! " + r), 
            subscriber.complete());
        });
      } catch (e) {
        subscriber.error("Error while syncing the filesystem");
      }
    });
  }

  // workaround to fix sync issue for folders with no write permissions: remove all permissions before sync, sync, restore permissions
  public sync(fromPersistentToVirtual: boolean): Observable<never> {
    return concat(
      this.chmodFolders(true),
      this._sync(fromPersistentToVirtual),
      this.chmodFolders(false)
    )
  }

  // remove or add write permissions to all readonly folders
  private chmodFolders(addWritePermission: boolean): Observable<never> {
    return defer(() => {
      const mode = addWritePermission ? 0o777 : 0o555;
      Array.from(this.READONLY_FOLDERS).forEach(path => {
        this.chmod(path, mode);
      });
    })
  }

  // mount /<uuid> and sync it
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

  // delete experience (currently only sandboxes)
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

  // after first sync of a new experience, all elements will have write permissions (see l.115, emscripten can't sync readonly folders to indexeddb)
  // therefore, loop over whole fs and remove write permissions where necessary
  public checkPermissionsForExperience(mountpoint: string): Observable<never> {
    const mergedPaths = new Set([...this.EXP_READONLY_PATHS, ...this.EXP_MODULE_PATHS, ...this.EXP_GLOSSARY_PATH, ...this.EXP_HINT_ROOT_PATH]); 
    return this.checkPermissions(mountpoint, mergedPaths);
  }

  // same for global glossary: loop over it, remove write permissions
  public checkPermissionsForGlobalGlossary(): Observable<never> {
    return this.checkPermissions('/glossary', new Set(['/glossary']));
  }

  // loop over whole mountpoint and verify that all modules and readonly paths have readonly permissions
  // would probably need to be revisited if "external" is implemented
  private checkPermissions(mountpoint: string, paths: Set<string>): Observable<never> {  
    return this.getNodeByPath(mountpoint).pipe(
      switchMap(node => this.testCurrentPath(node, mountpoint, paths))
    )
  }

  // check permissions for all subnodes of a node concurrently 
  private testElementsInCurrentFolder(node: FSNode, currentPath: string, mergedPaths: Set<string>): Observable<never> {
    const obsv = Object.entries(node.contents)
        .map(([name, value]) => this.testCurrentPath(value, `${currentPath}/${name}`, mergedPaths))
    return forkJoin(obsv).pipe(mergeAll());
  }

  // check permissions for current node, continue recursion if current node is a folder
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

  // set permissions for current node to rx if it is included in the merged list of readonly paths
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

  // checks whether given path is contained in the set or at least one of the elements starts with the given path
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

  public isTabInfoFolder(path: string): boolean {
    return this.abstractCheck(this.EXP_TABINFO_PATH, path);
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

  public unmount(uuid: string): Observable<never> {
    const fullPath = uuid.startsWith("/") ? uuid : `/${uuid}`;

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
    return this.scan(path, depth, includeFiles, true, true)
  }

  // for search (no hidden files, no modules, no hints, no config, BUT include glossary)
  public scanForSearch(path: string, depth: number, includeFiles: boolean): Observable<FSNode[][]> {
    return this.scan(path, depth, includeFiles, false, true)
  }

  // for filetree/treenode (no hidden files, no modules, no hints, no config, no glossary)
  public scanUser(path: string, depth: number, includeFiles: boolean): Observable<FSNode[][]> {
    return this.scan(path, depth, includeFiles, false, false)
  }

  private scan(path: string, depth: number, includeFiles: boolean, scanAll: boolean, includeGlossary: boolean): Observable<FSNode[][]> {
    return this.getNodeByPath(path).pipe(
      switchMap(node => {
        return this.N_isFile(node) ? of([]) : this.scanWithOutFetch((node.contents as FSNode), path, depth, includeFiles, scanAll, includeGlossary)
      })
    )
  }

  public scanWithOutFetchUser(node: FSNode, path: string, depth: number, includeFiles: boolean): Observable<FSNode[][]> {
    return this.scanWithOutFetch(node, path, depth, includeFiles, false, false);
  }

  // don't need to fetch anything from fs if we already have the node (e.g. when a TreeNode is calling this method)
  // we can just move along the references in the js object
  private scanWithOutFetch(node: FSNode, path: string, depth: number, includeFiles: boolean, scanAll: boolean, includeGlossary: boolean) {
    const subfolders: FSNode[] = [];
    const filesInFolder: FSNode[] = [];

    const remainingObjects = Object.entries(node)
      .filter(([_, value], key) => this.isAllowedPath(`${path}/${value.name}`, scanAll, includeGlossary))

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

  // keep everything if scanAll is set to true
  // else remove all elements which are hidden, modules, system dirs, hints; potentially also remove glossary entries
  public isAllowedPath(path: string, scanAll: boolean, includeGlossary: boolean): boolean {
    return (scanAll || !this.isHiddenPath(path)
              && (scanAll || !this.isModulePath(path))
              && (scanAll || !this.isSystemDirectory(path)
              && (scanAll || !this.isHintPath(path)
              && (scanAll || !this.isTabInfoFolder(path))
              && (scanAll || includeGlossary || !this.isGlossaryPath(path)))))
  }

  private getFileAsBuffer(unzippedLesson: JSZip, file: string): Observable<ArrayBuffer>{
    return of(unzippedLesson.file(file)?.internalStream("arraybuffer")).pipe(
      switchMap(stream => {
        return !stream ? throwError(`Error reading file ${file} from archive`) : from(stream.accumulate())
    }))
  }

  // store all files from the given unzipped experience
  public storeExperience(unzippedExp: JSZip, uuid: string, overwriteConfig: boolean = false): Observable<never> {
    const folders: string[] = [];
    const files: string[] = [];

    unzippedExp.forEach(entry => {
      if (entry !== `${uuid}/`) {
        unzippedExp.file(entry) ? files.push(entry) : folders.push(entry);
      }
    });

    const folderObservables = folders.map(folder => this.createFolder(`/${uuid}/${folder}`, false));
    const fileObservables = files.map(file => this.getFileAsBuffer(unzippedExp, file).pipe(
        switchMap(buffer => {      
         // import may want to overwrite config.json; make sure we only overwrite config.json in the root dir and keep all other config.json's (which may have been created by the user)
          if (overwriteConfig && `/${uuid}/${file}` === `/${uuid}/config.json`) {
            return this.overwriteFile(`/${uuid}/${file}`, new Uint8Array(buffer));
          } else {
            return this.createFile(`/${uuid}/${file}`, new Uint8Array(buffer), false)
          } 
        })
      )
    );

    // create all folders sequentially (because they might be nested), then create all files in parallel
    return concat(
      ...folderObservables, 
      merge(...fileObservables)
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

  // could probably also be solved using the factory?
  public exists(path: string) {
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
        throwError(`File ${path} doesn't exist yet. Use createFile instead`) :
        (!this.isSystemDirectory(path) ? 
          this.writeFileTest(path, content, mode) : 
          throwError("Can't write to system files")
        )
      )
    );

    return withSync ? concat(writeObservable, this.sync(false)) : writeObservable;
  }

  // emscripten doesn't care whether file exists or not
  // we expose different methods for creating, overwriting or createOrOverwrite a file
  public overwriteFile(path: string, content: Uint8Array | string, mode?: number, withSync?: boolean): Observable<never> {
    const overwriteObservable = this.isSystemDirectory(path) ?
      throwError("Can't write to system files") :
      defer(() => {
        this.chmod(path, 0o777); // should probably set to old mode again?
        this.N_writeFile(path, content, mode);
      })

    return (withSync && withSync === true) ? concat(overwriteObservable, this.sync(false)) : overwriteObservable;
  }

  public createOrOverwriteFile(path: string, content: Uint8Array | string,  withSync?: boolean, mode?: number): Observable<never> {
    return this.exists(path).pipe(
      switchMap(exists => !exists 
        ? this.createFile(path, content, withSync || false, mode)
        : this.overwriteFile(path, content, mode, withSync)
      )
    )
  }

  public createFile(path: string, content: Uint8Array | string, withSync: boolean, mode?: number): Observable<never> {
    const createFileObservable = this.exists(path).pipe(
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
      (node) => { this.unlink(path)},
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

  public deleteFolder(path: string, withSync: boolean, deleteRootFolder = true, excludedPaths?: string[]): Observable<never> {
    const deleteFolderObservable = this.isDirectory(path).pipe(
      filter(_ => !excludedPaths?.includes(path)),
      switchMap(isDir => isDir ? this.isEmpty(path) : throwError("Path is not a directory"))).pipe(
        switchMap(isEmpty => {
          if (isEmpty && path.split('/').length > 2) {
            return defer(() => this.rmdir(path)) // isEmpty and not root directory --> delete
          } else {
            return concat(
              this.getNodeByPath(path).pipe(
                switchMap(node => this.deleteEntriesInFolder(node, path, excludedPaths))  // else: recursive delete
              ), 
              deleteRootFolder ? defer(() => this.rmdir(path)) : EMPTY ) // finally, delete root if requested
          }
    }))

    return withSync ? concat(deleteFolderObservable, this.sync(false)) : deleteFolderObservable;
  }

  // for each subnode of current node, check if it is a file and map to corresponding delete observable
  private deleteEntriesInFolder(node: FSNode, path: string, excludedPaths?: string[]): Observable<never> {
    return this.getEntriesOfFolder(node, path).pipe(
      switchMap(entries =>
        entries.filter(entry => !excludedPaths?.includes(entry))
          .map(entry => this.isFile(entry).pipe(
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
          return throwError(`Path ${path} is not a file`)
        }
      }
    ));
  }

  public getFileAsBinary(path: string): Observable<Uint8Array> {
    return this.isFile(path).pipe(
      switchMap(isFile => isFile ? 
        of(this.N_readFileAsBinary(path)) : 
        throwError(`Path ${path} is not a file`)
    ));
  }

  // just calling the original emscripten fs function, no wrapping in observable
  // necessary for custom markdown rendering as it doesn't support async stuff
  public getFileAsBinarySync(path: string): Uint8Array {
    return this.N_readFileAsBinary(path);    
  }

  /** Renaming and moving (works for both files and folders) */
  public rename(oldPath: string, newPath: string): Observable<never> {
    const renameObservable = this.exists(newPath).pipe(
      switchMap(exists => { 
        if (!exists) {
          if (!this.isSystemDirectory(oldPath) && !this.isSystemDirectory(newPath)) {
            return concat(defer(() => {
              // Need to adjust paths before renaming because renaming-event will reach TreeNode first
              // TreeNode will then call fetchWithoutScanUser (which uses the updated paths)
              this.adjustPathsBeforeRenaming(oldPath, newPath);
              this.N_rename(oldPath, newPath);
            }))
          } else {
            return throwError("Can't rename system directories")
          } 
        } else {
          return throwError("New path is not empty")
        }
      }));

    return concat(renameObservable, this.sync(false));
  }

  // replace all occurences of oldPath by newPath in every set
  private adjustPathsBeforeRenaming(oldPath: string, newPath: string): void {
    const sets = [
      this.EXP_HIDDEN_PATHS,
      this.EXP_EXTERNAL_PATHS,
      this.EXP_READONLY_PATHS, 
      this.EXP_MODULE_PATHS,
      this.READONLY_FOLDERS,
      this.EXP_GLOSSARY_PATH,
      this.EXP_HINT_ROOT_PATH,
      this.EXP_TABINFO_PATH
    ];
    
    sets.forEach(set => {
      // only iterate once by using array (instead of set.remove + set.add as this causes inifinte loop [e.g. path -> path1, path1 -> path11 etc.])
      const arr = [...set];
      const updatedPaths = arr.map(path => {
        return path.startsWith(oldPath)
          ? path.replace(oldPath, newPath)
          : path
      })
  
      set.clear();
      updatedPaths.forEach(path => set.add(path));
    })
  }

  // ---- Helper methods

  // checks whether a given path exists and corresponds to an object we can access/manipulate. if yes, the given function is called with the object as a parameter 
  // and its result passed to subscriber.next()
  // since many functions (isEmpty, isFile, isDirectory, getNodeByPath etc.) would need to perform these checks beforehand anyways it seemed
  // like a good idea to do it this way 
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
    this.checkFilesystem();
    this.PyFS?.mount(this.PyFS?.filesystems.IDBFS, {}, path);
  }

  private chmod(path: string, permission: number) {
    this.checkFilesystem();
    this.PyFS?.chmod(path, permission);
  }

  private N_unmount(path: string) {
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

  private N_createSymlink(oldPath: string, newPath: string) {
    this.checkFilesystem();
    this.PyFS!.symlink(oldPath, newPath);
  }

  private N_unlinkPath(path: string) {
    this.checkFilesystem();
    this.PyFS!.unlink(path);
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

  // idea: Fetch from server (browser cache), unzip, delete everything in mountpoint, store everything from zip, sync
  resetLesson(): void {

  }

  getFileType(path: string): FileType {
    const extension = path.split(".");
    const trimmedExtension = extension[extension.length - 1];
    return FileTypes.getType(trimmedExtension);
  }

  getExtension(name: string): string {
    const extension_match = name.split(".");
    return extension_match.length > 1 ? extension_match[extension_match.length - 1].toUpperCase() : '';
  }
}
