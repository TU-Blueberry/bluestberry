import {
  AfterContentInit,
  AfterViewInit,
  Component,
  ContentChildren,
  EventEmitter, OnChanges,
  OnInit,
  Output,
  QueryList,
  SimpleChanges
} from '@angular/core';
import {TabViewComponent} from 'src/app/viewer/tab-view/tab-view.component';

@Component({
  selector: 'app-tab-group',
  templateUrl: './tab-group.component.html',
  styleUrls: ['./tab-group.component.scss']
})
export class TabGroupComponent implements AfterContentInit {
  @ContentChildren(TabViewComponent, {descendants: true})
  tabs?: QueryList<TabViewComponent>;

  @Output()
  close = new EventEmitter<number>();

  activeTab?: TabViewComponent;
  scrollPosition = 0;

  constructor() {
  }

  ngAfterContentInit(): void {
    setTimeout(() => {
      this.activeTab = this.tabs?.first;
    });
  }

  handleScroll(event: WheelEvent) {
    this.scrollPosition += event.deltaY;
    this.scrollPosition = Math.min(Math.max(0, this.scrollPosition), (event.target as HTMLElement).scrollWidth);
    event.preventDefault();
  }
}
