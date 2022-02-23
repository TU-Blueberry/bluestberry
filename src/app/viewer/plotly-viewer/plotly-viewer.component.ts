import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
} from '@angular/core'
import { FileTabDirective } from 'src/app/tab/file-tab.directive'

@Component({
  selector: 'app-plotly-viewer',
  templateUrl: './plotly-viewer.component.html',
  styleUrls: ['./plotly-viewer.component.scss'],
})
export class PlotlyViewerComponent implements AfterViewInit {
  constructor(private fileTabDirective: FileTabDirective) {}

  @ViewChild('iframe')
  iframe!: ElementRef

  ngAfterViewInit(): void {
    this.fileTabDirective.dataChanges.subscribe((data) => {
      var htmlContent = new TextDecoder().decode(data)
       this.iframe.nativeElement.setAttribute('srcdoc', htmlContent)
    })
  }
}
