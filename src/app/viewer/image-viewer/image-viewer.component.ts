import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  ViewChild,
  HostListener, Output, EventEmitter, OnInit
} from '@angular/core';
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';
import {FileTabDirective} from 'src/app/tab/file-tab.directive';

@Component({
  selector: 'app-image-viewer',
  templateUrl: './image-viewer.component.html',
  styleUrls: ['./image-viewer.component.scss'],
})

export class ImageViewerComponent implements OnInit {

  @ViewChild('imageLoaded', { read: ElementRef, static: false })
  imageLoaded: ElementRef;

  constructor(private domSanitizer: DomSanitizer,
              private fileTabDirective: FileTabDirective) {
  }

  ngOnInit() {
    console.log(this.fileTabDirective)
    this.fileTabDirective.dataChanges.subscribe(data => {
      console.log('data changed');
      this.imagePath = this.domSanitizer.bypassSecurityTrustUrl(
        URL.createObjectURL(
          new Blob([data.content], { type: 'image/png' })
        )
      );
    })
  }

  onImageLoad(evt: Event): void {
    if(evt && evt.target) {
      const img = evt.target as HTMLImageElement;

      this._image_width = img.naturalWidth;
      this._image_height = img.naturalHeight;
      this._original_image_ratio = this._image_width / this._image_height;

      this.changeInitialImageDimensions()
    }
  }

  changeInitialImageDimensions(): void {
    const maxInitialWidth = 600;

    if (this._image_width > maxInitialWidth) {
      this._image_width = maxInitialWidth;
      this._image_height = this._image_width / this._original_image_ratio;
    }

    this._original_image_width = this._image_width;
    this.imageLoaded.nativeElement.width = this._image_width;
    this.imageLoaded.nativeElement.height = this._image_height;

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

  mouseClick(event: any): void {
    if(this._zoom_in) {
      this._zoom_factor += this._zoom_step;
    } else {
      this._zoom_factor -= this._zoom_step;
    }

    this._image_width = this._original_image_width + this._zoom_factor;
    this._image_height = this._image_width / this._original_image_ratio;

    this.imageLoaded.nativeElement.width = this._image_width;
    this.imageLoaded.nativeElement.height = this._image_height;
  }

  imagePath: SafeUrl = '';

  private _image_width = 0;
  private _image_height = 0;

  private _original_image_width = 0;
  private _original_image_ratio = 0;

  private _zoom_factor = 100;
  private _zoom_step = 50;

  private _zoom_in = true;
  private _hover_img = false;
}
