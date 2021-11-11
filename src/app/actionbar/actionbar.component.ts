import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-actionbar',
  templateUrl: './actionbar.component.html',
  styleUrls: ['./actionbar.component.scss']
})
export class ActionbarComponent implements OnInit {
  showFiles = false;
  showTestOverlay = false;

  constructor() { }

  ngOnInit(): void {
  }

  toggleFiles(): void {
    this.showFiles = !this.showFiles;
  }

  showTests(): void {
    this.showTestOverlay = true;
  }
}