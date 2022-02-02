import { Component, OnInit, ViewChild } from '@angular/core';
import { UiEventsService } from 'src/app/ui-events.service';
import { SplitComponent } from 'angular-split';
import { SplitAreaSettings } from '../model/split-settings';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { ViewSizeState } from '../states/sizes.state';
import { ResizeMain } from '../actions/resize-main.action';
import { ViewSizeDefaults } from '../model/view-defaults';
import { ResizeTerminal } from '../actions/resize-terminal.action';

@Component({
  selector: 'app-main-viewer',
  templateUrl: './main-viewer.component.html',
  styleUrls: ['./main-viewer.component.scss']
})
export class MainViewerComponent implements OnInit {
  // pixel
  readonly collapseSize = 34;
  readonly navbarHeight = 48;
  readonly minHeightExpanded = 200;

  mainSizes$: Observable<any>;

  public viewSettings: {[id: string]: SplitAreaSettings} =  {
    'filetree': { group: 0, order: 0, size: 20, visible: true, minSize: ViewSizeDefaults.minSizeFiletree, maxSize: ViewSizeDefaults.maxSizeFiletree },
    'left': { group: 0, order: 1, size: 0, visible: false, minSize: ViewSizeDefaults.minSizeTab, maxSize: ViewSizeDefaults.maxSizeTab },
    'right': { group: 0, order: 2, size: 0, visible: false, minSize: ViewSizeDefaults.minSizeTab, maxSize: ViewSizeDefaults.maxSizeTab },
    'emptyMessage': { group: 0, order: 3, size: 100, visible: true, minSize: 0, maxSize: 100 },
    'code': { group: 1, order: 0, size: 100, visible: true, minSize: ViewSizeDefaults.minSizeTop, maxSize: ViewSizeDefaults.maxSizeTop },
    'terminal': { group: 1, order: 1, size: 20, visible: false, minSize: ViewSizeDefaults.minSizeTerminal, maxSize: ViewSizeDefaults.maxSizeTerminal }
}

  @ViewChild("sidebar") sidebar?: SplitComponent; 
  constructor(private uiEv: UiEventsService, private store: Store) { 
      this.mainSizes$ = this.store.select(ViewSizeState);
    }

  ngOnInit(): void {
    this.mainSizes$.subscribe(s => this.viewSettings = s);
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