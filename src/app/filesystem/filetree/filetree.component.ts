import { Component, ComponentFactoryResolver, OnDestroy, ViewChild, ViewContainerRef } from '@angular/core';
import { concat, from, Observable, Subject, Subscription } from 'rxjs';
import { PyodideService } from '../../pyodide/pyodide.service';
import { FilesystemService } from '../filesystem.service';
import { FolderComponent } from '../folder/folder.component';
import { saveAs } from 'file-saver';
import { EventService } from '../events/event.service';
import { switchMap } from 'rxjs/operators';
import { ConfigObject } from '../shared/configObject';
import { JSZipObject } from 'jszip';
import * as JSZip from 'jszip';

@Component({
  selector: 'app-filetree',
  templateUrl: './filetree.component.html',
  styleUrls: ['./filetree.component.scss'],
})
export class FiletreeComponent implements OnDestroy{
  rootComponent?: FolderComponent;
  showImportWindow = false;
  dragOver = false;
  tempZip?: JSZip;
  checkInProgress = false;
  conflictDetected = false;
  selectedFile?: File;
  userResult$: Subject<boolean> = new Subject();
  lastCheck?: Subscription;
  test: any;

  @ViewChild('liste', { read: ViewContainerRef, static: true }) listRef!: ViewContainerRef;
  constructor(private pys: PyodideService, private fsService: FilesystemService, private componentFactoryResolver: ComponentFactoryResolver, private ev: EventService) {

    // TODO: error handling
    concat(this.pys.pyodide, this.fsService.openLessonByName('/sortierroboter'))
      .subscribe(
        () => { },
        err => { },
        () => { 
          this.kickstartTreeGeneration();
        });

    // Sync after every write
    // TODO: Should probably be done automatically after every code execution by pyodide service
    ev.onWriteToFile.subscribe(() => {
      this.fsService.sync(false).subscribe()
    });
  }

  // TODO: Remove hardcoded stuff
  kickstartTreeGeneration(): void {
    const folderFactory = this.componentFactoryResolver.resolveComponentFactory(FolderComponent);
    const root = this.fsService.getTopLevelOfLesson("/sortierroboter");
    const folderComp = <FolderComponent>this.listRef.createComponent(folderFactory).instance;
    folderComp.depth = 0;
    folderComp.path = "/sortierroboter";
    folderComp.ref = root;
    folderComp.rootname = "Sortierroboter";
    this.rootComponent = folderComp;
  }

  // TODO: Soll man mehr als eine Lektion gleichzeitig offen haben können?
  // Falls ja müsste es beim Import noch eine Flag wie "nach dem importieren öffnen" geben (ngModel)

  // TODO: Vor dem Import alle Tabs der alten Lektion schließen, changes discarden
  // Nach dem Import: openLeft und openRight der neuen Lektion aufrufen

  // TODO: Dateien laden bugg bei FF irgendwie
  export(name: string): void {
    this.fsService.exportLesson(name).subscribe(blob => {
      saveAs(blob, name);
    });
  }

  finishImport(): void {
    this.userResult$.next(true);
  }

  // TODO: Additionally check whether it zip is completely empty or only consists of config.json
  unpackCheckAndPossiblyImport(file: File) {
    this.checkInProgress = true;
    return from(file.arrayBuffer()).pipe(
      switchMap(buffer => this.fsService.loadZip(buffer)),
      switchMap(zip => this.getFileFromZip(zip)),
      switchMap(res => this.getConfigFromStream(res)),
      switchMap(conf => this.fsService.checkIfLessonDoesntExistYet(conf.name)
        .pipe(
            switchMap(isEmpty => { 
              this.conflictDetected = !isEmpty;
              this.checkInProgress = false;
              
              return this.userResult$.pipe(switchMap(userResult => {              
                return concat(this.fsService.importLesson(userResult, conf, this.tempZip), this.fsService.sync(false), this.completeUserResultHelper())
              })) 
            })
        )))
  }

  completeUserResultHelper() {
    return new Observable(subscriber => {
      this.userResult$.complete();
      subscriber.complete();
    });
  }

  getConfigFromStream(config: JSZipObject): Observable<ConfigObject> {
    return new Observable(subscriber => {
      const stream = config.internalStream("string");
      stream.on("error", () => subscriber.error("Error trying to stream config"));
      stream.accumulate().then((data => {
        const parsedConfig: ConfigObject = JSON.parse(data);
      
        if (parsedConfig.name) {
          subscriber.next(parsedConfig);
          subscriber.complete();
        } else {
          subscriber.error("Config is missing name property");
        }      
      }));
    });
  }

  getFileFromZip(unzipped: JSZip): Observable<JSZipObject> {
    return new Observable(subscriber => {
      this.tempZip = unzipped;
      const config = unzipped.file("config.json");

      if (!config) {
        subscriber.error("Couldn't find config file");
      } else {
        subscriber.next(config);
        subscriber.complete();
      }
    });
  }

  openImportWindow(): void {
    this.showImportWindow = true;
  }

  dropFile(ev: DragEvent): void {
    ev.preventDefault();
    this.selectedFile = undefined;

    if (ev.dataTransfer) {
      if (ev.dataTransfer.items) {
        if (ev.dataTransfer.items.length === 1 && ev.dataTransfer.items[0].kind === "file") {
          const file = ev.dataTransfer.items[0].getAsFile();

          if (file) {
            this.check(file);
          } else {
            // TODO: Error
          }
        } else {
          // TODO: Error
        }
      }
    }
  }

  preventDragOver(ev: Event): void {
    ev.preventDefault();
    this.dragOver = true;
  }

  clearSelection(): void {
    this.dragOver = false;
    this.selectedFile = undefined;
    this.tempZip = undefined;
  }

  closeImportWindow(): void {
    this.showImportWindow = false;
  }

  check(candidate: File): void {
    this.userResult$ = new Subject();
    this.tempZip = undefined;
    this.checkInProgress = false;
    this.lastCheck?.unsubscribe();
    this.conflictDetected = false;

    if (candidate.type !== 'application/zip') {
      // TODO: Display error message
      return;
    }

    this.selectedFile = candidate;

    // TODO: Kriegt man das subscribe weg?
    this.lastCheck = this.unpackCheckAndPossiblyImport(this.selectedFile).subscribe(() => {}, 
      err => console.error(err), 
      () => {
        console.log("Import complete!");
        this.listRef.clear();
        this.kickstartTreeGeneration();
        this.checkInProgress = false;
        this.conflictDetected = false;
        this.showImportWindow = false;
        this.tempZip = undefined;
    });
  }

  fileInputChange(ev: Event) {
    this.selectedFile = undefined;
    const fileList = (ev.target as HTMLInputElement)?.files;

    if (fileList?.[0]) {
      this.check(fileList[0]);
    } else {
      // TODO: Error
    }
  }

  preventBubbling(ev: Event): void {
    ev.stopPropagation();
  }

  ngOnDestroy(): void {
    this.lastCheck?.unsubscribe();
  }
}
