import {AfterContentInit, AfterViewInit, Component, ContentChildren, OnInit, QueryList} from '@angular/core';
import {TabViewComponent} from 'src/app/viewer/tab-view/tab-view.component';

@Component({
  selector: 'app-tab-group',
  templateUrl: './tab-group.component.html',
  styleUrls: ['./tab-group.component.scss']
})
export class TabGroupComponent implements OnInit, AfterContentInit {
  @ContentChildren(TabViewComponent, { descendants: true })
  tabs?: QueryList<TabViewComponent>;

  activeTab?: TabViewComponent;

  constructor() { }

  ngOnInit(): void {
    console.log(`${this.tabs}`);
  }

  ngAfterContentInit() {
    setTimeout(() => {
      this.activeTab = this.tabs?.first;
    });
  }
}
