import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { fromEvent, Observable } from 'rxjs';
import { delay, filter, tap } from 'rxjs/operators';
import { LessonManagementService } from '../lesson-management/lesson-management.service';
import { Experience } from '../model/experience';

@Component({
  selector: 'app-lesson-selection',
  templateUrl: './lesson-selection.component.html',
  styleUrls: ['./lesson-selection.component.scss']
})
export class LessonSelectionComponent implements OnInit {
  experiences$: Observable<{lessons: Experience[], sandboxes: Experience[], switchTo?: Experience}>;
  selectedLesson: Experience = { name: '', type: "LESSON"};
  isSwitching = false;
  showOptions = false;
  showCreationDialog = false;
  showSandboxDeletionDialog = false;
  sandboxToDelete?: Experience;

  constructor(private lessonManagementService: LessonManagementService, private ref: ElementRef) {
    this.experiences$ = this.lessonManagementService.experiences$;
    this.experiences$.subscribe(elements => {
      let ls = localStorage.getItem("lastLesson");
      const preference = ls ? JSON.parse(ls) : null;

      if (elements.switchTo !== undefined) {
        this.onSelectChange(elements.switchTo);
      } else {
        // TODO: Löschen berücksichtigen!
        // Kann sowohl aktive als auch andere sandboxes löschen!

        if (preference !== null && (elements.lessons.find(element => element.name === preference?.name) !== undefined 
                                   || elements.sandboxes.find(element => element.name === preference?.name) !== undefined)) {
            this.selectedLesson = preference;
        } else {
          localStorage.removeItem("lastLesson");
          this.selectedLesson = elements.lessons.length > 0 ? 
              elements.lessons[0] : 
              (elements.sandboxes.length > 0 ? elements.sandboxes[0] : {name: '', type: "LESSON"})
        }

        if (this.selectedLesson.name !== '') {
          localStorage.setItem("lastLesson", JSON.stringify(this.selectedLesson));
          this.selectedLesson.type === 'LESSON' ? 
              this.lessonManagementService.openLesson(this.selectedLesson).subscribe() :
              this.lessonManagementService.openSandbox(this.selectedLesson).subscribe();
        }
      }
    });
  }

  ngOnInit(): void {
    fromEvent(document, 'click').pipe(
      filter(event => !this.ref.nativeElement.contains(event.target)),
      tap(ev => this.closeOptions(ev))
    ).subscribe()

   fromEvent(document, 'keydown').pipe(
      filter(ev => (ev as KeyboardEvent).key === 'Escape'),
      tap(ev => this.closeOptions(ev))
    ).subscribe()
  }

  public onSelectChange(to: Experience) {
    this.showOptions = false;

    if (to === this.selectedLesson) {
      return;
    }

    this.isSwitching = true;
    this.lessonManagementService.changeExperience(this.selectedLesson, to).pipe(delay(1000)).subscribe(
      () => {}, (err: any) => { console.error(err); this.isSwitching = false }, () => {
        this.isSwitching = false;
        this.selectedLesson = to;
        localStorage.setItem("lastLesson", JSON.stringify(this.selectedLesson));
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
      this.lessonManagementService.deleteSandbox(this.sandboxToDelete.name !== this.selectedLesson.name, this.sandboxToDelete,).subscribe(
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
      this.lessonManagementService.createAndStoreSandbox(name).subscribe(
        () => {},
        (err) => console.error(err),
        () => console.log(`%c Successfully created new sandbox ${name}`, "color: green")
      )
    }
  }

  private closeOptions(ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();
    this.showOptions = false;
  }
}
