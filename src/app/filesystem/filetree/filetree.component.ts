import { Component, ComponentFactoryResolver, OnDestroy, ViewChild, ViewContainerRef } from '@angular/core';
import { concat, from, Observable, Subject, Subscription } from 'rxjs';
import { FilesystemService } from '../filesystem.service';
import { FolderComponent } from '../folder/folder.component';
import { switchMap, tap } from 'rxjs/operators';
import * as JSZip from 'jszip';
import { ZipService } from '../zip/zip.service';
import { TreeNode } from '../model/tree-node';
import { UiEventsService } from 'src/app/ui-events.service';
import { FilesystemEventService } from '../events/filesystem-event.service';
import { LessonEventsService } from 'src/app/lesson/lesson-events.service';
import { Experience } from 'src/app/lesson/model/experience';

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
  SELECTED_LESSON?: Experience;

  @ViewChild('liste', { read: ViewContainerRef, static: true }) listRef!: ViewContainerRef;
  constructor(private fsService: FilesystemService, private componentFactoryResolver: ComponentFactoryResolver, 
    private zipService: ZipService, private uiEv: UiEventsService, private ev: FilesystemEventService,
    private lse: LessonEventsService) {

    // TODO: das + kickstart muss wg. pfaden angepasst werden
    this.lse.onExperienceOpened.subscribe((lesson) => {
      this.SELECTED_LESSON = lesson;
      this.kickstartTreeGeneration();
    })

    this.lse.onExperienceClosed.subscribe(() => {
      this.listRef.clear();
    })
  }

  private kickstartTreeGeneration() {
    this.listRef.clear();
    const folderFactory = this.componentFactoryResolver.resolveComponentFactory(FolderComponent);
    this.fsService.getNodeByPath(`/${this.SELECTED_LESSON?.name}`).subscribe((node) => {
      const folderComp = <FolderComponent>this.listRef.createComponent(folderFactory).instance;
      const baseNode = new TreeNode(this.uiEv, this.fsService, this.ev);
      baseNode.path = "/";
      folderComp.node = baseNode.generateTreeNode(0, `/${this.SELECTED_LESSON?.name}`, node, this.SELECTED_LESSON?.name);
      this.rootComponent = folderComp;
    });
  }

  // TODO: Dateien laden bugg bei FF irgendwie

  // TODO: Config aus neuem Mountpoint laden und reinpacken
  // Gleiches gilt für external dateien
  export(name: string): void {
    this.zipService.export(name).subscribe()
  }

  finishImport(): void {
    this.userResult$.next(true);
  }

  // TODO: Regular flow should be similar to this!
  // TODO: Additionally check whether zip is completely empty or only consists of config.json
  unpackCheckAndPossiblyImport(file: File) {
    this.checkInProgress = true;
    return from(file.arrayBuffer()).pipe(
      switchMap(buffer => this.zipService.loadZip(buffer)),
      tap(unzipped => this.tempZip = unzipped),
      switchMap(res => this.zipService.getConfigFromStream(res)),
      switchMap(conf => this.fsService.isNewLesson(conf.name)
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

  openImportWindow(): void {
    this.showImportWindow = true;
  }

  dropFile(ev: DragEvent): void {
    ev.preventDefault();
    this.selectedFile = undefined;

    if (ev.dataTransfer && ev.dataTransfer.items) {
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
