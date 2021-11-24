import {
  AfterContentInit,
  AfterViewInit,
  Component,
  ContentChildren,
  EventEmitter, Input, OnChanges,
  OnInit,
  Output,
  QueryList,
  SimpleChanges, TemplateRef, ViewChild, ViewChildren, ViewContainerRef, ViewRef
} from '@angular/core';
import {TabComponent} from 'src/app/tab/tab/tab.component';
import {TabTemplateDirective} from 'src/app/tab/tab-template.directive';
import {Tab} from 'src/app/tab/model/tab.model';

@Component({
  selector: 'app-tab-group',
  templateUrl: './tab-group.component.html',
  styleUrls: ['./tab-group.component.scss']
})
export class TabGroupComponent implements AfterContentInit {
  @ContentChildren(TabTemplateDirective, {descendants: true})
  templates?: QueryList<TabTemplateDirective>;

  @Output()
  close = new EventEmitter<number>();

  @ViewChild('tabcontainer', { read: ViewContainerRef })
  viewContainerRef?: ViewContainerRef;

  @Input()
  dataSource: Tab[] = [];

  _activeTab?: Tab;
  set activeTab(value) {
    this._activeTab = value;
    this.viewContainerRef?.detach();
    if (value) {
      if (!value.view) {
        const directive = this.templates?.find(template => template.type === value.type);
        value.view = this.viewContainerRef?.createEmbeddedView(directive!.templateRef);
      } else {
        this.viewContainerRef?.insert(value.view);
      }
    }
  }
  get activeTab() {
    return this._activeTab;
  }
  scrollPosition = 0;

  constructor() {
  }

  ngAfterContentInit(): void {
    setTimeout(() => {
      this.activeTab = this.dataSource[0];
    });
  }

  handleScroll(event: WheelEvent) {
    this.scrollPosition += event.deltaY;
    this.scrollPosition = Math.min(Math.max(0, this.scrollPosition), (event.target as HTMLElement).scrollWidth);
    event.preventDefault();
  }

  startDrag(event: DragEvent, tab: TabTemplateDirective): void {

  }
}
