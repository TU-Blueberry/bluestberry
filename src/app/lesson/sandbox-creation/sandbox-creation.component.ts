import { Component, ElementRef, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidationErrors } from '@angular/forms';
import { fromEvent } from 'rxjs';
import { filter, tap } from 'rxjs/operators';
import { FilesystemService } from 'src/app/filesystem/filesystem.service';
import { LessonManagementService } from '../lesson-management/lesson-management.service';
import { Experience } from '../model/experience';

@Component({
  selector: 'app-sandbox-creation',
  templateUrl: './sandbox-creation.component.html',
  styleUrls: ['./sandbox-creation.component.scss']
})
export class SandboxCreationComponent implements OnInit {
  public nameFormControl: FormControl;
  public formGroup: FormGroup;
  private availableSandboxes: Experience[] = [];

  @Output() close = new EventEmitter<string>();
  constructor(private ref: ElementRef, public lessonMgmt: LessonManagementService, private fsService: FilesystemService) { 
    this.nameFormControl = new FormControl('', { updateOn: "change", validators: this.validateInput.bind(this) });
    this.formGroup = new FormGroup({
      nameFormControl: this.nameFormControl 
    });

    this.lessonMgmt.experiences$.subscribe(experiences => { 
      this.availableSandboxes = experiences.sandboxes;
    });
  }

  ngOnInit(): void {
    fromEvent(document, 'click').pipe(
      filter(event => !this.ref.nativeElement.contains(event.target)),
      tap(() => this.close.emit(''))
    ).subscribe()

    fromEvent(document, 'keydown').pipe(
      filter(ev => (ev as KeyboardEvent).key === 'Escape'),
      tap(() => this.close.emit(''))
    ).subscribe()
  }

  public cancel(): void {
    this.close.emit('');
  }

  public onSubmit(): void {
    if (!this.formGroup.invalid) {
      this.close.emit(this.nameFormControl.value);
    }
  }

  private validateInput(control: AbstractControl): ValidationErrors | null {
    const value: string = control.value;

    if (value.trim() === '') {
      return { error: 'Name ist leer!' };
    }

    if (value.includes("/")) {
      return { error: 'Name enthält Schrägstriche!' };
    }

    if (value.includes(" ")) {
      return { error: 'Name enthält Leerzeichen!' };
    }
    
    if(value.trim().startsWith("sandbox")) {
      return { error: "Name darf nicht mit 'sandbox' beginnen" };
    }
    
    if (this.fsService.SYSTEM_FOLDERS.has(`/${value.trim()}`) || this.fsService.CUSTOM_FOLDERS.has(`/${value.trim()}`)) {
      return { error: "Name ist reserviert und darf nicht verwendet verwerden" }
    }

    if (value.length > 50) {
      return { error: 'Name ist zu lang!' };
    }

    if (this.availableSandboxes.find(exp => exp.name.toLowerCase() === value.toLowerCase())) {
      return { error: 'Name existiert bereits' };
    }

    return null;
  }
}
