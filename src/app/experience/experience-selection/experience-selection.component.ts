import { Component, ElementRef, NgZone, OnInit } from '@angular/core';
import { fromEvent, Observable } from 'rxjs';
import { delay, filter, tap } from 'rxjs/operators';
import { FilesystemService } from 'src/app/filesystem/filesystem.service';
import { ExperienceManagementService } from '../experience-management/experience-management.service';
import { Experience } from '../model/experience';

@Component({
  selector: 'app-lesson-selection',
  templateUrl: './experience-selection.component.html',
  styleUrls: ['./experience-selection.component.scss']
})
export class ExperienceSelectionComponent implements OnInit {
  experiences$: Observable<{lessons: Experience[], sandboxes: Experience[], switchTo?: Experience, deleted?: Experience}>;
  selectedExperience: Experience = { name: '', type: "LESSON", uuid: ''};
  isSwitching = false;
  showOptions = false;
  showCreationDialog = false;
  showSandboxDeletionDialog = false;
  sandboxToDelete?: Experience;

  constructor(private expManagementService: ExperienceManagementService, private ref: ElementRef, private fs: FilesystemService, private zone: NgZone) {
    this.experiences$ = this.expManagementService.experiences$;
    this.experiences$.subscribe(elements => {
      const original = { ... this.selectedExperience }
      const last = localStorage.getItem("lastExperience");
      let preference: Experience | null = last ? JSON.parse(last) : null;

      if (elements.deleted) {
        localStorage.removeItem(elements.deleted.uuid);
        
        if (preference && preference.uuid === elements.deleted.uuid) {
          preference = null;
        }
      }

      if (elements.switchTo !== undefined) {
        this.onSelectChange(elements.switchTo);
      } else {
        if (preference !== null && (elements.lessons.find(element => element.uuid === preference?.uuid) !== undefined 
                                   || elements.sandboxes.find(element => element.uuid === preference?.uuid) !== undefined)) {
            this.selectedExperience = preference;
        } else {
          localStorage.removeItem("lastExperience");
          this.selectedExperience = elements.lessons.length > 0 ? 
              elements.lessons[0] : 
              (elements.sandboxes.length > 0 ? 
                  elements.sandboxes[0] : 
                  {name: '', type: "LESSON", uuid: ''} // TODO: Wenn nix existiert: random sandbox anlegen und dahin wechseln!
              ) 
        }

        if (this.selectedExperience.uuid !== '' && this.selectedExperience.uuid !== original.uuid) {
          localStorage.setItem("lastExperience", JSON.stringify(this.selectedExperience));
          this.selectedExperience.type === 'LESSON' ? 
              this.expManagementService.openLesson(this.selectedExperience).subscribe(
                (nxt) => {}, // console.log("Next in openLesson", nxt)
                (err) => console.error(err),
                () => console.log("open lesson complete")
              ) :
              this.expManagementService.openSandbox(this.selectedExperience).subscribe();
        }
      }
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

  public onSelectChange(to: Experience) {
    this.showOptions = false;

    if (to === this.selectedExperience) {
      return;
    }

    this.isSwitching = true;
    this.expManagementService.changeExperience(this.selectedExperience, to).pipe(delay(200)).subscribe(
      () => {}, (err: any) => { console.error(err); this.isSwitching = false }, () => {
        this.isSwitching = false;
        this.selectedExperience = to;
        localStorage.setItem("lastExperience", JSON.stringify(this.selectedExperience));
      }
    )
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
      this.expManagementService.deleteSandbox(this.sandboxToDelete.name === this.selectedExperience.name, this.sandboxToDelete,).subscribe(
        () => {},
        (err) => console.error(err),
        () => { 
          console.log(`%c Sandbox ${this.sandboxToDelete?.name} erfolgreich gelöscht`, "color: green");
          this.sandboxToDelete = undefined;
        }
      )
    } else {
      this.sandboxToDelete = undefined;
    }

    this.showSandboxDeletionDialog = false;
  }

  public createNewSandbox(name: string): void {
    this.closeCreationDialog();
    
    if (name !== '') {
      this.expManagementService.createAndStoreSandbox(name).subscribe(
        () => {},
        (err) => console.error(err),
        () => console.log(`%c Successfully created new sandbox ${name}`, "color: green")
      )
    }
  }

  private closeOptions(ev: Event): void {
    console.log("close options")
    ev.preventDefault();
    ev.stopPropagation();
    this.showOptions = false;
  }
}
