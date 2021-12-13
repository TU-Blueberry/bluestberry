import {Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'app-tab-group-facade',
  templateUrl: './tab-group-facade.component.html',
  styleUrls: ['./tab-group-facade.component.scss']
})
export class TabGroupFacadeComponent implements OnInit {

  @Input()
  id = '';

  constructor() { }

  ngOnInit(): void {
  }

}
