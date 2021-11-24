import {Component, Input, TemplateRef, ViewChild} from '@angular/core';

@Component({
  selector: 'app-tab',
  templateUrl: './tab.component.html',
  styleUrls: ['./tab.component.scss']
})
export class TabComponent {
  @Input()
  templateRef: TemplateRef<any> | null = null;

  @ViewChild(TemplateRef)
  content: TemplateRef<any> | null = null;

  constructor() {
  }
}
