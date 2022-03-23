import { Component } from '@angular/core';
import { FileTypes } from '../files/filetypes.enum';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})

export class AboutComponent {
  icons = FileTypes.icons;

  constructor() { }
}