import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FilesystemService } from '../filesystem.service';
import { isSystemDirectory } from '../shared/system_folder';
import { AbstractControl, FormControl, ValidationErrors } from '@angular/forms';

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
  nameFormControl = new FormControl('', this.validateInput)

  @Input() parentPath: string = '';
  @Input() isFile: boolean = false;
  @Input() depth: number = -1;
  @Input() editMode: boolean = false;
  @Input() currentName?: string;

  @Output() onSubmit: EventEmitter<string> = new EventEmitter();
  constructor(private fsService: FilesystemService) { }

  ngOnInit(): void {
    if (this.parentPath !== '' && !isSystemDirectory(this.parentPath) && this.depth >= 0) {
      const [folders, files] = this.fsService.scan(this.parentPath, this.depth, this.isFile);

      this.folderContent = this.isFile ? files : folders;
    }

    if (this.currentName) {
      this.nameFormControl.setValue(this.currentName);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    const parentChanges = changes['parentPath'];
    const fileChanges = changes['isFile'];

    if (parentChanges.currentValue !== parentChanges.currentValue || fileChanges.currentValue !== fileChanges.previousValue) {
      this.ngOnInit();
    }
  }

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

    // Called when button is pressed (or ENTER probably)
    create(): void {
      if (this.nameFormControl.valid) {
        this.onSubmit.emit(this.inputText);
      }
    }

}

  // TODO: Folder actions in eigene komponente auslagern? sind ja bei beiden gleich no?

  // TODO Delete on focus lost

  /**
   * 
   * file:
- input feld
- <min 1x (alles außer whitespace)>.<min 2, max 5 buchstaben>
- datei mit gleichem namen (inkl. erweiterung) darf im aktuellen ordner noch nicht existieren

folder:
input feld
min 1x alles außer whitespace
order mit gleichem namen darf im aktuellen ordner noch nicht existieren

   */


