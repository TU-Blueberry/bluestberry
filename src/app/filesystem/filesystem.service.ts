import { Injectable } from '@angular/core';
import * as JSZip from 'jszip';
import { Observable, concat, forkJoin, of, throwError, EMPTY, defer, from } from 'rxjs';
import { ignoreElements, map, switchMap, filter, mergeAll, tap, delay } from 'rxjs/operators';
import { PyodideService } from '../pyodide/pyodide.service';
import { ReplaySubject } from 'rxjs';
import { ConfigObject } from './model/config';
import { FileType, FileTypes } from '../shared/files/filetypes.enum';

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
      console.log(this.PyFS);
      this.fsSubject.next(this.PyFS);
    });

    this.pyService.getAfterExecution().subscribe(() => this.sync(false));
  }

  getFS() {
    return this.fsSubject;
  }

  public storeConfig(config: ConfigObject) {
    const createFolderObservable = this.createFolder(`/configs/${config.name}`, true);
    const storeConfigObservable = this.createFile(`/configs/${config.name}/config.json`, JSON.stringify(config), false);

    return concat(this.mountAndSync("configs"), createFolderObservable, storeConfigObservable, this.unmountAndSync("configs"));
  }

  // TODO: Glaube config wird aktuell noch zusätzlich in normales Verzeichnis geschrieben
  public getConfig(lessonName: string): Observable<ConfigObject> {
    const getConfigObservable = this.getFileAsBinary(`/configs/${lessonName}/config.json`)
      .pipe(map(config => <ConfigObject>JSON.parse(new TextDecoder().decode(config))))

    return concat(this.mountAndSync("configs").pipe(ignoreElements()), getConfigObservable, this.unmountAndSync("configs").pipe(ignoreElements()))
  }

  /** Lesson exists, if the corresponding dir either already exists OR if we can create the
   * corresponding dir and it is not empty after synching with IDBFS
   */
  public isNewLesson(name: string): Observable<boolean> {
    return concat(
      this.mountAndSync(name).pipe(ignoreElements()), 
      this.isEmpty(`/${name}`),
      this.unmountAndSync(name).pipe(ignoreElements())
    )
  }

  // special case as synfs has some weird behaviour
  public sync(fromPersistentToVirtual: boolean): Observable<void> {

    return new Observable(subscriber => {
      if (!this.PyFS) {
        subscriber.error("FS error");
      }

      try {
        let r = (Math.random() + 1).toString(36).substring(7);

        console.log(`%cSync ${r} start: ${new Date(Date.now()).toISOString()}`, "color: green")
        this.PyFS!.syncfs(fromPersistentToVirtual, err => {
        /* setTimeout(() => {

          }, 1000); */ 
          
          console.log(`%cSync ${r} end: ${new Date(Date.now()).toISOString()}`, "color: green");
          console.log(`Sync complete. (${fromPersistentToVirtual === true ? "Persistent" : "Virtual"} -----> ${fromPersistentToVirtual === true ? "Virtual" : "Persistent"})`);
          console.info(err);
          console.log(this.PyFS?.analyzePath("/", true));
          subscriber.complete();
 
          // TODO: Weird sync behaviour
         /*  if (err) {
            subscriber.error();
          } else {
            subscriber.complete();
          } */
        });
      } catch (e) {
        subscriber.error("Error while syncing the filesystem");
      }
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
      return exists === true ? throwError("Path already exists") :
        concat(
          defer(() => this.N_mkdir(fullPath)),
          defer(() => this.mount(fullPath)),
          this.sync(true)
        )
      }))
  }

  // loops over whole mountpoint and verifies that all modules, readonly and hidden paths have readonly permissions
  // additionally verifies that no external path is present (or deletes it if found)

  // TODO: Refactor so that mergedPaths is already passed as parameter
  public checkPermissions(mountpoint: string, onlyCheckExternalPermissions: boolean): Observable<void> {
    console.log("Checkpermissions for mountpoint " + mountpoint);

    const mergedPaths = new Set([...this.HIDDEN_PATHS, ...this.READONLY_PATHS, ...this.MODULE_PATHS]);
    console.log(mergedPaths)
    return this.testCurrentPath(mountpoint, mergedPaths);

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

  private testElementsInCurrentFolder(node: FSNode, currentPath: string, mergedPaths: Set<string>): Observable<void> {
    return this.getEntriesOfFolder(node, currentPath).pipe(
      switchMap(entries => entries.map(entry => this.testCurrentPath(entry, mergedPaths))),
      mergeAll()
    );
  }

  private testCurrentPath(currentPath: string, mergedPaths: Set<string>): Observable<void> {
    return this.isEmpty(currentPath)
      .pipe(filter(isEmpty => isEmpty === false))
      .pipe(
        tap(() => this.abstractCheck(mergedPaths, currentPath) === true ? this.setPermissionsReadExecute(currentPath) : {}), // check this node
        switchMap(() => this.getNodeByPath(currentPath).pipe( // recursively check all children
          switchMap(node => node.contents instanceof Uint8Array ? EMPTY : this.testElementsInCurrentFolder(node, currentPath, mergedPaths))))
      )
  }


  private setPermissionsReadExecute(path: string) {
    try {
      this.chmod(path, 0o500);
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

  public unmountAndSync(name: string): Observable<void> {
    const fullPath = name.startsWith("/") ? name :  `/${name}`;

    return this.exists(fullPath).pipe(switchMap(exists => { // sync, unmount, delete
      return !exists ? throwError("Path doesnt exist") :
      concat(
        this.sync(false),
        defer(() => this.unmount(fullPath)),
        defer(() => this.rmdir(fullPath))
      )
    }));
  }

  /* Returns all non-hidden and non-module subfolders and - if requested - files of the given path as seperate arrays */
  public scan(path: string, depth: number, includeFiles: boolean): Observable<FSNode[][]> {
    return this.getNodeByPath(path).pipe(switchMap(node => {

    return node.contents instanceof Uint8Array ? of([]) : this.scanWithoutFetch(node.contents, path, depth, includeFiles);
    }))
  }

  public scanWithoutFetch(node: FSNode, path: string, depth: number, includeFiles: boolean): Observable<FSNode[][]> {
      const subfolders: FSNode[] = [];
      const filesInFolder: FSNode[] = [];

      // remove all hidden paths + all modules + all system directories
      const remainingObjects =  Object.entries(node).filter(([_, value], key) =>
        !this.isHiddenPath(`${path}/${value.name}`)
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

      /* Object.entries(node)
        .filter(([_, value], key) => !this.isHiddenPath(`${path}/${value.name}`) && !this.isModulePath(`${path}/${value.name}`))
        .map(([_, value], key) =>  {
        const currentPath = `${path}/${value.name}`;

        if (!this.isSystemDirectory(currentPath) && this.isDirectory(currentPath)) {
          subfolders.push(value);
        }

        if (this.isFile(currentPath) && !(depth == 0 && value.name === 'config.json') && includeFiles) {
          filesInFolder.push(value);
        }
      });  */
  }

  // TODO: Move zip stuff to zip service
  // TODO: Rewrite (probably also check if path exists)
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

  // https://github.com/emscripten-core/emscripten/issues/2602
  /* printRecursively(path: string, startDepth: number, offsetPerLevel: number): void {
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
  } */

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
          subscriber.error("No information about given path copuld be contained");
        }
      } catch (err) {
        subscriber.error("Generic error");
      }
    });
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
      exists ? throwError("File already exists. Use writeFile instead") :
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

        /* if (analyzeObject.exists !== undefined) {
           if (analyzeObject.object) {
            subscriber.next(fn(analyzeObject.object));
            subscriber.complete();
          } else {
            needsToExist ? subscriber.error(`Path "${path} exists but no object could be found`) :
            (subscriber.next(fn(analyzeObject.object)), subscriber.complete());
          }
        } else {
          subscriber.error(`Given path (${path}) does not exist`);
        } */
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
    console.log("Dir created, ", path)
  }

  private mount(path: string) {
    console.log("MOUNT ", path)
    this.checkFilesystem();
    this.PyFS?.mount(this.PyFS?.filesystems.IDBFS, {}, path);
    console.log("%c Here's the root:", "color: blue", this.PyFS?.lookupPath(path, {}).node)

    // Sort -> exp2 -> sort
    // beim ersten mount des zweiten aufrufs von sort ist alles vorhanden, gibt aber fs error (err.code 2)
    // danach verabschiedet es sich dann..

    // library_fs.js: ca. 550 steht was von cdefine, aber kA was die fkt macht
  }

  private chmod(path: string, permission: number) {
    this.checkFilesystem();
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
    console.log("unlink", path)
  }

  private isDir(mode: number) {
    this.checkFilesystem();
    return this.PyFS!.isDir(mode);
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
