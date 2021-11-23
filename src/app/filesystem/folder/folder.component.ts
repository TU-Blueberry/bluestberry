import { Component, ComponentFactory, ComponentFactoryResolver, ComponentRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, ViewContainerRef } from '@angular/core';
import { concat, from, Observable, Subscription } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { EventService } from '../events/event.service';
import { FileComponent } from '../file/file.component';
import { FilesystemService } from '../filesystem.service';

@Component({
  selector: 'app-folder',
  templateUrl: './folder.component.html',
  styleUrls: ['./folder.component.scss']
})
export class FolderComponent implements OnInit, OnDestroy {
  folderFactory: ComponentFactory<FolderComponent>;
  fileFactory: ComponentFactory<FileComponent>;
  showSubfolders = false;
  hasSubfolders = false;
  isActive = false;
  isRenaming = false;
  allSubfolders: Map<string, Array<ComponentRef<FolderComponent>>> = new Map();
  allFiles: Map<string, Array<ComponentRef<FileComponent>>> = new Map(); 
  deleteSubscription: Subscription;
  moveSubscription: Subscription;
  writeSubscription: Subscription;
  activeElementChangeSubscription: Subscription;
  afterCodeExecutionSubscription: Subscription;
  newNodeByUserSubscription: Subscription;
  tentativeNode?: ComponentRef<FolderComponent> | ComponentRef<FileComponent>;
  tentativeNodeSubscription?: Subscription;

  @Input('depth') depth: number = 0;
  @Input('path') path: string = '';
  @Input('parentPath') parentPath: string = '';
  @Input('ref') ref?: FSNode;
  @Input('rootname') rootname?: string;
  @Output() onDeleteRequested: EventEmitter<boolean> = new EventEmitter();
  @ViewChild('subfolders', { read: ViewContainerRef, static: true }) foldersRef!: ViewContainerRef;
  @ViewChild('files', { read: ViewContainerRef, static: true }) filesRef!: ViewContainerRef;
  constructor(private fsService: FilesystemService, private componentFactoryResolver: ComponentFactoryResolver, private ev: EventService) {
    this.folderFactory = this.componentFactoryResolver.resolveComponentFactory(FolderComponent);
    this.fileFactory = this.componentFactoryResolver.resolveComponentFactory(FileComponent);

    this.deleteSubscription = this.ev.onDeletePath.subscribe(this.onDelete.bind(this));
    this.moveSubscription = this.ev.onMovePath.subscribe(this.onPathMove.bind(this));
    this.writeSubscription = this.ev.onWriteToFile.subscribe(this.onWriteToFile.bind(this));
    this.afterCodeExecutionSubscription = ev.afterCodeExecution.subscribe(() => this.checkForNewFolders());
    this.newNodeByUserSubscription = ev.onNewNodeByUser.subscribe(this.onNewNodeByUser.bind(this));

    this.activeElementChangeSubscription = this.ev.onActiveElementChange.subscribe(newActiveElementPath => {
      this.isActive = this.path === newActiveElementPath;
    });
  }

  onDelete(path: string): void {
    if (this.isDirectChild(path)) {
      this.deleteSubcomponent(path);
    }
  }

  // covers newly created files
  onWriteToFile(params: {path: string, bytesWritten: number}) {
    if (this.isDirectChild(params.path) && !this.allFiles.has(params.path)) {
      const node = this.fsService.getNodeByPath(params.path);

      if (node) {
        this.createSubcomponent(true, params.path, node);
      }
    }
  }

  /** New node was just created by the user. To avoid inconsistent states, the temporary (tentative) node is deleted and a fresh
   * node with correct references etc. is inserted
   */
  onNewNodeByUser(params: {path: string, isFile: boolean}): void {
    if (this.isDirectChild(params.path)) {
      this.tentativeNodeDismissal(params.isFile);

      // only necessary for dirs, as nodes are already covered by "onWriteToFile" callback
      // would be obsolete if emscripten were to send onMakeDirectory vevnts
      if (!params.isFile) {
        const newNode = this.fsService.getNodeByPath(params.path);
  
        if (!newNode) {
          console.error("Error, new node is undefined")
          return;
        }
        this.createSubcomponent(params.isFile, params.path, newNode);
      }

      this.ev.changeActiveElement(params.path);
    }
  }

  // sadly, emscripten only uses "onMakeDirectory" callback if it was compiled in debug mode, which pyodide isn't
  // therefore, we need to check for new folders manually after every execution of code
  checkForNewFolders(): void {
    const [subfolders, _] = this.fsService.scan(this.path, this.depth, false);
    
    subfolders.forEach((node, index) => {
      const path = `${this.path}/${node.name}`;

      if (!this.allSubfolders.has(path)) {
        this.createSubcomponent(false, path, node);
      }
    });
  }

  // covers renaming and moving of files/folders
  onPathMove(params: { oldPath: string, newPath: string }): void {
    if (this.isDirectChild(params.newPath)) {
      const newNode = this.fsService.getNodeByPath(params.newPath);
      const isFile = this.fsService.isFile(params.newPath);

      if (newNode) {
        this.createSubcomponent(isFile, params.newPath, newNode);
      } else {
        // TODO: Error
      }
    }

    if (this.isDirectChild(params.oldPath)) {
      this.deleteSubcomponent(params.oldPath);
    }
  }

  // path of a direct child is identical to our path + /<something> at the end
  isDirectChild(pathToCheck: string): boolean {
    const splitPath = pathToCheck.split("/");

    if (splitPath.length > 1) {
      splitPath.splice(splitPath.length - 1, 1);
      return splitPath.join("/") === this.path;
    } else {
      return pathToCheck === this.path;
    }
  }

