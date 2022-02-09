import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ComponentFactoryResolver, EventEmitter, Input, OnDestroy, Output, ViewChild, ViewContainerRef } from '@angular/core';
import { concat, from, Observable, Subject, Subscription } from 'rxjs';
import { FilesystemService } from '../filesystem.service';
import { FolderComponent } from '../folder/folder.component';
import { filter, switchMap, tap } from 'rxjs/operators';
import * as JSZip from 'jszip';
import { ZipService } from '../zip/zip.service';
import { TreeNode } from '../model/tree-node';
import { UiEventsService } from 'src/app/ui-events.service';
import { FilesystemEventService } from '../events/filesystem-event.service';
import { Experience } from 'src/app/experience/model/experience';
import { Actions, ofActionSuccessful } from '@ngxs/store';
import { ExperienceAction } from 'src/app/experience/actions';

@Component({
  selector: 'app-filetree',
  templateUrl: './filetree.component.html',
  styleUrls: ['./filetree.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FiletreeComponent implements OnDestroy{
  showImportWindow = false;
  dragOver = false;
  tempZip?: JSZip;
  checkInProgress = false;
  conflictDetected = false;
  selectedFile?: File;
  userResult$: Subject<boolean> = new Subject();
  lastCheck?: Subscription;
  SELECTED_LESSON?: Experience;
  _isGlossary = false;
  toggleSubscription?: Subscription;
  outsideClickSubscription?: Subscription;

  @Input() set isGlossary(isGlossary: boolean) {
    this._isGlossary = isGlossary;
    this.init();
  }

  @Output() expandChange: EventEmitter<boolean> = new EventEmitter();
  @ViewChild('content', { read: ViewContainerRef }) ref!: ViewContainerRef;
  constructor(private fsService: FilesystemService, private componentFactoryResolver: ComponentFactoryResolver, 
    private zipService: ZipService, private uiEv: UiEventsService, private ev: FilesystemEventService,
    private cd: ChangeDetectorRef, private action$: Actions) { }

  private init(): void {
    this.action$.pipe(
      ofActionSuccessful(ExperienceAction.Open)
    ).subscribe((action: ExperienceAction.Open) => {
      if (!this.isGlossary) {
        this.SELECTED_LESSON = action.exp;
      }

      this.kickstartTreeGeneration();
    })

    this.action$.pipe(
      ofActionSuccessful(ExperienceAction.Close)
    ).subscribe(() =>  this.ref.clear());
  }

  // possible further optimization: only delete and create new components for glossary entries which changed
  private kickstartTreeGeneration(additionalGlossaryEntries?: { path: string; node: FSNode; }[]) {  
    this.ref.clear();

    const path = this._isGlossary ? '/glossary' : `/${this.SELECTED_LESSON?.uuid}`;
    const name = this._isGlossary ? 'Glossar' : this.SELECTED_LESSON?.name;
    const folderFactory = this.componentFactoryResolver.resolveComponentFactory(FolderComponent);
    const folderComp = this.ref.createComponent(folderFactory).instance;
    const baseNode = new TreeNode(this.uiEv, this.fsService, this.ev);
    baseNode.path = "/";

    this.outsideClickSubscription = this.uiEv.onClickOutsideOfFiltree.pipe(
      filter(click => click.isGlossary === (additionalGlossaryEntries !== undefined))
    ).subscribe(click => {
      folderComp.closeContextMenu();
      folderComp.toggleContextMenu(click.ev);
    });

    this.fsService.getNodeByPath(path).subscribe((node) => {
      folderComp.node = baseNode.generateTreeNode(0, path, node, name);
      folderComp.node.isRoot = true; 
      this.toggleSubscription = folderComp.onExpandToggle.subscribe(next => this.expandChange.emit(next));

      additionalGlossaryEntries?.forEach(entry => 
        folderComp.createSubcomponent(true, entry.path, entry.node)
      )

      this.cd.markForCheck()
    }); 
  }

  // TODO: Dateien laden bugg bei FF irgendwie
  /* export(name: string): void {
    this.zipService.export(this).subscribe()
  } */

  finishImport(): void {
    this.userResult$.next(true);
  }

  // TODO: Regular flow should be similar to this!
  // TODO: Additionally check whether zip is completely empty or only consists of config.json
  unpackCheckAndPossiblyImport(file: File) {
   /*  this.checkInProgress = true;
    return from(file.arrayBuffer()).pipe(
      switchMap(buffer => this.zipService.loadZip(buffer)),
      tap(unzipped => this.tempZip = unzipped),
      switchMap(res => this.zipService.getConfigFromStream(res)),
      switchMap(conf => this.fsService.isNewLesson(conf.uuid)
        .pipe(
            switchMap(isEmpty => { 
              this.conflictDetected = !isEmpty;
              this.checkInProgress = false;
              
              return this.userResult$.pipe(switchMap(userResult => {              
                return concat(this.fsService.importLesson(userResult, conf, this.tempZip), this.fsService.sync(false), this.completeUserResultHelper())
              })) 
            })
        ))) */
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
    /* this.lastCheck = this.unpackCheckAndPossiblyImport(this.selectedFile).subscribe(() => {}, 
      err => console.error(err), 
      () => {
        console.log("Import complete!");
        this.ref.clear();
        this.kickstartTreeGeneration();
        this.checkInProgress = false;
        this.conflictDetected = false;
        this.showImportWindow = false;
        this.tempZip = undefined;
    });  */
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
    this.toggleSubscription?.unsubscribe();
    this.outsideClickSubscription?.unsubscribe();
  }
}
