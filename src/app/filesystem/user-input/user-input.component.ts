import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FilesystemService } from '../filesystem.service';
import { AbstractControl, FormControl, FormGroup, ValidationErrors } from '@angular/forms';

@Component({
  selector: 'app-user-input',
  templateUrl: './user-input.component.html',
  styleUrls: ['./user-input.component.scss']
})
export class UserInputComponent implements OnInit, OnChanges, AfterViewInit {
  folderContent: FSNode[] = [];
  fileRegex = new RegExp(/[a-zA-Z\d-_]+\.[a-zA-Z\d]{2,5}$/, "i");
  extensionRegex = new RegExp(/\.[a-zA-Z\d]{2,5}$/, "i");
  folderRegex = new RegExp(/[a-zA-Z\d-_]+/, "i");
  inputText = '';
  nameFormControl: FormControl;
  formGroup: FormGroup;

  @Input() parentPath?: string = '';
  @Input() isFile: boolean = false;
  @Input() depth?: number = -1;
  @Input() editMode: boolean = false;
  @Input() currentName?: string;

  @Output() onSubmit: EventEmitter<{newName: string, isFile: boolean}> = new EventEmitter();
  @Output() dismiss: EventEmitter<void> = new EventEmitter();
  @Output() currentValue: EventEmitter<Event> = new EventEmitter();

  @ViewChild("userInput") inputElement!: ElementRef;
  constructor(private fsService: FilesystemService, private ref: ElementRef) {
    this.nameFormControl = new FormControl(this.inputText, { updateOn: "submit", validators: this.validateInput.bind(this)});
    this.formGroup = new FormGroup({
      nameFormControl: this.nameFormControl 
    });
   }

  ngOnInit(): void {
    if (this.parentPath && this.depth && this.parentPath !== '' && this.depth >= 0) {
      this.fsService.scan(this.parentPath, this.depth, this.isFile).subscribe(([folders, files]) => {
        this.folderContent = this.isFile ? files : folders;
      });
    }

    if (this.currentName) {
      this.formGroup.get('nameFormControl')?.setValue(this.currentName);
    }
  }

  ngAfterViewInit(): void {
    (this.inputElement.nativeElement as HTMLInputElement).focus();
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
    event.preventDefault();
    event.stopPropagation();

    if(!this.ref.nativeElement.contains(event.target)) {
      this.dismiss.emit();
    } 
  }

  @HostListener('document:keydown.escape', ['$event']) 
  onEscapeHandler(event: KeyboardEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dismiss.emit();
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

    const testResult = regex.test(control.value);

    if (testResult) {
      return null;
    } else {
      if (this.isFile) {
        if (!this.extensionRegex.test(control.value)) {
          return { error: 'Ungültige Dateierweiterung (zwischen 2 und 5 Buchstaben/Zahlen sind erlaubt)'}
        }
      }
      
      return { error: "Ungültiger Name. Es dürfen nur Nur Buchstaben, Zahlen sowie Binde- und Unterstriche sind als Dateiname zulässig"}
    }
  }
}

