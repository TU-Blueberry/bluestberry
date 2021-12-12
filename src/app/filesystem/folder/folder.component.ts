import { Component, ComponentFactory, ComponentFactoryResolver, ComponentRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, ViewContainerRef } from '@angular/core';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { UiEventsService } from 'src/app/ui-events.service';
import { FilesystemEventService } from '../events/filesystem-event.service';
import { FileComponent } from '../file/file.component';
import { FilesystemService } from '../filesystem.service';
import { TreeNode } from '../model/tree-node';

@Component({
  selector: 'app-folder',
  templateUrl: './folder.component.html',
  styleUrls: ['./folder.component.scss']
})
export class FolderComponent implements OnInit, OnDestroy {
  files: Map<string, Array<ComponentRef<FileComponent>>> = new Map(); 
  folders: Map<string, Array<ComponentRef<FolderComponent>>> = new Map();
  folderFactory: ComponentFactory<FolderComponent>;
  fileFactory: ComponentFactory<FileComponent>;
  tentativeNode?: ComponentRef<FolderComponent> | ComponentRef<FileComponent>;
  tentativeNodeSubscription?: Subscription;
  tentativeNodeIsFile?: boolean;

  showSubfolders = false;
  isRenaming = false;

  private _node: TreeNode;

  @Input('node') set node (node: TreeNode) {
    this._node = node;
  } 

  public get node(): TreeNode {
    return this._node;
  }

  @Output() onDeleteRequested: EventEmitter<boolean> = new EventEmitter();
  @ViewChild('subfolders', { read: ViewContainerRef, static: true }) foldersRef!: ViewContainerRef;
  @ViewChild('files', { read: ViewContainerRef, static: true }) filesRef!: ViewContainerRef;
  constructor(private uiEv: UiEventsService, private fsService: FilesystemService, private ev: FilesystemEventService, private componentFactoryResolver: ComponentFactoryResolver) {
    this.folderFactory = this.componentFactoryResolver.resolveComponentFactory(FolderComponent);
    this.fileFactory = this.componentFactoryResolver.resolveComponentFactory(FileComponent);
    this._node = new TreeNode(this.uiEv, this.fsService, this.ev);
  }

  ngOnInit(): void {
    if(this._node && !this._node.isTentativeNode) {  
      this.init();
    } 

    if (this._node.isRoot) {
      this.showSubfolders = true;
    }

    if (this._node.isTentativeNode) {
      this.isRenaming = true;
      this.uiEv.changeUserInputLocation(this._node.parentPath + "/new")
    }
  }

  private init(): void {
    this.addListeners();
    this.fsService.scan(this._node.path, this._node.depth, true).subscribe(([folders, files]) => {
      folders.forEach(folder => this.createSubcomponent(false, `${this._node.path}/${folder.name}`,folder));
      files.forEach(file => this.createSubcomponent(true, `${this._node.path}/${file.name}`, file));
    }); 
  }

  // TODO: Symbole für neuen Ordner/neue Datei deaktivieren falls es tentativeNode gibt + normaler cursor on hover
  private addListeners(): void {
    this._node.onDelete().subscribe(path => this.deleteSubcomponent(path));
    this._node.addNewFilesListener(this.files).subscribe(params => this.createSubcomponent(true, params.path, params.node));
    this._node.addAfterCodeExecutionListener().subscribe(() => this.checkForNewFolders());
    this._node.pathMoveOldPath().subscribe(params => this.deleteSubcomponent(params.oldPath));
    this._node.pathMoveNewPath().subscribe(params => this.createSubcomponent(params.isFile, params.newPath, params.node));
    this._node.onNewNodeByUser().subscribe(params =>  this.convertTentativeNode(params.path, params.isFile));
    this._node.onNewNodeByUserSynced().subscribe(params => this.triggerUpdate(params.path, params.isFile));
    this._node.failedChild().subscribe(params => this.deleteSubcomponent(params.path));
    this._node.onNewUserInputLocation().subscribe((path) => {
      this.isRenaming = false;
      if (this.tentativeNode && this.tentativeNodeIsFile !== undefined) {
        this.tentativeNodeDismissal(this.tentativeNodeIsFile);
      }
    });
  }

