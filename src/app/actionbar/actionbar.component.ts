import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-actionbar',
  templateUrl: './actionbar.component.html',
  styleUrls: ['./actionbar.component.scss']
})
export class ActionbarComponent implements OnInit {
  showFiles = false;

  constructor() { }

  ngOnInit(): void {
  }

  toggleFiles(): void {
    this.showFiles = !this.showFiles;
  }
}
