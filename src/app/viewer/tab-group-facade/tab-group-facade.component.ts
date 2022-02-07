import {Component, Input } from '@angular/core';
import { TabManagementService } from 'src/app/tab/tab-management.service';

@Component({
  selector: 'app-tab-group-facade',
  templateUrl: './tab-group-facade.component.html',
  styleUrls: ['./tab-group-facade.component.scss']
})
export class TabGroupFacadeComponent {

  @Input()
  id = '';

  constructor(private tabService: TabManagementService) { }
}
