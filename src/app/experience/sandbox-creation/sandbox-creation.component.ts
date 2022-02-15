import { Component, EventEmitter, Output } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidationErrors } from '@angular/forms';
import { ExperienceManagementService } from '../experience-management/experience-management.service';
@Component({
  selector: 'app-sandbox-creation',
  templateUrl: './sandbox-creation.component.html',
  styleUrls: ['./sandbox-creation.component.scss']
})
export class SandboxCreationComponent {
  public nameFormControl: FormControl;
  public formGroup: FormGroup;

  @Output() cancel = new EventEmitter<void>();
  @Output() create = new EventEmitter<string>();
  constructor(public expMgmt: ExperienceManagementService) { 
    this.nameFormControl = new FormControl('', { updateOn: "change", validators: this.validateInput.bind(this) });
    this.formGroup = new FormGroup({
      nameFormControl: this.nameFormControl 
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

    if (value.length > 50) {
      return { error: 'Name ist zu lang!' };
    }

    return null;
  }
}
