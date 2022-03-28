import { Component } from '@angular/core';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  showImport = false;

  constructor() { }

  openImport(ev: Event): void {
    ev.stopPropagation();
    this.showImport = true;
  }

  closeImport(): void {
    this.showImport = false;
  }
}
