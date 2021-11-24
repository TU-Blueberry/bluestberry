import { Component, ComponentFactory, ComponentFactoryResolver, ComponentRef, Input, OnDestroy, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { EventService } from '../events/event.service';
import { FileComponent } from '../file/file.component';
import { FilesystemService } from '../filesystem.service';
import { isSystemDirectory } from '../shared/system_folder';

@Component({
  selector: 'app-folder',
  templateUrl: './folder.component.html',
  styleUrls: ['./folder.component.scss']
})
export class FolderComponent implements OnInit, OnDestroy {
  PyFS?: typeof FS & MissingInEmscripten;
  folderFactory: ComponentFactory<FolderComponent>;
  fileFactory: ComponentFactory<FileComponent>;
  showSubfolders = false;
  additionalData?: AnalyzeObject;
  hasSubfolders = false;
  isActive = false;
  allSubfolders: ComponentRef<FolderComponent>[] = [];
  allFiles: ComponentRef<FileComponent>[] = [];
  deleteSubscription: Subscription;
  moveSubscription: Subscription;
  writeSubscription: Subscription;
  activeElementChangeSubscription: Subscription;

  @Input('depth') depth: number = 0;
  @Input('path') path: string = '';
  @Input('ref') ref?: FSNode;
  @Input('rootname') rootname?: string;
  @ViewChild('subfolders', { read: ViewContainerRef, static: true }) foldersRef!: ViewContainerRef;
  @ViewChild('files', { read: ViewContainerRef, static: true }) filesRef!: ViewContainerRef;
  constructor(private fsService: FilesystemService, private componentFactoryResolver: ComponentFactoryResolver, private ev: EventService) {
    this.fsService.getFS().subscribe(pyfs => this.PyFS = pyfs);
    this.folderFactory = this.componentFactoryResolver.resolveComponentFactory(FolderComponent);
    this.fileFactory = this.componentFactoryResolver.resolveComponentFactory(FileComponent);

    this.deleteSubscription = this.ev.onDeletePath.subscribe(this.onDelete.bind(this));
    this.moveSubscription = this.ev.onMovePath.subscribe(this.onPathMove.bind(this));
    this.writeSubscription = this.ev.onWriteToFile.subscribe(this.onWriteToFile.bind(this));

    this.activeElementChangeSubscription = this.ev.onActiveElementChange.subscribe(newActiveElementPath => {
      if (this.path !== newActiveElementPath) {
        this.isActive = false;
      }
    });
  }

  // remove the corresponding UI element if the deleted path is a direct child (folder/file component)
  // search effort might hunt us for large lists; if it turns out to be problematic, maps could be an alternative
  onDelete(path: string): void {
    if (this.isDirectChild(path)) {
      this.allSubfolders.forEach((folder, index) => {
        if (folder.instance.path === path) {
          this.foldersRef.remove(this.foldersRef.indexOf(folder.hostView));
          this.allSubfolders.splice(index, 1);
        }
      });

      this.allFiles.forEach((file, index) => {
        if (file.instance.path === path) {
          this.filesRef.remove(this.filesRef.indexOf(file.hostView));
          this.allFiles.splice(index, 1);
        }
      });
    }
  }

  // TODO: What happens if you rename top level dir?
  onWriteToFile(params: {path: string, bytesWritten: number}) {
    if (this.isDirectChild(params.path)) {
      this.scan();
    }
  }

  // covers renaming and moving and creating new files/folders
  onPathMove(params: { oldPath: string, newPath: string }): void {
    if (this.isDirectChild(params.newPath)) {
      this.scan();
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
    // special case
    if (this.rootname) {
      this.showSubfolders = true;
    }

    if (this.ref) {
      Object.keys(this.ref.contents).length > 0 ? this.hasSubfolders = true : this.hasSubfolders = false;
      this.scan();
    }
  }

  deleteFolder(ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();
    this.fsService.deleteFolder(this.path);
    this.fsService.sync(false).subscribe();
  }

  // TODO: Catch errors
  /** Creates components for new subfolders/files and updates existing ones */
  scan(): void {
    const entries = (this.PyFS?.lookupPath(this.path, {}).node as FSNode).contents;
    const subfolders: any[] = [];
    const filesInFolder: any[] = [];

    for (const [key, value] of Object.entries(entries)) {
      const currentPath = `${this.path}/${value.name}`;

      if (entries.hasOwnProperty(key) && !isSystemDirectory(currentPath) && this.fsService.isDirectory(currentPath)) {
        subfolders.push(value);
      }

      if (entries.hasOwnProperty(key) && this.fsService.isFile(currentPath) && !(this.depth == 0 && value.name === 'config.json')) {
        filesInFolder.push(value);
      }
    }

    for (const subfolder of subfolders) {
      const subfolderPath = `${this.path}/${subfolder.name}`;
      const indexOfFolder = this.allSubfolders.findIndex(folder => folder.instance.path === subfolderPath);
      let folderComponentRef: ComponentRef<FolderComponent>;

      // check if component already exists; if yes, update is sufficient. if not, create a new one
      if (indexOfFolder >= 0) {
        folderComponentRef = this.allSubfolders[indexOfFolder];
      } else {
        folderComponentRef = this.foldersRef.createComponent(this.folderFactory);
        this.allSubfolders.push(folderComponentRef);
      }

      folderComponentRef.instance.depth = this.depth + 1;
      folderComponentRef.instance.path = subfolderPath;
      folderComponentRef.instance.ref = subfolder;
    }

    for (const file of filesInFolder) {
      const filePath = `${this.path}/${file.name}`
      const indexOfFile = this.allFiles.findIndex(file => file.instance.path === filePath);
      let fileComponentRef: ComponentRef<FileComponent>;


      if (indexOfFile >= 0) {
        fileComponentRef = this.allFiles[indexOfFile];
      } else {
        fileComponentRef = this.filesRef.createComponent(this.fileFactory);
        this.allFiles.push(fileComponentRef);
      }
      fileComponentRef.instance.depth = this.depth + 1;
      fileComponentRef.instance.path = filePath;
      fileComponentRef.instance.ref = file;
    }
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
  }
}
