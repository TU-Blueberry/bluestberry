import { Component, Input, OnInit } from '@angular/core';
import { FilesystemService } from '../filesystem.service';

@Component({
  selector: 'app-file',
  templateUrl: './file.component.html',
  styleUrls: ['./file.component.scss']
})
export class FileComponent implements OnInit {

  @Input('depth') depth: number = 0;
  @Input('path') path: string = '';
  @Input('ref') ref: any;
  constructor(private fsService: FilesystemService) { }

  ngOnInit(): void {
  }

  deleteFile(ev: Event) {
    ev.stopPropagation();
    ev.preventDefault();
    this.fsService.deleteFile(this.path);
  }

}
