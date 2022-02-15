import { ChangeDetectorRef, Component } from '@angular/core';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  showImport = false;

  constructor(private cd: ChangeDetectorRef) { }

  openImport(ev: Event): void {
    ev.stopPropagation();
    this.showImport = true;
    console.log("set showimport to", this.showImport)
   // this.cd.detectChanges();
  }

  closeImport(): void {
    this.showImport = false;
    console.log("set showimport to", this.showImport)
    // this.cd.detectChanges();
  }
}
