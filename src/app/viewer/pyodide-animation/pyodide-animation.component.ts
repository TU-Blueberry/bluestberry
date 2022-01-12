import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnInit,
  ViewChild,
} from '@angular/core'
import { DomSanitizer } from '@angular/platform-browser'
import { PyodideService } from 'src/app/pyodide/pyodide.service'

@Component({
  selector: 'app-pyodide-animation',
  templateUrl: './pyodide-animation.component.html',
  styleUrls: ['./pyodide-animation.component.scss'],
})
export class PyodideAnimationComponent
  implements OnInit, AfterViewInit, OnChanges
{
  constructor(
    private pyodideService: PyodideService,
    private sanitizer: DomSanitizer
    ) {}

  ngOnInit(): void {
    console.log("pyodide on init");
  }

  ngAfterViewInit(): void {
    console.log("pyodide after view init")

    this.pyodideService.getAfterExecution().subscribe(() => {
      console.log("ngafterviewinit get after execution");

      this.pyodideService.getGlobal('htmlOutput').subscribe(data => console.log(data));

    });
  }

  ngOnChanges(): void {
    this.updateFigure()
    console.log('Updating Figure')
  }

  @Input() updateMessage = 0

  @ViewChild('animationAreaOutput', { static: false })
  public mydiv!: ElementRef

  @ViewChild('animationAreaRender', { static: false })
  public yourDiv!: ElementRef

  @ViewChild('iframe')
  iframe!: ElementRef

  viewContent: any

  updateFigure() {
    console.log('Update figure called! ')

    // this.iframe.nativeElement.setAttribute(
    //     'srcdoc',
    //     this.sanitizer.bypassSecurityTrustHtml(
    //         this.pyodideService.getGlobal('htmlOutput')[0]
    //     )
    // )

    this.pyodideService.getGlobal('htmlOutput').subscribe(data => {
      if(data && data.length > 0) {
        const output = data[0];
        console.log("got html output " + output);

        this.iframe.nativeElement.setAttribute(
          'srcdoc',
          this.sanitizer.bypassSecurityTrustHtml(output)
        );
      } else {
        console.log("no html output")
      }
    });
  }
}