  ngOnInit(): void {
    // special case: root folder shall always be expanded
    if (this.rootname) {
      this.showSubfolders = true;
    }

    if (this.ref) {
      Object.keys(this.ref.contents).length > 0 ? this.hasSubfolders = true : this.hasSubfolders = false;
      this.createInitial();
    }
  }

  deleteFolder(ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();
    this.fsService.deleteFolder(this.path);
    this.fsService.sync(false).subscribe();
  }

  createSubcomponent(isFile: boolean, path?: string, node?: FSNode): void {  
    let nodeComponentRef;

    if (isFile) {
      nodeComponentRef = this.filesRef.createComponent(this.fileFactory);

      if (path) {
        const currentContent = this.allFiles.get(path) || [];
        this.allFiles.set(path, [...currentContent, nodeComponentRef]);
      } else {
        this.tentativeNodeSubscription = nodeComponentRef.instance.onDeleteRequested.subscribe(isFile => this.tentativeNodeDismissal(isFile));
        this.tentativeNode = nodeComponentRef;
      }
    } else {
      nodeComponentRef = this.foldersRef.createComponent(this.folderFactory);

      if (path) {
        const currentContent = this.allSubfolders.get(path) || [];
        this.allSubfolders.set(path, [...currentContent, nodeComponentRef]);
      } else {
        this.tentativeNodeSubscription = nodeComponentRef.instance.onDeleteRequested.subscribe(isFile => this.tentativeNodeDismissal(isFile));
        this.tentativeNode = nodeComponentRef;
      }
    }

    nodeComponentRef.instance.depth = this.depth + 1;
    nodeComponentRef.instance.path = path || '';
    nodeComponentRef.instance.ref = node;
    nodeComponentRef.instance.parentPath = this.path;

    if (!path && ! node) {
      nodeComponentRef.instance.isRenaming = true;
    }
  }

  tentativeNodeDismissal(isFile: boolean): void {
    if (this.tentativeNode) {
      const ref = isFile ? this.filesRef : this.foldersRef;
      ref.remove(ref.indexOf(this.tentativeNode.hostView));
      this.tentativeNode = undefined;
    }
    
    this.tentativeNodeSubscription?.unsubscribe();
  }

  deleteSubcomponent(path: string): void {
    const isFile = this.allFiles.has(path) ? true : (this.allSubfolders.has(path) ? false : undefined); 
    const allElements = isFile ? this.allFiles : this.allSubfolders;
    const ref = isFile ? this.filesRef : this.foldersRef;
    const elements = allElements.get(path);
  
    if (elements) {
      elements.forEach(element => ref.remove(ref.indexOf(element.hostView)));
      allElements.delete(path);
    }
  }

  createNewFromUI(params: {ev: Event, newFile: boolean}): void {
    params.ev.stopPropagation();
    params.ev.preventDefault();
    this.showSubfolders = true;
    this.createSubcomponent(params.newFile);
  }

  // TODO: Catch errors
  /** Creates components for new subfolders/files and updates existing ones */
  createInitial(): void {
    if (this.path) {
      const [subfolders, filesInFolder] = this.fsService.scan(this.path, this.depth, true);
      subfolders.forEach(subfolder => this.createSubcomponent(false, `${this.path}/${subfolder.name}`, subfolder));
      filesInFolder.forEach(file => this.createSubcomponent(true, `${this.path}/${file.name}`, file));
    }
  }

  toggleSubfolders(ev: Event): void {
    if (this.isRenaming) {
      return;
    }

    this.showSubfolders = !this.showSubfolders;

    if (!this.isActive) {
      this.isActive = !this.isActive;
      this.ev.changeActiveElement(this.path);
    } 
  }

  startRenaming(ev: Event): void {
    ev.stopPropagation();
    ev.preventDefault();
    this.isRenaming = true;
  }

  ngOnDestroy(): void {
    this.foldersRef.clear();
    this.filesRef.clear();
    this.deleteSubscription.unsubscribe();
    this.moveSubscription.unsubscribe();
    this.activeElementChangeSubscription.unsubscribe();
    this.writeSubscription.unsubscribe();
    this.afterCodeExecutionSubscription.unsubscribe();
    this.newNodeByUserSubscription.unsubscribe();
    this.tentativeNodeSubscription?.unsubscribe();
  }

  changeName(params: {newName: string, isFile: boolean}): void {
    this.isRenaming = false;

    if (this.ref) {
      this.fsService.rename(`${this.parentPath}/${this.ref.name}`, `${this.parentPath}/${params.newName}`).subscribe();
    } else {
      if (!params.isFile) {
        this.fsService.createFolder(`${this.parentPath}/${params.newName}`).subscribe(() => {}, err => console.error(err), () => {
          this.ev.createNewNodeByUser(`${this.parentPath}/${params.newName}`, params.isFile);
        });
      }
    }
  }

  dismissNameChange(): void {
    this.isRenaming = false;
    this.onDeleteRequested.emit(false);
  }

  filesChange(ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();

    const fileList = (ev.target as HTMLInputElement)?.files;

    if (fileList) {
      // TODO: Vielleicht kann man die errors irgendwie aggregieren, sodass man nach dem import eine anzeige kriegt, welche Dateien erfolgreich importiert werden
      // konnten und welche nicht (z.B. weil sie schon existieren)
      concat(...Array.from(fileList).map(file => this.creatFileFromBuffer(file))).subscribe(() => {}, 
      err => console.error(err), () =>  console.log("import complete!"));      
    } else {
      // TODO: Error
    }
  }

  creatFileFromBuffer(file: File) {
    return from(file.arrayBuffer()).pipe(
      map(buffer => new Uint8Array(buffer)), 
      switchMap(uintArr => this.fsService.createFile(`${this.path}/${file.name}`, new Uint8Array(uintArr)))
    );
  }

}
