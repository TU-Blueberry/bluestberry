import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-image-viewer',
  templateUrl: './image-viewer.component.html',
  styleUrls: ['./image-viewer.component.scss']
})
export class ImageViewerComponent implements OnInit {

  @Input()
  get imagePath(): string { return this._image_path; }
  set imagePath(path: string) {
    this._image_path = path || 'assets/blueberry.png';
  }

  private _image_path = '';

  constructor() { }

  ngOnInit(): void {
  }

}
