import { Component, ComponentFactory, ComponentFactoryResolver, ComponentRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, ViewContainerRef } from '@angular/core';
import { concat, from, Subscription } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { UiEventsService } from 'src/app/ui-events.service';
import { FilesystemEventService } from '../events/filesystem-event.service';
import { FileComponent } from '../file/file.component';
import { FilesystemService } from '../filesystem.service';
import { TreeNode } from '../tree-node';

@Component({
  selector: 'app-folder',
  templateUrl: './folder.component.html',
  styleUrls: ['./folder.component.scss']
})
export class FolderComponent implements OnInit, OnDestroy {
  folderFactory: ComponentFactory<FolderComponent>;
  fileFactory: ComponentFactory<FileComponent>;
  allSubfolders: Map<string, Array<ComponentRef<FolderComponent>>> = new Map();
  allFiles: Map<string, Array<ComponentRef<FileComponent>>> = new Map(); 

  showSubfolders = false;
  isRenaming = false;
  public _node: TreeNode; 

  tentativeNode?: ComponentRef<FolderComponent> | ComponentRef<FileComponent>;
  tentativeNodeSubscription?: Subscription;

  @Input('node') set node(node: TreeNode) {
    this._node = node;
    this.clear();
    this.addListeners();

    if(!this._node.isNewNode) {
      this.createTree();
    } else {
      console.log("IS new node!")
    }
  }

  @Output() onDeleteRequested: EventEmitter<boolean> = new EventEmitter();
  @ViewChild('subfolders', { read: ViewContainerRef, static: true }) foldersRef?: ViewContainerRef;
  @ViewChild('files', { read: ViewContainerRef, static: true }) filesRef?: ViewContainerRef;
  constructor(private uiEv: UiEventsService, private fsService: FilesystemService, private componentFactoryResolver: ComponentFactoryResolver, private ev: FilesystemEventService, ) {
    this._node = new TreeNode(this.uiEv, this.fsService, this.ev);
    this.folderFactory = this.componentFactoryResolver.resolveComponentFactory(FolderComponent);
    this.fileFactory = this.componentFactoryResolver.resolveComponentFactory(FileComponent);    

  }

  private clear(): void {
    this.foldersRef?.clear();
    this.filesRef?.clear();
    this.allSubfolders.clear();
    this.allFiles.clear();
  }

  private addListeners(): void {
    this._node?.onDelete().subscribe(path => this.deleteSubcomponent(path));
    this._node?.addNewFilesListener(this.allFiles).subscribe(params => this.createSubcomponent(true, params.path, params.node));
    this._node?.addAfterCodeExecutionListener().subscribe(() => this.checkForNewFolders());
    this._node?.pathMoveOldPath().subscribe(params => this.deleteSubcomponent(params.oldPath));
    this._node?.pathMoveNewPath().subscribe(params => this.createSubcomponent(params.isFile, params.newPath, params.node));
    this._node?.onNewNodeByUser().subscribe(params => this.onNewNodeByUser(params));
  }

  // sadly, emscripten only uses "onMakeDirectory" callback if it was compiled in debug mode, which pyodide isn't
  // therefore, we need to check for new folders manually after every execution of code
  private checkForNewFolders() {
    this._node?.getSubfolders()
      .filter(wrapper => !this.allSubfolders.has(wrapper.path))
      .forEach(element => this.createSubcomponent(false, element.path, element.node));
  }

  private createFiles() {
    this._node?.getFiles().forEach(element => this.createSubcomponent(true, element.path, element.node));
  }

  private createTree() {
    this.checkForNewFolders();
    this.createFiles();
  }

