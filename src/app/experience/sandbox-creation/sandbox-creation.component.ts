import { Component, EventEmitter, Output } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidationErrors } from '@angular/forms';
import { FilesystemService } from 'src/app/filesystem/filesystem.service';
import { ExperienceManagementService } from '../experience-management/experience-management.service';
import { Experience } from '../model/experience';

@Component({
  selector: 'app-sandbox-creation',
  templateUrl: './sandbox-creation.component.html',
  styleUrls: ['./sandbox-creation.component.scss']
})
export class SandboxCreationComponent {
  public nameFormControl: FormControl;
  public formGroup: FormGroup;
  private availableSandboxes: Experience[] = [];

  @Output() cancel = new EventEmitter<void>();
  @Output() create = new EventEmitter<string>();
  constructor(public expMgmt: ExperienceManagementService, private fsService: FilesystemService) { 
    this.nameFormControl = new FormControl('', { updateOn: "change", validators: this.validateInput.bind(this) });
    this.formGroup = new FormGroup({
      nameFormControl: this.nameFormControl 
    });

    this.expMgmt.experiences$.subscribe(experiences => { 
      this.availableSandboxes = experiences.sandboxes;
    });
  }

  public onCancel(): void {
    this.cancel.emit();
  }

  public onSubmit(): void {
    if (!this.formGroup.invalid) {
      this.create.emit(this.nameFormControl.value);
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

    if (value.trim().startsWith("glossary")) {
      return { error: "Name darf nicht mit 'glossary' beginnen" }; 
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
