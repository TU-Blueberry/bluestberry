import { Component, ComponentFactory, ComponentFactoryResolver, ComponentRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, ViewContainerRef } from '@angular/core';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
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

  showSubfolders = false;
  isRenaming = false;

  @Input('node') _node!: TreeNode; 
  @Output() onDeleteRequested: EventEmitter<boolean> = new EventEmitter();
  @ViewChild('subfolders', { read: ViewContainerRef, static: true }) foldersRef!: ViewContainerRef;
  @ViewChild('files', { read: ViewContainerRef, static: true }) filesRef!: ViewContainerRef;
  constructor(private uiEv: UiEventsService, private fsService: FilesystemService, private ev: FilesystemEventService, private componentFactoryResolver: ComponentFactoryResolver) {
    this.folderFactory = this.componentFactoryResolver.resolveComponentFactory(FolderComponent);
    this.fileFactory = this.componentFactoryResolver.resolveComponentFactory(FileComponent);
  }

  ngOnInit(): void {
    if(this._node && !this._node.isTentativeNode) {    
      this.addListeners();
      const [folders, files] = this.fsService.scan(this._node.path, this._node.depth, true);
      folders.forEach(folder => this.createSubcomponent(false, `${this._node.path}/${folder.name}`,folder));
      files.forEach(file => this.createSubcomponent(true, `${this._node.path}/${file.name}`, file));
    } 

    if (this._node.isRoot) {
      this.showSubfolders = true;
    }

    if (this._node.isTentativeNode) {
      this.isRenaming = true;
    }
  }

  private addListeners(): void {
    this._node.onDelete().subscribe(path => this.deleteSubcomponent(path));
    this._node.addNewFilesListener(this.files).subscribe(params => this.createSubcomponent(true, params.path, params.node));
    this._node.addAfterCodeExecutionListener().subscribe(() => this.checkForNewFolders());
    this._node.pathMoveOldPath().subscribe(params => this.deleteSubcomponent(params.oldPath));
    this._node.pathMoveNewPath().subscribe(params => this.createSubcomponent(params.isFile, params.newPath, params.node));
    this._node.onNewNodeByUser().subscribe(params => this.onNewNodeByUser(params));
  }

  // sadly, emscripten only uses "onMakeDirectory" callback if it was compiled in debug mode, which pyodide isn't
  // therefore, we need to check for new folders manually after every execution of code
  private checkForNewFolders() {
    this._node.getSubfolders()
      .filter(folder => !this.folders.has(folder.path))
      .forEach(folder => this.createSubcomponent(false, folder.path, folder.node));

    if (this._node.isRoot) {
      this._node.checkPermissions(); // set permissions after every execution
    }
  }

  /** New node was just created by the user. To avoid inconsistent states, the temporary (tentative) node is deleted.
   * For folders, a fresh node is inserted directly. New files are already covered by "onWriteToFile" callback */
  onNewNodeByUser(params: {path: string, isFile: boolean}): void {
    this.tentativeNodeDismissal(params.isFile);

    if (!params.isFile ) {
      const newNode = this.fsService.getNodeByPath(params.path);

      if (newNode) {
        this.createSubcomponent(params.isFile, params.path, newNode);
        this.uiEv.changeActiveElement(params.path);
      }
    }
  } 

  deleteFolder(ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();

    if (this._node.path) {
      this.fsService.deleteFolder(this._node.path);
      this.fsService.sync(false).subscribe();
    }
  }

  createSubcomponent(isFile: boolean, path?: string, node?: FSNode): void { 
    const nodeComponentRef = isFile ? this.filesRef.createComponent(this.fileFactory) : this.foldersRef.createComponent(this.folderFactory);  
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
    }
    
    if (this._node) {
      const treeNode = path ? this._node.generateTreeNode(this._node.depth + 1, path, node) : this._node.generateTreeNode(this._node.depth + 1);
      // treeNode.parentPath = this._node.path;
      nodeComponentRef.instance._node = treeNode;
    }     
  }

  tentativeNodeDismissal(isFile: boolean): void {
   if (this.tentativeNode && this.filesRef && this.foldersRef) {
      const ref = isFile ? this.filesRef : this.foldersRef;
      ref.remove(ref.indexOf(this.tentativeNode.hostView));
      this.tentativeNode = undefined;
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

  createNewFromUI(params: {ev: Event, newFile: boolean}): void {
    params.ev.stopPropagation();
    params.ev.preventDefault();
    this.showSubfolders = true;
    this.createSubcomponent(params.newFile);
    this.setActive();
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
        this.fsService.createFolder(`${this._node.parentPath}/${params.newName}`).subscribe(() => {}, err => console.error(err), () => {
          this.ev.createNewNodeByUser(`${this._node.parentPath}/${params.newName}`, params.isFile);
        });
      }
    }
  }

  dismissNameChange(): void {
    this.isRenaming = false;
    this.onDeleteRequested.emit(false);
  }

  onNewFile(files: {name: string, convertedFile: Uint8Array}[]) {
    forkJoin(files.map(file => this.fsService.createFile(`${this._node.path}/${file.name}`, file.convertedFile)))
      .pipe(catchError(error => of(error)))
      .subscribe(
        () => {}, 
        (err) => console.error(err), 
        () => {
          this.setActive();
          this.showSubfolders = true;
        });
  }
}