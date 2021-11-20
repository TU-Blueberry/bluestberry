import { Component, Input } from '@angular/core';
import { EventService } from '../events/event.service';
import { FilesystemService } from '../filesystem.service';

@Component({
  selector: 'app-file',
  templateUrl: './file.component.html',
  styleUrls: ['./file.component.scss']
})
export class FileComponent {

  @Input('depth') depth: number = 0;
  @Input('path') path: string = '';
  @Input('ref') ref?: FSNode;
  constructor(private fsService: FilesystemService, private ev: EventService) { }

  deleteFile(ev: Event) {
    ev.stopPropagation();
    ev.preventDefault();
    this.fsService.deleteFile(this.path);
    this.fsService.sync(false).subscribe();
  }

  onDoubleClick(): void {
    if (this.ref?.contents instanceof Uint8Array) {
      this.ev.onUserOpenFile(this.path, this.ref?.contents)
    }
  }
}
