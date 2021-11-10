import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  ViewChild,
  HostListener
} from '@angular/core';

@Component({
  selector: 'app-image-viewer',
  templateUrl: './image-viewer.component.html',
  styleUrls: ['./image-viewer.component.scss'],
})
export class ImageViewerComponent implements AfterViewInit {

  @ViewChild('imageContainer', { read: ElementRef, static: false })
  imageContainer: ElementRef;

  @ViewChild('imageLoaded', { read: ElementRef, static: false })
  imageLoaded: ElementRef;

  @Input()
  get imagePath(): string {
    return this._image_path;
  }
  set imagePath(path: string) {
    this._image_path = path || 'assets/blueberry.png';
  }

  constructor() {}

  ngAfterViewInit(): void {
    this._original_image_width = this.imageLoaded.nativeElement.naturalWidth;
    this._original_image_height = this.imageLoaded.nativeElement.naturalHeight;
    this._original_image_ratio =
      this._original_image_width / this._original_image_height;

    this._image_width = this._original_image_width;
    this._image_height = this._original_image_height;

    if (this._image_height > 0 && this._image_width > 0) {
      this.onResize();
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this._container_width = this.imageContainer.nativeElement.offsetWidth;
    this._container_height = this.imageContainer.nativeElement.offsetHeight;

    this.calculateImageDimensions();

    this.imageLoaded.nativeElement.width = this._image_width;
    this.imageLoaded.nativeElement.height = this._image_height;
  }

  calculateImageDimensions(): void {
    if (this._image_width > this._container_width) {
      this._image_width = this._container_width;
      this._image_height = this._image_width / this._original_image_ratio;
    }

    if (this._image_height > this._container_height) {
      this._image_height = this._container_height;
      this._image_width = this._original_image_ratio * this._image_height;
    }
  }

  get hoverMode(): string {
    if (this._zoom_in) {
      return 'zoom-in';
    }
    return 'zoom-out';
  }

  @HostListener('window:keydown.control', ['$event'])
  onKeydownEvent($event: KeyboardEvent) {
    if (this._hover_img) {
      this._zoom_in = false;
    }
  }

  @HostListener('window:keyup.control', ['$event'])
  onKeyupEvent($event: KeyboardEvent) {
    this._zoom_in = true;
  }
  
  mouseOver(event: any): void {
    this._hover_img = true;
  }

  mouseOut(event: any): void {
    this._hover_img = false;
  }

  private _image_path = '';
  private _image_width = 50;
  private _image_height = 50;

  private _container_width = 0;
  private _container_height = 0;

  private _original_image_width = 0;
  private _original_image_height = 0;
  private _original_image_ratio = 0;

  private _zoom_in = true;
  private _hover_img = false;
}
