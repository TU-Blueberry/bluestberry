import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ComponentFactory, ComponentFactoryResolver, ComponentRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, ViewContainerRef } from '@angular/core';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError, filter, switchMap } from 'rxjs/operators';
import { ConfigService } from 'src/app/shared/config/config.service';
import { UiEventsService } from 'src/app/ui-events.service';
import { FilesystemEventService } from '../events/filesystem-event.service';
import { FileComponent } from '../file/file.component';
import { FilesystemService } from '../filesystem.service';
import { TreeNode } from '../model/tree-node';

@Component({
  selector: 'app-folder',
  templateUrl: './folder.component.html',
  styleUrls: ['./folder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})

// renders information about a single folder in the filetree
// we are given a TreeNode object which is 
// a) either connected to a single node in filesystem (folders only in this case) OR
// b)just a placeholder with no corresponding filesystem entry (in case user is creating a new folder via the UI)
// in any case, every instance of FolderComponent is responsible solely for its TreeNode
export class FolderComponent implements OnInit, OnDestroy {
  // store reference to the components responsible for every folder/file contained in this folder
  files: Map<string, ComponentRef<FileComponent>> = new Map(); 
  folders: Map<string, ComponentRef<FolderComponent>> = new Map();
  folderFactory: ComponentFactory<FolderComponent>;
  fileFactory: ComponentFactory<FileComponent>;
  tentativeNode?: ComponentRef<FolderComponent> | ComponentRef<FileComponent>; // user may create a file or folder from the UI
  tentativeNodeSubscription?: Subscription;
  tentativeNodeIsFile?: boolean;
  subscriptions: Subscription[] = [];

  showSubfolders = false;
  isRenaming = false;
  showContextMenu = false;
  isActive = false;

  offsetX = 0;
  offsetY = 0;

  private _node: TreeNode;

  @Input('node') set node (node: TreeNode) {
    this._node = node;
  } 

  public get node(): TreeNode {
    return this._node;
  }

  @Output() onDeleteRequested: EventEmitter<boolean> = new EventEmitter();
  @Output() onExpandToggle: EventEmitter<boolean> = new EventEmitter();
  @ViewChild('subfolders', { read: ViewContainerRef, static: true }) foldersRef!: ViewContainerRef;
  @ViewChild('files', { read: ViewContainerRef, static: true }) filesRef!: ViewContainerRef;
  constructor(private uiEv: UiEventsService, private fsService: FilesystemService, private ev: FilesystemEventService, 
    private componentFactoryResolver: ComponentFactoryResolver, private cd: ChangeDetectorRef, private conf: ConfigService) {
    this.folderFactory = this.componentFactoryResolver.resolveComponentFactory(FolderComponent);
    this.fileFactory = this.componentFactoryResolver.resolveComponentFactory(FileComponent);
    this._node = new TreeNode(this.uiEv, this.fsService, this.ev, this.conf);
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
      this.uiEv.changeUserInputLocation(this._node.parentPath + `/${this.generateRandomName()}`)
    }
  }

  // see file component
  private generateRandomName(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private init(): void {
    this.addListeners();
    this.fsService.scanUser(this._node.path, this._node.depth, true).subscribe(([folders, files]) => {
      folders.forEach(folder => this.createSubcomponent(false, `${this._node.path}/${folder.name}`, folder));
      files.forEach(file => this.createSubcomponent(true, `${this._node.path}/${file.name}`, file));
    }); 
  }

  // TreeNode handles all the nasty stuff for us, like filtering out which events are relevant for us
  // we only subscribe to its listeners and update the UI accordingly
  private addListeners(): void {
    const deleteSubscription = this._node.onDelete().subscribe(path => this.deleteSubcomponent(path));
    const newFileSubscription = this._node.addNewFilesListener(this.files).subscribe(params => (this.createSubcomponent(true, params.path, params.node), this.cd.detectChanges()));
    const afterCodeSubscription = this._node.addAfterCodeExecutionListener().subscribe(() => this.checkForNewFolders());
    const moveOldPathSubscription = this._node.pathMoveOldPath().subscribe(params => this.deleteSubcomponent(params.oldPath));
    const pathMoveSubscription = this._node.pathMoveNewPath().subscribe(params => (this.createSubcomponent(params.isFile, params.newPath, params.node), this.cd.detectChanges()));
    const newNodeByUserSubscription = this._node.onNewNodeByUser().subscribe(params =>  this.convertTentativeNode(params.path, params.isFile));
    const newNodeByUserSyncedSubscription = this._node.onNewNodeByUserSynced().subscribe(params => this.triggerUpdate(params.path, params.isFile));
    const failedChildSubscription = this._node.failedChild().subscribe(params => this.deleteSubcomponent(params.path));
    const activeElementChangeSubscription = this.uiEv.onActiveElementChange.subscribe(newActiveElementPath => {
      this.isActive = this._node.path === newActiveElementPath
      this.cd.detectChanges();
    });
    const newUserInputSubscription = this._node.onNewUserInputLocation().subscribe((path) => {
      this.isRenaming = false;
      if (this.tentativeNode && this.tentativeNodeIsFile !== undefined) {
        this.tentativeNodeDismissal(this.tentativeNodeIsFile);
      }
      this.cd.detectChanges();
    });
    const closeContextMenuSubscription = this.uiEv.onCloseAllContextMenues.subscribe(() => {
      this.showContextMenu = false;
      this.cd.detectChanges();
    });

    const cancelRenamingSubscription = this.uiEv.onCancelAllRenamingOperations.pipe(
      filter(() => this.isRenaming)
    ).subscribe(() => {
      this.dismissNameChange();
      this.cd.detectChanges();
    })

    this.subscriptions = [deleteSubscription, newFileSubscription, afterCodeSubscription, moveOldPathSubscription, pathMoveSubscription,
    newNodeByUserSubscription, newNodeByUserSyncedSubscription, failedChildSubscription, newUserInputSubscription, closeContextMenuSubscription,
    activeElementChangeSubscription, cancelRenamingSubscription];
  }

  // sadly, emscripten only uses its "onMakeDirectory" callback if it was compiled in debug mode (which pyodide isn't)
  // therefore, we need to check for new folders manually after every execution of code
  // we also have no way of knowing if anything changed, let alone if we are affected by the change (thus all folders have to rescan their children)
  // need to use catchError here as the node that was just deleted will also attempt to scan its children, thus yielding and error as the path doesn't exist anymore
  // (in which case we do nothing as this component will be deleted soon anyways)
  private checkForNewFolders() {
    this._node.getSubfolders().pipe(
      catchError(() => of([]))
    ).subscribe(folders => {
        folders.filter(folder => !this.folders.has(this.getName(folder.path)))
               .forEach(folder => this.createSubcomponent(false, folder.path, folder.node));
        this.cd.detectChanges();
      });
  }

  // called once new node from user is synced to fs
  // corresponding TreeNode is given the actual path and will proceed to fetch the reference from the filesystem
  private triggerUpdate(path: string, isFile: boolean) {
    const element = isFile ? this.files.get(this.getName(path)) : this.folders.get(this.getName(path));

    if (element) {
      const instance = element.instance;
      instance.node.path = path;
      this._node.updateEmptyStatus();

      // set to active if a new folders was created
      if (!isFile) {
        (instance as FolderComponent).init();
        (instance as FolderComponent).setActive();
        (instance as FolderComponent).cd.detectChanges();
      } 

      this.cd.detectChanges();
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
        this.files.set(this.getName(path), <ComponentRef<FileComponent>>this.tentativeNode)
      } else {
        this.folders.set(this.getName(path), <ComponentRef<FolderComponent>>this.tentativeNode);
      }

      this.tentativeNode = undefined;
      this.tentativeNodeIsFile = undefined;
    }
    
    this.tentativeNodeSubscription?.unsubscribe();
    this.cd.detectChanges();
  }

  deleteFolder(ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();

    if (this._node.path) {
      this.fsService.deleteFolder(this._node.path, true).subscribe();
    }
  }

  public findNewPosition(path: string, isFile: boolean, ref: ViewContainerRef): number {
    const refTest = isFile ? this.files : this.folders;
    const sortedKeys = [...refTest.keys(), path]
        .map(path => this.getName(path))  
        .sort((a, b) => a.localeCompare(b));  
    const pathIndex = sortedKeys.indexOf(this.getName(path));

    if (pathIndex > 0) {
      const element = refTest.get(sortedKeys[pathIndex - 1]);
      return element ? ref.indexOf(element.hostView) + 1: 0;
    }

    return 0;
  }

  private getName(path: string): string {
    return path.split('/').pop() || path;
  }

  // create new TreeNode
  // no path = user is in the process of creating a file/folder in the UI, thus making this a tentative node
  // path = node exists in the file system, proceed to create a folder/file component for it
  createSubcomponent(isFile: boolean, path?: string, node?: FSNode): void {   
    const ref = isFile ? this.filesRef : this.foldersRef;
    const insertIndex = path !== undefined ? this.findNewPosition(path, isFile, ref) : 0;

    if (path && ((isFile && this.files.has(this.getName(path))) || (!isFile && this.folders.has(this.getName(path))))) {
      return;
    }

    const nodeComponentRef = isFile ? this.filesRef.createComponent(this.fileFactory, insertIndex) : this.foldersRef.createComponent(this.folderFactory, insertIndex);  
    if (isFile && path) {
      this.files.set(this.getName(path), <ComponentRef<FileComponent>>nodeComponentRef);
    }
    
    if (!isFile && path && !this.folders.has(this.getName(path))) {
      this.folders.set(this.getName(path), <ComponentRef<FolderComponent>>nodeComponentRef);
    }

    if (path === undefined) {
      this.tentativeNodeSubscription = nodeComponentRef.instance.onDeleteRequested.subscribe(isFile => this.tentativeNodeDismissal(isFile));
      this.tentativeNode = nodeComponentRef;
      this.tentativeNodeIsFile = isFile;
    }
    
    if (this._node) {
      const treeNode = path ? this._node.generateTreeNode(this._node.depth + 1, path, node) : this._node.generateTreeNode(this._node.depth + 1);
      treeNode.isGlossary = this._node.isGlossary;
      // treeNode.parentPath = this._node.path;
      nodeComponentRef.instance.node = treeNode;
    }
  }

  // tentative node, i.e. (file or folder) 
  tentativeNodeDismissal(isFile: boolean): void {
   if (this.tentativeNode && this.filesRef && this.foldersRef) {
      const ref = isFile ? this.filesRef : this.foldersRef;
      ref.remove(ref.indexOf(this.tentativeNode.hostView));
      this.tentativeNode = undefined;
      this.tentativeNodeIsFile = undefined;
      this.cd.detectChanges();
    }
    
    this.tentativeNodeSubscription?.unsubscribe();
  }

  deleteSubcomponent(path: string): void {
    const name = this.getName(path);
    const isFile = this.files.has(name) ? true : (this.folders.has(name) ? false : undefined); 
    const allElements = isFile ? this.files : this.folders;
    const ref = isFile ? this.filesRef : this.foldersRef;
    const element = allElements.get(name);

    if (element) {
      ref.remove(ref.indexOf(element.hostView));
      allElements.delete(name);
      element.destroy();
    }

    this.cd.detectChanges();
  }

  createNewFromUI(params: {ev?: Event, isFile: boolean}): void {
    params.ev?.stopPropagation();
    params.ev?.preventDefault();
    this.showSubfolders = true;
    
    // delete current tentative node if it exists (--> only one tentative node at a time allowed)
    if (this.tentativeNode && this.tentativeNodeIsFile !== undefined) {
      this.tentativeNodeDismissal(this.tentativeNodeIsFile);
    }

    this.createSubcomponent(params.isFile);
  }

  toggleSubfolders(ev: Event): void {
    ev.stopPropagation();
    ev.preventDefault();

    if (this.isRenaming) {
      return;
    }

    this.showSubfolders = !this.showSubfolders;
    this.setActive();

    if (this._node.isRoot) {
      this.onExpandToggle.emit(this.showSubfolders);
    }

    this.uiEv.closeAllContextMenues();
    this.uiEv.cancelRenamingGlobally();
  }

  setActive(): void {
    if (this._node && !this.isActive) {
      this.isActive = !this.isActive;
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
    this.tentativeNodeSubscription?.unsubscribe();
    this.filesRef.clear();
    this.foldersRef.clear();
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  // user pressed enter after entering a new name in the input field
  changeName(params: {newName: string, isFile: boolean}): void {
    this.isRenaming = false;

    // check whether it's just renaming of an existing node or creation of a new node
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

    this.cd.detectChanges();
  }

  dismissNameChange(): void {
    this.isRenaming = false;
    this.onDeleteRequested.emit(false);
  }

  // user uploaded a new file using the context menu
  onNewFile(files: { name: string, convertedFile: Uint8Array }[]) {
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

  closeContextMenu(): void {
    this.showContextMenu = false;
    this.cd.detectChanges();
  }

  toggleContextMenu(ev: MouseEvent): void {
    ev.stopPropagation();
    ev.preventDefault();
    this.offsetX = ev.clientX;
    this.offsetY = ev.clientY;

    if (this.showContextMenu) {
      this.showContextMenu = false;
    } else {
      this.uiEv.closeAllContextMenues();
      this.showContextMenu = true;
    }

    this.uiEv.cancelRenamingGlobally();
    this.cd.detectChanges();
  }

  public isEmptyNode(): boolean {
    return this.node.isEmptyNode && !this.node.isTentativeNode && this.tentativeNode === undefined;
  }
}