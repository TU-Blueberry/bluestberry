import { Component, ElementRef, NgZone, OnInit } from '@angular/core';
import { Actions, ofActionSuccessful, Store } from '@ngxs/store';
import { from, fromEvent, Observable } from 'rxjs';
import { filter, switchMap, take, tap } from 'rxjs/operators';
import { AppState, AppStatus, AppStateModel } from 'src/app/app.state';
import { ZipService } from 'src/app/filesystem/zip/zip.service';
import { ExperienceAction } from '../actions';
import { ExperienceState, ExperienceStateModel } from '../experience.state';
import { Experience } from '../model/experience';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-lesson-selection',
  templateUrl: './experience-selection.component.html',
  styleUrls: ['./experience-selection.component.scss']
})
export class ExperienceSelectionComponent implements OnInit {
  experiences$: Observable<ExperienceStateModel>
  app$: Observable<AppStateModel>;
  appState: AppStatus = "INITIALIZING";
  selectedExperience: Experience = { name: '', type: "LESSON", uuid: '', preloadedPythonLibs: []};
  lessons: Experience[] = [];
  sandboxes: Experience[] = [];
  exporting?: Experience;

  isSwitching = false;
  showOptions = false;
  showCreationDialog = false;
  showSandboxDeletionDialog = false;
  sandboxToDelete?: Experience;

  constructor(private zip: ZipService, private action$: Actions, private store: Store, private ref: ElementRef, private zone: NgZone) {
    // TODO: errors
    action$.pipe(
      ofActionSuccessful(ExperienceAction.Remove)
    ).subscribe(() => {
      this.sandboxToDelete = undefined;
      this.showSandboxDeletionDialog = false;
    });
        
    this.app$ = this.store.select(AppState);
    this.app$.subscribe(state => {
      this.isSwitching = state.status === 'SWITCHING';
      this.appState = state.status
    })
    
    this.experiences$ = this.store.select(ExperienceState);
    this.experiences$.subscribe(elements => {
      this.sandboxes = elements.sandboxes;
      this.lessons = elements.lessons;
      this.selectedExperience = elements.current !== undefined ? elements.current : { name: '', type: "LESSON", uuid: ''};
    }); 
  }

  ngOnInit(): void {
    this.zone.runOutsideAngular(() => {
      fromEvent(document, 'click').pipe(
        filter(event => !this.ref.nativeElement.contains(event.target) && this.showOptions),
        tap(ev => this.closeOptions(ev))
      ).subscribe()
  
     fromEvent(document, 'keydown').pipe(
        filter(ev => (ev as KeyboardEvent).key === 'Escape'),
        tap(ev => this.closeOptions(ev))
      ).subscribe()
    })
  }

  export(exp: Experience, ev: Event): void {
    ev.stopPropagation();
    this.exporting = exp;
    this.zip.export(exp).pipe(
      take(1),
      switchMap(zip => from(zip.generateAsync({ type: "blob" })))
    ).subscribe(blob => {
      saveAs(blob, exp.name);
      this.exporting = undefined;
      this.showOptions = false;
    }, err => { // TODO: display errors
      this.exporting = undefined;
      this.showOptions = false;
    }); 
  }

  public onSelectChange(to: Experience) {
    this.showOptions = false;
    
    if (to.uuid === this.selectedExperience.uuid) {
      return;
    }

    this.store.dispatch(new ExperienceAction.Open(to));
  }

  public openCreationDialog(ev: Event): void {
    ev.stopPropagation();
    this.showOptions = false;
    this.showCreationDialog = true;
  }

  public closeCreationDialog(): void {
    this.showCreationDialog = false;
  }

  public openSandboxDeletionDialog(ev: Event, sandbox: Experience): void {
    ev.preventDefault();
    ev.stopPropagation();
    this.showSandboxDeletionDialog = true;
    this.sandboxToDelete = sandbox;
  }

  public closeDeletionDialog(): void {
    this.showSandboxDeletionDialog = false;
    this.sandboxToDelete = undefined;
  }

  public onDeletionChoice(choice: boolean): void {
    if (choice === true && this.sandboxToDelete !== undefined) {
      this.store.dispatch(new ExperienceAction.Remove(this.sandboxToDelete))
    } else {
      this.sandboxToDelete = undefined;
      this.showSandboxDeletionDialog = false;
    }
  }

  public createNewSandbox(name: string): void {
    this.closeCreationDialog();
    this.store.dispatch(new ExperienceAction.CreateSandbox(name));
  }

  private closeOptions(ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();
    this.showOptions = false;
  }
}
