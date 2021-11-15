import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-hint-viewer',
  templateUrl: './hint-viewer.component.html',
  styleUrls: ['./hint-viewer.component.scss']
})
export class HintViewerComponent implements OnInit {

  // https://material.angular.io/cdk/overlay/examples#cdk-overlay-basic

  constructor() { }

  ngOnInit(): void {
  }

  toggleHints(): void {
    console.log("toggleHints");
    this.is_open_ = !this.is_open_;
  }

  is_open_ = false;

}