  // sadly, emscripten only uses its "onMakeDirectory" callback if it was compiled in debug mode (which pyodide isn't)
  // therefore, we need to check for new folders manually after every execution of code
  // we also have no way of knowing if we are even remotely affected (thus all folders have to rescan their children)
  // need to use catchError here as the node that was just deleted will also attempt to scan its children, thus yielding and error as the path doesn't exist anymore
  // in that case, we do nothing as this component will be deleted soon regardless
  private checkForNewFolders() {
    this._node.getSubfolders().pipe(catchError(() => of([]))).subscribe(folders => {
        folders.filter(folder => !this.folders.has(folder.path))
          .forEach(folder => this.createSubcomponent(false, folder.path, folder.node))
      });

    if (this._node.isRoot) {
      this._node.checkPermissions(); // set permissions after every execution
    }
  }

  // called once new node from user is synced to fs
  private triggerUpdate(path: string, isFile: boolean) {
    const elements = isFile ? this.files.get(path) : this.folders.get(path);
    
    if (elements && elements.length > 0) {
      const instance = elements[elements.length - 1].instance;
      instance.node.path = path;
      this._node.updateEmptyStatus();

      if (!isFile) {
        (instance as FolderComponent).init();
        (instance as FolderComponent).setActive();
      } 
    }
  }

  // move node to the correct lexicographic position
  private convertTentativeNode(path: string, isFile: boolean): void {
    if (this.tentativeNode && this.filesRef && this.foldersRef) {
      const viewContainer = isFile ? this.filesRef : this.foldersRef;
      const newIndex = this.findNewPosition(path, isFile, viewContainer);
      const viewRef = this.tentativeNode.hostView;
      viewContainer.move(viewRef, newIndex > 0 ? newIndex - 1 : 0);
      
      if (isFile) {
        this.files.set(path, [<ComponentRef<FileComponent>>this.tentativeNode])
      } else {
        this.folders.set(path, [<ComponentRef<FolderComponent>>this.tentativeNode]);
      }

      this.tentativeNode = undefined;
      this.tentativeNodeIsFile = undefined;
    }
    
    this.tentativeNodeSubscription?.unsubscribe();
  }

  deleteFolder(ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();

    if (this._node.path) {
      this.fsService.deleteFolder(this._node.path, true).subscribe();
    }
  }

  private findNewPosition(path: string, isFile: boolean, ref: ViewContainerRef): number {
    const refTest = isFile ? this.files : this.folders;
    const sortedKeys = [...refTest.keys(), path].sort((a, b) => a.localeCompare(b));  
    const pathIndex = sortedKeys.indexOf(path);

    if (pathIndex > 0) {
      const elements = refTest.get(sortedKeys[pathIndex - 1]);

      if (elements && elements.length > 0) {    
        const lastElement = elements[elements.length - 1];
        return lastElement ? ref.indexOf(lastElement.hostView) + 1: 0;
      }
    }
    
    return 0;
  }

  createSubcomponent(isFile: boolean, path?: string, node?: FSNode): void {
    const ref = isFile ? this.filesRef : this.foldersRef;
    const insertIndex = path !== undefined ? this.findNewPosition(path, isFile, ref) : 0;

    const nodeComponentRef = isFile ? this.filesRef.createComponent(this.fileFactory, insertIndex) : this.foldersRef.createComponent(this.folderFactory, insertIndex);  
    if (isFile && path) {
      const currentContent = this.files.get(path) || [];
      this.files.set(path, [...currentContent, <ComponentRef<FileComponent>>nodeComponentRef]);
    }
    
    if (!isFile && path) {
      const currentContent = this.folders.get(path) || [];
      this.folders.set(path, [...currentContent, <ComponentRef<FolderComponent>>nodeComponentRef]);
    }

    if (!path) {
      this.tentativeNodeSubscription = nodeComponentRef.instance.onDeleteRequested.subscribe(isFile => this.tentativeNodeDismissal(isFile));
      this.tentativeNode = nodeComponentRef;
      this.tentativeNodeIsFile = isFile;
    }
    
    if (this._node) {
      const treeNode = path ? this._node.generateTreeNode(this._node.depth + 1, path, node) : this._node.generateTreeNode(this._node.depth + 1);
      // treeNode.parentPath = this._node.path;
      nodeComponentRef.instance.node = treeNode;
    }     
  }

