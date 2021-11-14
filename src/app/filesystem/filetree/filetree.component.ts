import { Component, ComponentFactoryResolver, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { concat } from 'rxjs';
import { PyodideService } from '../../pyodide/pyodide.service';
import { FilesystemService } from '../filesystem.service';
import { FolderComponent } from '../folder/folder.component';
import { saveAs } from 'file-saver';
import { EventService } from '../event.service';

@Component({
  selector: 'app-filetree',
  templateUrl: './filetree.component.html',
  styleUrls: ['./filetree.component.scss']
})
export class FiletreeComponent implements OnInit {

  rootComponent?: FolderComponent; 

  @ViewChild('liste', { read: ViewContainerRef, static: true }) listRef!: ViewContainerRef; 
  constructor(private pys: PyodideService, private fsService: FilesystemService,  private componentFactoryResolver: ComponentFactoryResolver, private ev: EventService) {
    
    // TODO: error handling
    concat(this.pys.pyodide, this.fsService.openLesson3('/sortierroboter'))
      .subscribe(() => {}, 
        err => {},
        () => this.kickstartTreeGeneration());
  
      ev.onDeletePath.subscribe(path => {
        const root = this.fsService.getTopLevelOfLesson("/sortierroboter");
        console.log("ROOT AFTER DELETE: ");
        console.log(root);
        
         if (this.rootComponent) {
          this.rootComponent.ref = root;
        }

        this.listRef.clear();
        this.kickstartTreeGeneration();
      });
    }

  kickstartTreeGeneration(): void {
    console.log("KICKSTART!");

    const folderFactory = this.componentFactoryResolver.resolveComponentFactory(FolderComponent);
    const root = this.fsService.getTopLevelOfLesson("/sortierroboter");
    const folderComp = <FolderComponent>this.listRef.createComponent(folderFactory).instance;
    folderComp.depth = 0;
    folderComp.path = "/sortierroboter";
    folderComp.ref = root;
    folderComp.rootname = "Sortierroboter";
    this.rootComponent = folderComp;
  }


  // TODO: Dateien laden bugg bei FF irgendwie

  // TODO
  export(name: string): void {
    this.fsService.exportLesson(name).subscribe(blob => {
      saveAs(blob, "aaaaa");
    });
  }

  init(name: string) {
    return 
  }

  ngOnInit(): void {
  }

  toggleOfficialFiles(): void {
    // this.showOfficialFiles = !this.showOfficialFiles;
  }

  toggleCustomFiles(): void {
    // this.showCustomFiles = !this.showCustomFiles;
  }


}
