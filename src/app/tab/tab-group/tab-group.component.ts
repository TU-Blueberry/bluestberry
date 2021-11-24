import {
  AfterContentInit,
  Component,
  ContentChildren,
  EventEmitter,
  Input,
  Output,
  QueryList,
  ViewChild,
  ViewContainerRef
} from '@angular/core';
import {TabTemplateDirective} from 'src/app/tab/tab-template.directive';
import {Tab} from 'src/app/tab/model/tab.model';

@Component({
  selector: 'app-tab-group',
  templateUrl: './tab-group.component.html',
  styleUrls: ['./tab-group.component.scss']
})
export class TabGroupComponent implements AfterContentInit {
  scrollPosition = 0;

  @ContentChildren(TabTemplateDirective, {descendants: true})
  templates?: QueryList<TabTemplateDirective>;

  @ViewChild('tabcontainer', { read: ViewContainerRef })
  viewContainerRef?: ViewContainerRef;

  @Input()
  dataSource: Tab[] = [];

  @Output()
  dataSourceChange = new EventEmitter<Tab[]>();

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
    //TBD
  }

  closeTab(index: number) {
    const tab = this.dataSource[index];
    tab.view?.destroy();
    this.dataSource.splice(index, 1);
    this.dataSourceChange.emit(this.dataSource);
    if (this._activeTab === tab) {
      // if activeTab is closed, set activeTab to tab on the right. If last tab is closed, set to tab on the left.
      // setter handles undefined correctly (in case last tab is closed)
      this.activeTab = this.dataSource[index] || this.dataSource[index - 1];
    }
  }
}
