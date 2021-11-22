import { Component, EventEmitter, Input, Output } from '@angular/core';
import { EventService } from '../events/event.service';
import { FilesystemService } from '../filesystem.service';

@Component({
  selector: 'app-file',
  templateUrl: './file.component.html',
  styleUrls: ['./file.component.scss']
})
export class FileComponent {
  isRenaming = false;

  @Input('depth') depth: number = 0;
  @Input('path') path: string = '';
  @Input('ref') ref?: FSNode;
  @Input('parentPath') parentPath: string = '';
  @Output() onDeleteRequested: EventEmitter<boolean> = new EventEmitter();
  constructor(private fsService: FilesystemService, private ev: EventService) { }

  deleteFile(ev: Event) {
    ev.stopPropagation();
    ev.preventDefault();
    this.fsService.deleteFile(this.path);
    this.fsService.sync(false).subscribe();
  }

  onDoubleClick(): void {
    if (this.ref?.contents instanceof Uint8Array) {
      this.ev.onUserOpenFile(this.path, this.ref)
    }
  }

  startRenaming(ev: Event): void {
    ev.stopPropagation();
    ev.preventDefault();
    this.isRenaming = true;
  }

  cancelRenaming(): void {
    this.isRenaming = false;
  }

  changeName(params: {newName: string, isFile: boolean}): void {
    this.isRenaming = false;

    if (this.ref) {
      this.fsService.rename(`${this.parentPath}/${this.ref.name}`, `${this.parentPath}/${params.newName}`).subscribe();
    } else {
      this.fsService.createFile(`${this.parentPath}/${params.newName}`, new Uint8Array()).subscribe(() => {}, (err) => console.error(err), () => {
        this.ev.createNewNodeByUser(`${this.parentPath}/${params.newName}`, params.isFile);
    });
    }
  }

  dismissNameChange(): void {
    this.isRenaming = false;
    this.onDeleteRequested.emit(true);
  }
}
