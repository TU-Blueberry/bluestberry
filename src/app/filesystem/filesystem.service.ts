import { Injectable } from '@angular/core';
import * as JSZip from 'jszip';
import { Observable, concat, forkJoin, of, throwError, EMPTY, defer, from, iif, zip } from 'rxjs';
import { ignoreElements, map, switchMap, filter, mergeAll, tap, shareReplay } from 'rxjs/operators';
import { PyodideService } from '../pyodide/pyodide.service';
import { ReplaySubject } from 'rxjs';
import { ConfigObject } from './model/config';
import { FileType, FileTypes } from '../shared/files/filetypes.enum';
import { ExperienceType } from '../lesson/model/experience-type';
import { Experience } from '../lesson/model/experience';

@Injectable({
  providedIn: 'root'
})
export class FilesystemService {
  readonly SYSTEM_FOLDERS = new Set(['/dev', '/home', '/lib', '/proc', '/tmp', '/bin']);
  readonly CUSTOM_FOLDERS = new Set(['/configs', '/sandboxes', '/external'])
  HIDDEN_PATHS = new Set<string>();
  EXTERNAL_PATHS = new Set<string>();
  READONLY_PATHS = new Set<string>();
  MODULE_PATHS = new Set<string>();
  private READONLY_FOLDERS = new Set<string>();
  public test = this.init();

  PyFS?: typeof FS & MissingInEmscripten;
  fsSubject = new ReplaySubject<typeof FS & MissingInEmscripten>(1);

  constructor(private pyService: PyodideService) {
    this.pyService.getAfterExecution().subscribe(() => this.sync(false));
  }

  getFS() {
    return this.fsSubject;
  }

  // wait for pyodide and create all basic folders
  private init() {
    return concat(
      this.pyService.pyodide.pipe(tap(py => { 
        this.PyFS = py.FS; 
        console.log("FS: ", this.PyFS)
        this.fsSubject.next(this.PyFS);
      }), ignoreElements()),
      this.mountAndSync("configs").pipe(ignoreElements()),
      this.exists('/configs/lessons').pipe(
        filter(exists => !exists),
        switchMap(() => this.createFolder('/configs/lessons', false))
      ),
      this.exists('/configs/sandboxes').pipe(
        filter(exists => !exists),
        switchMap(() => this.createFolder('/configs/sandboxes', false))
      ),
      this.unmountAndSync("configs").pipe(ignoreElements())
    ).pipe(shareReplay(1));
  }

  public reset(): Observable<void> {
    return defer(() => {
      this.HIDDEN_PATHS = new Set();
      this.EXTERNAL_PATHS = new Set();
      this.READONLY_PATHS = new Set();
      this.MODULE_PATHS = new Set();
      this.READONLY_FOLDERS = new Set();
    });
  }

  public storeConfig(config: ConfigObject) {
    const configFolderPath = config.type === "LESSON" ? `/configs/lessons/${config.name}` : `/configs/sandboxes/${config.name}`;
    const configFilePath = config.type === "LESSON" ? `/configs/lessons/${config.name}/config.json` : `/configs/sandboxes/${config.name}/config.json`

    const createFolderObservable = this.createFolder(configFolderPath, false)
    const storeConfigObservable = this.createFile(configFilePath, JSON.stringify(config), false);

    return concat(
      this.mountAndSync("configs"), 
      createFolderObservable,
      storeConfigObservable,
      this.unmountAndSync("configs")
    );
  }

  public deleteConfig(config: ConfigObject) {
    return concat(
      this.mountAndSync("configs"), 
      this.deleteFolder(`/configs${config.type === 'SANDBOX' ? '/sandboxes' : ''}/${config.name}`, false),
      this.unmountAndSync("configs")
    );
  }

  // TODO: If sync fails: try to revert everyhting
  // i.e. add back chmod, remove folder etc.

  // TODO: In eigenen Config Service auslagern
  public getConfigByExperience(exp: Experience): Observable<ConfigObject> {
     return concat(
      this.mountAndSync("configs").pipe(ignoreElements()), 
      this.getSingleConfig(exp.name, exp.type).pipe(switchMap(config => 
        concat(
          this.unmountAndSync("configs").pipe(ignoreElements()),
          of(config)
        )
      ))
    )
  }

