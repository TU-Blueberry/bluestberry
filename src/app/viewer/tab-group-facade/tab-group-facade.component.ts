import {Component, Input, OnInit} from '@angular/core';
import { Tab } from 'src/app/tab/model/tab.model';
import { TabManagementService } from 'src/app/tab/tab-management.service';

@Component({
  selector: 'app-tab-group-facade',
  templateUrl: './tab-group-facade.component.html',
  styleUrls: ['./tab-group-facade.component.scss']
})
export class TabGroupFacadeComponent implements OnInit {

  @Input()
  id = '';

  constructor(private tabService: TabManagementService) { }

  ngOnInit(): void {
  }

  updateTabGroup(tabs: Tab[]): void {
    this.tabService.updateTabGroups(this.id, tabs);
  }

  updateActiveTab(active: Tab | undefined) {
    this.tabService.updateActiveTabs(this.id, active);
  }
}
