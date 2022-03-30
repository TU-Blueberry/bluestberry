import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { Store } from '@ngxs/store';
import * as JSZip from 'jszip';
import { defer, from, Subscription } from 'rxjs';
import { delay, switchMap, tap } from 'rxjs/operators';
import { ActionbarModel, ActionbarState } from 'src/app/actionbar/actionbar.state';
import { ImportAction } from 'src/app/actionbar/actions/import.action';
import { AppState, AppStateModel } from 'src/app/app.state';
import { ZipService } from 'src/app/filesystem/zip/zip.service';
import { ExperienceService } from '../experience.service';
import { ImportExportService } from '../import-export.service';
import { ExperienceType } from '../model/experience-type';

@Component({
  selector: 'app-import',
  templateUrl: './import.component.html',
  styleUrls: ['./import.component.scss']
})
export class ImportComponent implements OnDestroy {
  showImportWindow = false;
  dragOver = false;
  isImporting = false;
  checkInProgress = false;
  conflictDetected = false;
  selectedFile?: File;
  expType: ExperienceType = 'UNKNOWN';
  expName: string = '';
  tempZip?: JSZip;
  lastCheck?: Subscription;
  hasError = false;

  @ViewChild("fileInput") fileInput?: ElementRef;
  constructor(private zipService: ZipService, private exp: ExperienceService, private importExport: ImportExportService, private store: Store) { 
    this.store.select<AppStateModel>(AppState)
      .subscribe(state => this.isImporting = state.status === "IMPORTING");

    this.store.select<ActionbarModel>(ActionbarState).subscribe(state => this.showImportWindow = state.import.active);
  }

  // uuid not in use
  // improvement: display errors
  importRegular(): void {
    if (this.tempZip) {
      this.importExport.importRegular(this.tempZip).subscribe();
    } 
  }

  // uuid in use but user chose to overwrite existing experience
  importOverwrite(): void {
    if (this.tempZip) {
      this.importExport.importWithOverwrite(this.tempZip).subscribe();
    }
  }

  // uuid in use but user chose to import the selected experience alongside the existing one
  // assigns new uuid to the imported experience
  importGenerateNewUuid(): void {
    if (this.tempZip) {
      this.importExport.importGenerateUuid(this.tempZip).subscribe();
    }
  }

  // needs to be a valid zip with a valid config
  // checks whether uuid is already in use or not
  checkArchive(file: File) {
    this.checkInProgress = true;
    return from(file.arrayBuffer()).pipe(
      switchMap(buffer => this.zipService.loadZip(buffer)),
      tap(unzipped => this.tempZip = unzipped),
      switchMap(res => this.zipService.getConfigFromStream(res)),
      delay(500),
      switchMap(conf => this.exp.available(conf.uuid)
        .pipe(
          switchMap(existsAndAvailable => defer(() => { 
            this.expType = conf.type;
            this.expName = conf.name;
            this.conflictDetected = existsAndAvailable;
            this.checkInProgress = false;
            this.hasError = false;
          }))
        ))) 
  }

  // drop zone
  dropFile(ev: DragEvent): void {
    ev.preventDefault();
    this.selectedFile = undefined;

    if (ev.dataTransfer && ev.dataTransfer.items) {
      if (ev.dataTransfer.items.length === 1 && ev.dataTransfer.items[0].kind === "file") {
        const file = ev.dataTransfer.items[0].getAsFile();

        if (file) {
          this.check(file);
        }
      }
    }
  }

  preventDragOver(ev: Event): void {
    ev.preventDefault();
    this.dragOver = true;
  }

  clearSelection(ev?: Event): void {
    ev?.preventDefault();
    ev?.stopPropagation();
    this.dragOver = false;
    this.selectedFile = undefined;
    this.tempZip = undefined;
    this.conflictDetected = false;
    this.isImporting = false;
    this.expName = '';
    this.expType = 'UNKNOWN';
    this.hasError = false;  
    
    if (this.fileInput) {
      this.fileInput.nativeElement.value = "";
    }
  }

  closeImportWindow(): void {
    this.clearSelection();
    this.store.dispatch(new ImportAction.CloseImportWindow());
  }

  check(candidate: File): void {
    this.tempZip = undefined;
    this.checkInProgress = false;
    this.lastCheck?.unsubscribe();
    this.conflictDetected = false;

    if (candidate.type !== 'application/zip') {
      return;
    }

    this.selectedFile = candidate;
    this.lastCheck = this.checkArchive(this.selectedFile).subscribe(
      () => {},
      err => {
        console.error(err);
        this.checkInProgress = false;
        this.hasError = true;
      }
    );
  }

  fileInputChange(ev: Event) {
    this.selectedFile = undefined;
    const fileList = (ev.target as HTMLInputElement)?.files;

    if (fileList?.[0]) {
      this.check(fileList[0]);
    } else {
      // should give some feedback to user
    }
  }

  ngOnDestroy(): void {
    this.lastCheck?.unsubscribe();
  }
}