  /** New node was just created by the user. To avoid inconsistent states, the temporary (tentative) node is deleted and a fresh
   * node with correct references etc. is inserted
   */
  onNewNodeByUser(params: {path: string, isFile: boolean}): void {
    console.log("NEW NODE BY USER", params)
    this.tentativeNodeDismissal(params.isFile);

    // only necessary for dirs, as nodes are already covered by "onWriteToFile" callback
    // would be obsolete if emscripten were to send onMakeDirectory vevnts
    if (!params.isFile ) {
      const newNode = this.fsService.getNodeByPath(params.path);

      if (newNode) {
        this.createSubcomponent(params.isFile, params.path, newNode);
        this.uiEv.changeActiveElement(params.path);
      }
    }
  } 

  ngOnInit(): void {
    // special case: root folder shall always be expanded
    if (this._node.isRoot) {
      this.showSubfolders = true;
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

  private createSubcomponentFolder(path?: string, node?: FSNode): void {
    if (this.foldersRef) {
      const nodeComponentRef = this.foldersRef.createComponent(this.folderFactory);

      if (path) {
        const currentContent = this.allSubfolders.get(path) || [];
        this.allSubfolders.set(path, [...currentContent, nodeComponentRef]);
      } else {
        this.tentativeNodeSubscription = nodeComponentRef.instance.onDeleteRequested.subscribe(isFile => this.tentativeNodeDismissal(isFile));
        this.tentativeNode = nodeComponentRef;
      }

      this.setInitialValuesForNewTreeNode(nodeComponentRef, path, node);
    }
  }

  private createSubcomponentFile(path?: string, node?: FSNode): void {
    if (this.filesRef) {
      const nodeComponentRef = this.filesRef.createComponent(this.fileFactory);

      if (path) {
        const currentContent = this.allFiles.get(path) || [];
        this.allFiles.set(path, [...currentContent, nodeComponentRef]);
      } else {
        this.tentativeNodeSubscription = nodeComponentRef.instance.onDeleteRequested.subscribe(isFile => this.tentativeNodeDismissal(isFile));
        this.tentativeNode = nodeComponentRef;
      }

      this.setInitialValuesForNewTreeNode(nodeComponentRef, path, node);
    }   
  }

  setInitialValuesForNewTreeNode(ref: ComponentRef<FolderComponent> | ComponentRef<FileComponent>, path?: string, node?: FSNode): void {
    const treeNode = new TreeNode(this.uiEv, this.fsService, this.ev);
    treeNode.depth = this._node.depth + 1;
    treeNode.parentPath = this._node.path;
    treeNode.path = path || '';
    node ? treeNode.ref = node : {};
    
    ref.instance.node = treeNode;

    if (!path && !node) {
      ref.instance.isRenaming = true;
    } 
  }

  createSubcomponent(isFile: boolean, path?: string, node?: FSNode): void { 
    isFile ? this.createSubcomponentFile(path, node) : this.createSubcomponentFolder(path, node);
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
    const isFile = this.allFiles.has(path) ? true : (this.allSubfolders.has(path) ? false : undefined); 
    const allElements = isFile ? this.allFiles : this.allSubfolders;
    const ref = isFile ? this.filesRef : this.foldersRef;
    const elements = allElements.get(path);
  
    if (elements && ref) {
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

  toggleSubfolders(ev: Event): void {
    if (this.isRenaming) {
      return;
    }

    this.showSubfolders = !this.showSubfolders;

    if (!this._node.isActive) {
      this._node.isActive = !this._node.isActive;
      this.uiEv.changeActiveElement(this._node.path);
    } 
  }

  startRenaming(ev: Event): void {
    console.log("STart renaming!")
    ev.stopPropagation();
    ev.preventDefault();
    this.isRenaming = true;
  }

  ngOnDestroy(): void {
    this.foldersRef?.clear();
    this.filesRef?.clear();
    this._node.destroy();
    this.tentativeNodeSubscription?.unsubscribe();
  }

  changeName(params: {newName: string, isFile: boolean}): void {
    this.isRenaming = false;

    if (!this._node.isNewNode) {
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
      switchMap(uintArr => this.fsService.createFile(`${this._node.path}/${file.name}`, new Uint8Array(uintArr)))
    );
  }
}