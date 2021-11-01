import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-filetree',
  templateUrl: './filetree.component.html',
  styleUrls: ['./filetree.component.scss']
})
export class FiletreeComponent implements OnInit {
  showOfficialFiles = false;
  showCustomFiles = false;

  constructor() { }

  ngOnInit(): void {
  }

  toggleOfficialFiles(): void {
    this.showOfficialFiles = !this.showOfficialFiles;
  }

  toggleCustomFiles(): void {
    this.showCustomFiles = !this.showCustomFiles;
  }


}
