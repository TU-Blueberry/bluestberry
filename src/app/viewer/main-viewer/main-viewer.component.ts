import { Component, ViewChild } from '@angular/core';
import { UiEventsService } from 'src/app/ui-events.service';
import { SplitComponent } from 'angular-split';
import { SplitAreaSettings } from '../model/split-settings';
import { Store } from '@ngxs/store';
import { ViewSizeState } from '../sizes.state';
import { ResizeMain } from '../actions/resize-main.action';
import { ViewDefaultSettings } from '../model/view-defaults';
import { ResizeTerminal } from '../actions/resize-terminal.action';
import { ViewSettings } from '../model/view-settings';

@Component({
  selector: 'app-main-viewer',
  templateUrl: './main-viewer.component.html',
  styleUrls: ['./main-viewer.component.scss']
})
export class MainViewerComponent {
  // pixel
  readonly collapseSize = 34;
  readonly navbarHeight = 48;
  readonly minHeightExpanded = 200;

  public viewSettings: ViewSettings = ViewDefaultSettings;
  @ViewChild("sidebar") sidebar?: SplitComponent; 
  constructor(private uiEv: UiEventsService, private store: Store) { 
    this.store.select<ViewSettings>(ViewSizeState).subscribe(s => {
      this.viewSettings = s;
    });
  }

  // minSize doesnt work, see https://github.com/angular-split/angular-split/issues/255
  public updateSidebarSizes(isGlossary: boolean, isExpanded: boolean) {
    const directive = isGlossary ? this.sidebar?.displayedAreas[1] : this.sidebar?.displayedAreas[0] 
    let size: number;

    if (isExpanded) {
      size = Math.max(this.minHeightExpanded, (directive!.sizeBeforeCollapse || 0))
      directive!.sizeBeforeCollapse = size;
      directive?.component.expand();
    } else {
      size = directive?.component.elRef.nativeElement.clientHeight;
      directive?.component.collapse(this.collapseSize);
      directive!.sizeBeforeCollapse = size;
    }
  }

  // event only returns an array of sizes (ordered by the component's order number) 
  public onDragEnd(ev: any): void {
    this.store.dispatch(new ResizeMain(ev.sizes, 0));
  }

  public onDragEndLeftGroup(ev: any): void {
    this.store.dispatch(new ResizeTerminal(ev.sizes, 1));
  }

  public onRightClick(ev: MouseEvent, isGlossary: boolean) {
    this.uiEv.clickOutsideOfFiletree(ev, isGlossary);
  }
}
