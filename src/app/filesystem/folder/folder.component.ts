import { Component, ComponentFactory, ComponentFactoryResolver, ComponentRef, Input, OnDestroy, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { Subscription } from 'rxjs';
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
  additionalData?: AnalyzeObject;
  hasSubfolders = false;
  isActive = false;
  allSubfolders: Map<string, Array<ComponentRef<FolderComponent>>> = new Map();
  allFiles: Map<string, Array<ComponentRef<FileComponent>>> = new Map();
  deleteSubscription: Subscription;
  moveSubscription: Subscription;
  writeSubscription: Subscription;
  activeElementChangeSubscription: Subscription;
  afterCodeExecutionSubscription: Subscription;

  @Input('depth') depth: number = 0;
  @Input('path') path: string = '';
  @Input('ref') ref!: FSNode;
  @Input('rootname') rootname?: string;
  @ViewChild('subfolders', { read: ViewContainerRef, static: true }) foldersRef!: ViewContainerRef;
  @ViewChild('files', { read: ViewContainerRef, static: true }) filesRef!: ViewContainerRef;
  constructor(private fsService: FilesystemService, private componentFactoryResolver: ComponentFactoryResolver, private ev: EventService) {
    this.folderFactory = this.componentFactoryResolver.resolveComponentFactory(FolderComponent);
    this.fileFactory = this.componentFactoryResolver.resolveComponentFactory(FileComponent);

    this.deleteSubscription = this.ev.onDeletePath.subscribe(this.onDelete.bind(this));
    this.moveSubscription = this.ev.onMovePath.subscribe(this.onPathMove.bind(this));
    this.writeSubscription = this.ev.onWriteToFile.subscribe(this.onWriteToFile.bind(this));
    this.afterCodeExecutionSubscription = ev.afterCodeExecution.subscribe(() => this.checkForNewFolders());

    this.activeElementChangeSubscription = this.ev.onActiveElementChange.subscribe(newActiveElementPath => {
      if (this.path !== newActiveElementPath) {
        this.isActive = false;
      }
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
        this.createSubcomponent(params.path, true, node);
      }
    }
  }

  // sadly, emscripten only uses "onMakeDirectory" if it was compiled in debug mode, which pyodide isn't
  // therefore, we need to do it manually after every execution of code inside pyodide
  checkForNewFolders(): void {
    const [subfolders, _] = this.fsService.scan(this.path, this.depth, false);
    
    subfolders.forEach((node, index) => {
      const path = `${this.path}/${node.name}`;

      if (!this.allSubfolders.has(path)) {
        this.createSubcomponent(path, false, node);
      }
    });
  }

  // covers renaming and moving of files/folders
  onPathMove(params: { oldPath: string, newPath: string }): void {
    if (this.isDirectChild(params.newPath)) {
      const newNode = this.fsService.getNodeByPath(params.newPath);
      const isFile = this.fsService.isFile(params.newPath);

      if (newNode) {
        this.createSubcomponent(params.newPath, isFile, newNode);
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

    Object.keys(this.ref.contents).length > 0 ? this.hasSubfolders = true : this.hasSubfolders = false;
    this.createInitial();
  }

  deleteFolder(ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();
    this.fsService.deleteFolder(this.path);
    this.fsService.sync(false).subscribe();
  }

  createSubcomponent(path: string, isFile: boolean, node: FSNode): void {  
    let nodeComponentRef: ComponentRef<FileComponent> | ComponentRef<FolderComponent>;

    if (isFile) {
      nodeComponentRef = this.filesRef.createComponent(this.fileFactory);
      const currentContent = this.allFiles.get(path) || [];
      this.allFiles.set(path, [...currentContent, nodeComponentRef]);
    } else {
      nodeComponentRef = this.foldersRef.createComponent(this.folderFactory);
      const currentContent = this.allSubfolders.get(path) || [];
      this.allSubfolders.set(path, [...currentContent, nodeComponentRef]);
    }

    nodeComponentRef.instance.depth = this.depth + 1;
    nodeComponentRef.instance.path = path;
    nodeComponentRef.instance.ref = node;
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

  // TODO: Catch errors
  /** Creates components for new subfolders/files and updates existing ones */
  createInitial(): void {
    const [subfolders, filesInFolder] = this.fsService.scan(this.path, this.depth, true);
    subfolders.forEach(subfolder => this.createSubcomponent(`${this.path}/${subfolder.name}`, false, subfolder));
    filesInFolder.forEach(file => this.createSubcomponent(`${this.path}/${file.name}`, true, file));
  }

  toggleSubfolders(ev: Event): void {
    this.showSubfolders = !this.showSubfolders;

    if (!this.isActive) {
      this.isActive = !this.isActive;
      this.ev.changeActiveElement(this.path);
    } 
  }

  ngOnDestroy(): void {
    this.foldersRef.clear();
    this.filesRef.clear();
    this.deleteSubscription.unsubscribe();
    this.moveSubscription.unsubscribe();
    this.activeElementChangeSubscription.unsubscribe();
    this.writeSubscription.unsubscribe();
    this.afterCodeExecutionSubscription.unsubscribe();
  }
}
