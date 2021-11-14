import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-file',
  templateUrl: './file.component.html',
  styleUrls: ['./file.component.scss']
})
export class FileComponent implements OnInit {

  @Input('depth') depth: number = 0;
  @Input('path') path: string = '';
  @Input('ref') ref: any;
  constructor() { }

  ngOnInit(): void {
  }

}
