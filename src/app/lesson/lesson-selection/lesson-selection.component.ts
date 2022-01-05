import { Component, ElementRef, HostListener } from '@angular/core';
import { Observable } from 'rxjs';
import { delay } from 'rxjs/operators';
import { FilesystemService } from 'src/app/filesystem/filesystem.service';
import { LessonManagementService } from '../lesson-management/lesson-management.service';
import { Experience } from '../model/experience';

@Component({
  selector: 'app-lesson-selection',
  templateUrl: './lesson-selection.component.html',
  styleUrls: ['./lesson-selection.component.scss']
})
export class LessonSelectionComponent {
  experiences$: Observable<{lessons: Experience[], sandboxes: Experience[], switchTo?: Experience}>;
  selectedLesson: Experience = { name: '', type: "LESSON"};
  isSwitching = false;
  showOptions = false;
  showCreationDialog = false;
  showSandboxDeletionDialog = false;
  sandboxToDelete?: Experience;

  constructor(private lessonManagementService: LessonManagementService, private ref: ElementRef, private fs: FilesystemService) {
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

  public onCreationDialogClose(name: string): void {
    this.showCreationDialog = false;
    
    if (name !== '') {
      this.lessonManagementService.createAndStoreSandbox(name).subscribe(
        () => {},
        (err) => console.error(err),
        () => console.log(`%c Successfully created new sandbox ${name}`, "color: green")
      )
    }
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
      console.log("delete choice")
      console.log(this.selectedLesson)
      console.log(this.sandboxToDelete)

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

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    if(!this.ref.nativeElement.contains(event.target)) {
      this.showOptions = false;
    } 
  }

  @HostListener('document:keydown.escape', ['$event']) 
  onEscapeHandler() {
    this.showOptions = false;
  }
}