  private getSingleConfig(name: string, type: ExperienceType) {
    return this.getFileAsBinary(`/configs/${type === 'LESSON' ? 'lessons' : 'sandboxes'}/${name}/config.json`).pipe(
      map(config => <ConfigObject>JSON.parse(new TextDecoder().decode(config))))
  }

  private getAllConfigsOfType(type: ExperienceType): Observable<ConfigObject[]> {
    const path = `/configs/${type === 'LESSON' ? 'lessons' : 'sandboxes'}`;

    return this.getNodeByPath(path).pipe(
      switchMap(node => iif(() => Object.keys(node.contents).length > 0, 
        forkJoin(Object.keys(node.contents).map(name => this.getSingleConfig(name, type))),
        of([]))
      )
    )
  }

  public getAllConfigs(): Observable<ConfigObject[]>{
  return concat(
      this.mountAndSync("configs").pipe(ignoreElements()), 
      zip(
        this.getAllConfigsOfType("LESSON"),
        this.getAllConfigsOfType("SANDBOX")
      ).pipe(
        switchMap(([lessonConfigs, sandboxConfigs]) => 
          concat(
            this.unmountAndSync("configs").pipe(ignoreElements()),
            of([...lessonConfigs, ...sandboxConfigs])
          )
        )
      )
    );
  }

  /** Returns true if a config with the given name exists, false otherwise */
  public isNewLesson(name: string): Observable<boolean> {
    return concat(
      this.mountAndSync("configs").pipe(ignoreElements()), 
      this.exists(`/configs/lessons/${name}/config.json`).pipe(switchMap(exists => {
        return concat(
          this.unmountAndSync("configs").pipe(ignoreElements()), 
          of(!exists)
        )
      }))
    )
  }

  private _sync(fromPersistentToVirtual: boolean): Observable<void> {
    return new Observable(subscriber => {
      let r = (Math.random() + 1).toString(36).substring(7);
      console.log("Sync start! " + r)

      if (!this.PyFS) {
        subscriber.error("FS error");
      }

      try {
        this.PyFS!.syncfs(fromPersistentToVirtual, err => {          
          err ? (console.log(err), subscriber.error("Couldn't complete sync")) : (console.log("Sync complete! " + r), subscriber.complete());
        });
      } catch (e) {
        subscriber.error("Error while syncing the filesystem");
      }
    });
  }

  // workaround to fix sync issue for folders with no write permissions
  public sync(fromPersistentToVirtual: boolean): Observable<void> {
    return concat(
      this.chmodFolders(true),
      this._sync(fromPersistentToVirtual),
      this.chmodFolders(false)
    )
  }

  private chmodFolders(addWritePermission: boolean) {
    return new Observable<void>(subscriber => {
      const mode = addWritePermission ? 0o777 : 0o555;
      Array.from(this.READONLY_FOLDERS).forEach(path => { 
        this.chmod(path, mode);
      });
      subscriber.complete();
    });
  }

  public importLesson(existsAlready: boolean, config: ConfigObject, zip?: JSZip): Observable<void> {
    const path = `/${config.name}`;

    const preReq: Observable<void> = new Observable(subscriber => {
      if (!zip || !config.name) {
        subscriber.error("No zip provided or invalid configuration file");
        return;
      }
      subscriber.complete()
    });

    return concat(
      preReq.pipe(filter(() => existsAlready === true)).pipe(map(() => this.deleteFolder(path, false))),
      this.unmountAndSync(path),
      this.mountAndSync(config.name),
      this.storeLesson(zip!, config.name),
      this.sync(false)
    );
  }

  public mountAndSync(name: string): Observable<void> {
    const fullPath = name.startsWith("/") ? name : `/${name}`;

    return this.exists(fullPath).pipe(switchMap(exists => { // mkdir, mount, sync
      return exists === true ? throwError(`Path ${name} already exists`) :
        concat(
          defer(() => this.N_mkdir(fullPath)),
          defer(() => this.mount(fullPath)),
          this.sync(true)
        )
      }))
  }

  // TODO: Doesn't work yet
  // Probably just delete all contents + config and leave idb orphaned
  public deleteIDB(name: string): Observable<void> {
    return new Observable<void>(subscriber => {
      const req = (this.PyFS! as any).indexedDB().deleteDatabase(name);
      req.onsuccess = () => subscriber.complete()
      req.onerror = (err:any) => subscriber.error(err),
      req.onblocked = (err: any) => subscriber.error(err)
    });
  }

