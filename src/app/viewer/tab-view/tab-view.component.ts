import {Component, ContentChild, Input, OnInit, TemplateRef, ViewChild} from '@angular/core';

@Component({
  selector: 'app-tab-view',
  templateUrl: './tab-view.component.html',
  styleUrls: ['./tab-view.component.scss']
})
export class TabViewComponent {
  @Input()
  title = '';

  @ViewChild(TemplateRef)
  content: TemplateRef<any> | null = null;

  constructor() {
  }
}
