import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FilesystemService } from '../filesystem.service';
import { isSystemDirectory } from '../shared/system_folder';
import { AbstractControl, FormControl, FormGroup, ValidationErrors } from '@angular/forms';

@Component({
  selector: 'app-user-input',
  templateUrl: './user-input.component.html',
  styleUrls: ['./user-input.component.scss']
})
export class UserInputComponent implements OnInit, OnChanges {
  folderContent: FSNode[] = [];
  fileRegex = new RegExp(/[a-zA-Z\d-_]+\.[a-zA-Z]{2,5}$/, "i");
  folderRegex = new RegExp(/[a-zA-Z\d-_]+/, "i");
  inputText = '';
  nameFormControl: FormControl;
  formGroup: FormGroup;

  @Input() parentPath: string = '';
  @Input() isFile: boolean = false;
  @Input() depth: number = -1;
  @Input() editMode: boolean = false;
  @Input() currentName?: string;

  @Output() onSubmit: EventEmitter<{newName: string, isFile: boolean}> = new EventEmitter();
  @Output() dismiss: EventEmitter<void> = new EventEmitter();
  constructor(private fsService: FilesystemService, private ref: ElementRef) {
    this.nameFormControl = new FormControl(this.inputText, { updateOn: "submit", validators: this.validateInput.bind(this)});
    this.formGroup = new FormGroup({
      nameFormControl: this.nameFormControl 
    });
   }

  ngOnInit(): void {
    if (this.parentPath !== '' && !isSystemDirectory(this.parentPath) && this.depth >= 0) {
      const [folders, files] = this.fsService.scan(this.parentPath, this.depth, this.isFile);
      this.folderContent = this.isFile ? files : folders;
    }

    if (this.currentName) {
      this.formGroup.get('nameFormControl')?.setValue(this.currentName);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    const parentChanges = changes['parentPath'];
    const fileChanges = changes['isFile'];

    if (parentChanges.currentValue !== parentChanges.previousValue || fileChanges.currentValue !== fileChanges.previousValue) {
      this.ngOnInit();
    }
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    if(!this.ref.nativeElement.contains(event.target)) {
      this.dismiss.emit();
    } 
  }

  onSubmitClicked(): void {
    if (this.formGroup.valid) {
      this.onSubmit.emit({newName: this.nameFormControl.value, isFile: this.isFile});
    }
  }

  // TODO: Add more fine grained checks
  validateInput(control: AbstractControl): ValidationErrors | null {
    const regex = this.isFile ? this.fileRegex : this.folderRegex;
    const value: string = control.value;

    if (value.trim() === '') {
      return { error: 'Name muss aus mindestens einem nicht-leeren Zeichen bestehen'};
    }

    if (value.includes("/")) {
      return { error: 'Name darf keine Schrägstriche enthalten'}
    }

    if (this.folderContent.filter(node => node.name === value).length > 0) {
      return { error: 'Name wird bereits verwendet'}
    }

    return regex.test(control.value) ? null :  { error: "Ungültiger Name. Nur Buchstaben, Zahlen sowie Binde- und Unterstriche sind als Dateiname zulässig"}
  }
}

