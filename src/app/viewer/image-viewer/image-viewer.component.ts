import { AfterViewChecked, AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';

@Component({
  selector: 'app-image-viewer',
  templateUrl: './image-viewer.component.html',
  styleUrls: ['./image-viewer.component.scss']
})
export class ImageViewerComponent implements AfterViewInit {

  @ViewChild('imageContainer', {read: ElementRef, static: false}) imageContainer: ElementRef;
  @ViewChild('imageLoaded', {read: ElementRef, static: false}) imageLoaded: ElementRef;

  @Input()
  get imagePath(): string { return this._image_path; }
  set imagePath(path: string) {
    this._image_path = path || 'assets/blueberry.png';
  }

  // get imageWidth(): number { 
  //   this.calculateImageDimensions();
  //   return this._image_width;
  // }
  // set imageWidth(width: number) {
  //   this._image_width = width || 100;
  // }

  // get imageHeight(): number { 
  //   this.calculateImageDimensions();
  //   return this._image_height;
  // }
  // set imageHeight(width: number) {
  //   this._image_height = width || 100;
  // }

  private _image_path = '';
  private _image_width = 50;
  private _image_height = 50;

  private _container_width = 0;
  private _container_height = 0;

  private _original_image_width = 0;
  private _original_image_height = 0;
  private _original_image_ratio = 0;

  constructor() { }


  ngAfterViewInit(): void {

    this._container_width = this.imageContainer.nativeElement.offsetWidth;
    this._container_height = this.imageContainer.nativeElement.offsetHeight;

    this._original_image_width = this.imageLoaded.nativeElement.naturalWidth;
    this._original_image_height = this.imageLoaded.nativeElement.naturalHeight;
    this._original_image_ratio = this._original_image_width / this._original_image_height;

    this._image_width = this._original_image_width;
    this._image_height = this._original_image_height;
  
    this.calculateImageDimensions();

    this.imageLoaded.nativeElement.width = this._image_width;
    this.imageLoaded.nativeElement.height = this._image_height;

  }
  
  calculateImageDimensions(): void {

    if(this._image_width > this._container_width) {
      console.log("h1");
      this._image_width = this._container_width;
      this._image_height = this._image_width / this._original_image_ratio;
    }
    
    if(this._image_height > this._container_height) {
      console.log("h2");
      this._image_height = this._container_height;
      this._image_width = this._original_image_ratio * this._image_height;
    }

  }

}