  tentativeNodeDismissal(isFile: boolean): void {
   if (this.tentativeNode && this.filesRef && this.foldersRef) {
      const ref = isFile ? this.filesRef : this.foldersRef;
      ref.remove(ref.indexOf(this.tentativeNode.hostView));
      this.tentativeNode = undefined;
      this.tentativeNodeIsFile = undefined;
    }
    
    this.tentativeNodeSubscription?.unsubscribe();
  }

  deleteSubcomponent(path: string): void {
    const isFile = this.files.has(path) ? true : (this.folders.has(path) ? false : undefined); 
    const allElements = isFile ? this.files : this.folders;
    const ref = isFile ? this.filesRef : this.foldersRef;
    const elements = allElements.get(path);
  
    if (elements) {
      elements.forEach(element => ref.remove(ref.indexOf(element.hostView)));
      allElements.delete(path);
    }
  }

  createNewFromUI(params: {ev: Event, isFile: boolean}): void {
    params.ev.stopPropagation();
    params.ev.preventDefault();
    this.showSubfolders = true;
    
    // delete current tentative node if it exists (--> only one tentative node at a time allowed)
    if (this.tentativeNode && this.tentativeNodeIsFile !== undefined) {
      this.tentativeNodeDismissal(this.tentativeNodeIsFile);
    }

    this.createSubcomponent(params.isFile);
  }

  toggleSubfolders(ev: Event): void {
    if (this.isRenaming) {
      return;
    }

    this.showSubfolders = !this.showSubfolders;
    this.setActive();
  }

  setActive(): void {
    if (this._node && !this._node.isActive) {
      this._node.isActive = !this._node.isActive;
      this.uiEv.changeActiveElement(this._node.path);
    } 
  }

  startRenaming(ev: Event): void {
    ev.stopPropagation();
    ev.preventDefault();
    this.isRenaming = true;
    this.uiEv.changeUserInputLocation(this._node.path);
  }

  ngOnDestroy(): void {
    this._node.destroy();
    this.tentativeNodeSubscription?.unsubscribe();
    this.filesRef.clear();
    this.foldersRef.clear();
  }

  changeName(params: {newName: string, isFile: boolean}): void {
    this.isRenaming = false;

    if (!this._node.isTentativeNode) {
      this.fsService.rename(`${this._node.parentPath}/${this._node.name}`, `${this._node.parentPath}/${params.newName}`).subscribe();
    } else {
      if (!params.isFile) {
        const newPath = `${this._node.parentPath}/${params.newName}`;
        this.ev.createNewNodeByUser(newPath, params.isFile);
        this._node.name = params.newName;
        this.setActive();

        this.fsService.createFolder(`${this._node.parentPath}/${params.newName}`, true).subscribe(
          () => {},
          err => {this.ev.failedCreationFromUi(newPath, false); console.error(err)},
          () => {this.ev.updateSyncStatusOfTentative(newPath, params.isFile)}
        )
      }     
    }
  }

  dismissNameChange(): void {
    this.isRenaming = false;
    this.onDeleteRequested.emit(false);
  }

  onNewFile(files: {name: string, convertedFile: Uint8Array}[]) {

    forkJoin(files.map(file => this.fsService.createFile(`${this._node.path}/${file.name}`, file.convertedFile, false)))
    .pipe(switchMap(res => this.fsService.sync(false)))
      .subscribe(
        () => {}, 
        (err) => console.error(err), 
        () => {
          this.setActive();
          this.showSubfolders = true;
        });

      // catchError(error => of(error)
  }
}