  // loops over whole mountpoint and verifies that all modules and readonly paths have readonly permissions
  // additionally verifies that no external path is present (or deletes it if found)
  public checkPermissions(mountpoint: string, onlyCheckExternalPermissions: boolean): Observable<void> {
    console.log("Check permissions for mountpoint " + mountpoint);
    const mergedPaths = new Set([...this.READONLY_PATHS, ...this.MODULE_PATHS]);
    
    return this.getNodeByPath(mountpoint).pipe(
      switchMap(node => this.testCurrentPath(node, mountpoint, mergedPaths))
    )

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
    // TODO: read/write permissions?
  }

  // -----
  private testElementsInCurrentFolder(node: FSNode, currentPath: string, mergedPaths: Set<string>) {
    const obsv = Object.entries(node.contents).map(([name, value]) => this.testCurrentPath(value, `${currentPath}/${name}`, mergedPaths))
    return forkJoin(obsv).pipe(mergeAll());
  }

  private testCurrentPath(node: FSNode, currentPath: string, mergedPaths: Set<string>): Observable<void> {
    return of(Object.keys(node.contents).length).pipe(
      filter(length => length > 0),
      tap(() => this.setPermissionsReadExecute(currentPath, mergedPaths, node.contents instanceof Uint8Array)),
      switchMap(() => node.contents instanceof Uint8Array ? EMPTY : this.testElementsInCurrentFolder(node, currentPath, mergedPaths))
    );
  }

