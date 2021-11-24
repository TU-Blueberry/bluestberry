import { Component, Input } from '@angular/core';
import { FilesystemService } from '../filesystem.service';

@Component({
  selector: 'app-file',
  templateUrl: './file.component.html',
  styleUrls: ['./file.component.scss']
})
export class FileComponent {

  @Input('depth') depth: number = 0;
  @Input('path') path: string = '';
  @Input('ref') ref: any;
  constructor(private fsService: FilesystemService) { }

  deleteFile(ev: Event) {
    ev.stopPropagation();
    ev.preventDefault();
    this.fsService.deleteFile(this.path);
    this.fsService.sync(false).subscribe();
  }
}
