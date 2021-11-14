import { Component, ComponentFactory, ComponentFactoryResolver, ComponentRef, Input, OnChanges, OnDestroy, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { EventService } from '../event.service';
import { FileComponent } from '../file/file.component';
import { FilesystemService } from '../filesystem.service';


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

  @Input('depth') depth: number = 0;
  @Input('path') path: string = '';
  @Input('ref') ref?: FSNode;
  @Input('rootname') rootname?: string;
  @ViewChild('subfolders', { read: ViewContainerRef, static: true }) foldersRef!: ViewContainerRef; 
  @ViewChild('files', { read: ViewContainerRef, static: true }) filesRef!: ViewContainerRef;
  constructor(private fsService: FilesystemService, private componentFactoryResolver: ComponentFactoryResolver, private ev: EventService) {
    
    this.fsService.getFS().subscribe(pyfs => this.PyFS = pyfs);


    // TODO: This is variant 2: Every component listens to delete events and checks whether one of its direct childs was affected
    // Only then the UI will be redrawn. This might _possibly_ save some time for larger folder structures.

    // if the deleted path is a direct child, we remove the corresponding UI element (folder/file component)
    this.deleteSubscription = this.ev.onDeletePath.subscribe(deletedPath => {
      /* if (this.isDirectChild(deletedPath)) { 
        for (const [index, folder] of this.allSubfolders.entries()) {
          if (folder.instance.path === deletedPath) {
            this.foldersRef.remove(this.foldersRef.indexOf(folder.hostView));
            this.allSubfolders.splice(index, 1);
          }
        }

        for (const [index, file] of this.allFiles.entries()) {
          if (file.instance.path === deletedPath) {
            this.filesRef.remove(this.filesRef.indexOf(file.hostView));
            this.allFiles.splice(index, 1);
          }
        }
      } */
    }) ;

    this.folderFactory = this.componentFactoryResolver.resolveComponentFactory(FolderComponent);
    this.fileFactory = this.componentFactoryResolver.resolveComponentFactory(FileComponent);
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
    // special cas
    if (this.rootname) {
      this.showSubfolders = true;
    }

    if (this.ref) {
      Object.keys(this.ref.contents).length > 0 ? this.hasSubfolders = true : this.hasSubfolders = false;
      this.scan();
    }
  }

  ngOnDestroy(): void {
    this.foldersRef.clear();
    this.filesRef.clear();
    this.deleteSubscription.unsubscribe();
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
    const entries = (this.PyFS?.lookupPath(this.path, {}).node as FSNode).contents ;
    const subfolders: any[] = [];
    const filesInFolder: any[] = [];

    for (const [key, value] of Object.entries(entries)) {
      const currentPath = `${this.path}/${value.name}`;

      if (entries.hasOwnProperty(key) && !this.fsService.isSystemDirectory(currentPath) && this.fsService.isDirectory(currentPath)) {
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

     // check if component already exists; if so, update it
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
      const fileCOmp = <FileComponent>this.foldersRef.createComponent(this.fileFactory).instance;
      fileCOmp.depth = this.depth + 1;
      fileCOmp.path = `${this.path}/${file.name}`;
      fileCOmp.ref = file;
    }
  }

  toggleSubfolders(): void {
    this.showSubfolders = !this.showSubfolders;
  }

  toggleActive(): void {
    this.isActive = !this.isActive;
    this.toggleSubfolders();
  }
}