  private setPermissionsReadExecute(currentPath: string, mergedPaths: Set<string>, isFile: boolean): void {
    if (this.abstractCheck(mergedPaths, currentPath)) {
      isFile ? this.chmod(currentPath, 0o555) : (this.READONLY_FOLDERS.add(currentPath), this.chmod(currentPath, 0o555))
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
    return this.abstractCheck(this.HIDDEN_PATHS, path);
  }

  public isModulePath(path: string): boolean {
    return this.abstractCheck(this.MODULE_PATHS, path);
  }

  public unmountAndSync(name: string): Observable<void> {
    const fullPath = name.startsWith("/") ? name : `/${name}`;

    return this.exists(fullPath).pipe(switchMap(exists => { // sync, unmount, delete
      return !exists ? throwError(`Path ${fullPath} doesnt exist, can't unmount`) :
      concat(
        this.sync(false),
        defer(() => this.unmount(fullPath)),
        defer(() => this.rmdir(fullPath))
      )
    }));
  }

  /* Returns all non-hidden and non-module subfolders and - if requested - files of the given path as seperate arrays */
  public scan(path: string, depth: number, includeFiles: boolean, includeHidden: boolean = false): Observable<FSNode[][]> {
    return this.getNodeByPath(path).pipe(switchMap(node => {
      return node.contents instanceof Uint8Array ? of([]) : this.scanWithoutFetch(node.contents, path, depth, includeFiles, includeHidden);
    }))
  }

  public scanWithoutFetch(node: FSNode, path: string, depth: number, includeFiles: boolean, includeHidden: boolean = false): Observable<FSNode[][]> {
    const subfolders: FSNode[] = [];
    const filesInFolder: FSNode[] = [];

    // remove all hidden paths + all modules + all system directories
    const remainingObjects =  Object.entries(node).filter(([_, value], key) =>
      (includeHidden || !this.isHiddenPath(`${path}/${value.name}`))
      && !this.isModulePath(`${path}/${value.name}`)
      && !this.isSystemDirectory(`${path}/${value.name}`));

    // welp
    // for each remaining object, we get the results from isFile and isDirectory in parallel
    // depending on the results we put the node into the corresponding array
    const test = remainingObjects.map(([_, value], key) =>
      forkJoin([this.isFile(`${path}/${value.name}`), this.isDirectory(`${path}/${value.name}`)])
        .pipe(tap(([isFile, isDirectory]) => isDirectory ? subfolders.push(value) :
          (isFile && !(depth == 0 && value.name === 'config.json') && includeFiles ? filesInFolder.push(value) : {}) )))

    return concat(forkJoin(test).pipe(ignoreElements()), of([subfolders, filesInFolder]));
  }

  // TODO: Move zip stuff to zip service
  // TODO: Rewrite (probably also check if path exists)

  // TODO: Paths have changed! 
  // Lesson: /name
  // sandbox: /sandbox_name
  // lesson config: /configs/lessons/name.json
  // sandbox config: /configs/sandboxes/name.json
  fillZip(path: string, zip: JSZip, lessonName: string) {
    try {
      if (!this.isEmpty(path)) {
        const entries = (this.PyFS?.lookupPath(path, {}).node as FSNode).contents;

        for (const entry in entries) {
          if (this.isFile(`${path}${entry}`)) { // TODO: Is async now!
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

  private getFileAsBuffer(unzippedLesson: JSZip, file: string): Observable<ArrayBuffer>{
    return defer(() => of(unzippedLesson.file(file)?.internalStream("arraybuffer"))).
      pipe(switchMap(stream => {
        return !stream ? throwError("Error reading zip") : from(stream.accumulate())
    }))
  }

  public storeLesson(unzippedLesson: JSZip, name: string): Observable<any> {
    const folders: string[] = [];
    const files: string[] = [];

    unzippedLesson.forEach(entry => {
      if (entry !== `${name}/`) {
        unzippedLesson.file(entry) ? files.push(entry) : folders.push(entry);
      }
    });

    const folderObservables = folders.map(folder => this.createFolder(`${name}/${folder}`, false));
    const fileObservables = files.filter(file => file !== "config.json").map(
      file => this.getFileAsBuffer(unzippedLesson, file).pipe(
      (switchMap(buffer => this.createFile(`${name}/${file}`, new Uint8Array(buffer), false)))));

    return concat(...folderObservables, forkJoin(fileObservables), this.sync(false));
  }

  public isEmpty(path: string): Observable<boolean> {
    return this.basicFactory<boolean>(path, "Error checking whether object is empty or not",
      (node) => { return Object.keys(node.contents).length === 0 }, true
    );
  }

  public isFile(path: string): Observable<boolean> {
    return this.basicFactory<boolean>(path, "Error checking whether path is a file",
      (node) => { return this.N_isFile(node)}, true
    );
  }

  public isDirectory(path: string): Observable<boolean> {
    return this.basicFactory<boolean>(path, "Error checking whether path is a directory",
      (node) => { return this.isDir(node.mode)}, true
    );
  }

  public getNodeByPath(path: string): Observable<FSNode> {
    return this.basicFactory<FSNode>(path, "Error getting node",
      (node) => { return node }, true
    );
  }

  public writeFileTest(path: string, content: Uint8Array | string) {
    return this.basicFactory<void>(path, "Error writing to file", (_) => this.N_writeFile(path, content), false);
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
  public createSymlink(source: string, destination: string): Observable<void> {
    return zip(this.exists(source), this.exists(destination)).pipe(
      switchMap(([oldPathExists, newPathExists]) => 
        (!oldPathExists || newPathExists) ? throwError("Old path doesn't exist or new path is already in use") :
        defer(() => this.N_createSymlink(source, destination))
      )
    )
  }

  public unlinkPath(path: string): Observable<void> {
    return this.exists(path).pipe(switchMap(exists => 
      !exists ? throwError(`Given path ${path} does not exist`) : defer(() => this.N_unlinkPath(path))
    ))
  }

  public changeWorkingDirectory(to: string): Observable<void> {
    return this.exists(to).pipe(switchMap(exists => 
      !exists ? throwError(`Couldn't change working directory (path ${to} doesn't exist)`) : defer(() => this.N_changeWorkingDirectory(to))))
  }

  public writeToFile(path: string, content: Uint8Array | string): Observable<void> {
    const writeObservable =  this.exists(path).pipe(switchMap(exists =>
      !exists ? throwError("File doesn't yet exist. Use createFile instead") :
        (!this.isSystemDirectory(path) ? defer(() => this.writeFileTest(path, content)) : throwError("Can't write to system files"))
      ));

    return concat(writeObservable, this.sync(false));
  }

  public createFile(path: string, content: Uint8Array | string, withSync: boolean): Observable<void> {
    const createFileObservable =  this.exists(path).pipe(switchMap(exists =>
      exists ? throwError(`File ${path} already exists. Use writeFile instead`) :
        (!this.isSystemDirectory(path) ? defer(() => this.writeFileTest(path, content)) : throwError("Can't create file in system directory"))
      ));

    return withSync === true ? concat(createFileObservable, this.sync(false)) : createFileObservable;
  }

  public deleteFile(path: string, withSync: boolean): Observable<void> {
    const deleteFileObservable =  this.basicFactory<void>(path, "Error removing file",
      (node) => this.unlink(path), true
    );

    const full = this.isFile(path).pipe(switchMap(isFile => {
      return isFile ? deleteFileObservable : throwError("Path is not a file");
    }));

    return withSync ? concat(full, this.sync(false)) : full;
  }

  public createFolder(path: string, withSync: boolean, mode?: number): Observable<void> {
    const createFolderObservable = this.exists(path).pipe(switchMap(exists =>
        exists ? throwError("Path is not empty!") :
          (!this.isSystemDirectory(path) ? defer(() => this.N_mkdir(path, mode)) : throwError("Can't create folder in system directory"))
      ));

    return withSync ? concat(createFolderObservable, this.sync(false)) : createFolderObservable;
  }

  public deleteFolder(path: string, withSync: boolean): Observable<void> {
    const deleteFolderObservable = this.isDirectory(path).pipe(switchMap(isDir => {
      return isDir ? this.isEmpty(path) : throwError("Path is not a directory")
    })).pipe(switchMap(isEmpty => {
      return isEmpty && path.split('/').length > 2 ? defer(() => this.rmdir(path)) : // isEmpty and not root directory --> delete
        concat(this.getNodeByPath(path).pipe(switchMap(node => this.deleteEntriesInFolder(node, path))), defer(() => this.rmdir(path))) // else: recursive delete
    }))

    return withSync ? concat(deleteFolderObservable, this.sync(false)) : deleteFolderObservable;
  }

  // for each subnode of current node, check if it is a file and map to corresponding delete observable
  private deleteEntriesInFolder(node: FSNode, path: string) {
    return this.getEntriesOfFolder(node, path).pipe(
      switchMap(entries => entries.map(entry => this.isFile(entry).pipe(
        switchMap(isFile => isFile ? this.deleteFile(entry, false) : this.deleteFolder(entry, false))
      ))), mergeAll())
  }

  private getEntriesOfFolder(node: FSNode, path: string): Observable<string[]>{
    return of(Object.entries(node.contents).map(([key, value]) => `${path}/${value.name}`));
  }

  public getFileAsString(path: string): Observable<string> {
    return this.isFile(path).pipe(switchMap(isFile =>
        isFile ? of(this.N_readFileAsString(path)) : throwError("Given path is no file")
      ));
  }

  public getFileAsBinary(path: string): Observable<Uint8Array> {
    return this.isFile(path).pipe(switchMap(isFile =>
      isFile ? of(this.N_readFileAsBinary(path)) : throwError("Given path is no file")
    ));
  }

  /** Renaming and moving (works for both files and folders) */
  public rename(oldPath: string, newPath: string): Observable<void> {
    const renameObservable = this.exists(newPath).pipe(
      switchMap(exists => {  return !exists ?
          (!this.isSystemDirectory(oldPath) && !this.isSystemDirectory(newPath) ? defer(() => this.N_rename(oldPath, newPath)) : throwError("Can't rename system directories"))
          : throwError("New path is not empty")
      }));

    return concat(renameObservable, this.sync(false));
  }

  // ---- Helper methods

  // T = return type of the observable
  private basicFactory<T>(path: string, errorMsg: string, fn: (node: FSNode) => T, needsToExist: boolean): Observable<T> {
    return new Observable<T>(subscriber => {
      try {
        const analyzeObject = this.N_analyzePath(path);

        if (analyzeObject.exists) {
          if (analyzeObject.object) {
            subscriber.next(fn(analyzeObject.object));
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

  private N_isFile(node: FSNode) {
    this.checkFilesystem();
    return this.PyFS!.isFile(node.mode);
  }

  private N_writeFile(path: string, data: Uint8Array | string) {
    this.checkFilesystem();
    this.PyFS?.writeFile(path, data);
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

  private mount(path: string) {
    console.log("MOUNT ", path)
    this.checkFilesystem();
    this.PyFS?.mount(this.PyFS?.filesystems.IDBFS, {}, path);
  }

  private chmod(path: string, permission: number) {
    this.checkFilesystem();
    // console.log(`Chmod ${path} to ${permission}`)
    this.PyFS?.chmod(path, permission);
  }

  private unmount(path: string) {
    console.log("UNMOUNT ", path)
    this.checkFilesystem();
    this.PyFS?.unmount(path);
  }

  private rmdir(path: string) {
    console.log("RMDIR " + path)
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
