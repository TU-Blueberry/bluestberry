import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { UiEventsService } from 'src/app/ui-events.service';
import { FilesystemService } from 'src/app/filesystem/filesystem.service';
import { TabManagementService } from 'src/app/tab/tab-management.service';
import { GuidedTourService } from "ngx-guided-tour";
import { tour } from "../../../assets/guided-tour/guided-tour.data";
import { SplitComponent } from 'angular-split';
import { Tab } from 'src/app/tab/model/tab.model';
import { SplitAreaSettings } from '../model/split-settings';

@Component({
  selector: 'app-main-viewer',
  templateUrl: './main-viewer.component.html',
  styleUrls: ['./main-viewer.component.scss']
})
export class MainViewerComponent implements OnInit {
  filetreeVisible = true;
  terminalVisible = true;

  // percent of parent width
  readonly minSizeFiletree = 10;
  readonly maxSizeFiletree = 30;
  readonly minSizeTab = 10;
  readonly maxSizeTab = 100;
  
  // pixel
  readonly collapseSize = 34;
  readonly navbarHeight = 48;
  readonly minHeightExpanded = 200;

  private _tabs: { [id: string]: Tab[]} = { 'left': [], 'right': []};
  public _splitAreaOptions : Map<string, SplitAreaSettings> = new Map([ // use map to guarantee order of insertion when iterating 
    ['filetree', { size: this.minSizeFiletree, visible: true }],
    ['left', { size: 0, visible: false }],
    ['right', { size: 0, visible: false }],
    ['emptyMessage', { size: 0, visible: true }]
  ])

  @ViewChild("sidebar") sidebar?: SplitComponent;
  @ViewChild("parent") parent?: SplitComponent;
  constructor(private uiEv: UiEventsService, private fsService: FilesystemService, private guidedTourService: GuidedTourService,
    private tabManagementService: TabManagementService, private cd: ChangeDetectorRef) { 
      this.tabManagementService.currentlyOpenTabs$.subscribe((tabs) => {
        this.updateTabSizes(tabs);
      });
  }

  ngOnInit(): void {
    this.uiEv.onToggleTerminal.subscribe(() => this.terminalVisible = !this.terminalVisible);
    this.uiEv.onStartTour.subscribe(() => {
        this.filetreeVisible = true;
        this.terminalVisible = true;
        this.guidedTourService.startTour(tour);
    });
    this.uiEv.onHintChange.subscribe(() => {
      // TODO
      const path = "/abc/hint_files/root.yml"

      this.fsService.getFileAsBinary(path).subscribe(data => {
        this.tabManagementService.openHintsManually({path: path, content: data});
      });
    });
  }

  // TODO: Zeug in Service verschieben
  public updateTabSizes(tabGroups: { [id: string]: Tab[] }) {
    const change = this.getChangeOriginAndType(tabGroups);
    const visible = change.type === 'open';

    if (change.type !== 'other') {
      this._splitAreaOptions.get(change.id)!.visible = visible;
      this._splitAreaOptions.get(change.id)!.size = 0;
      this._splitAreaOptions.get('emptyMessage')!.visible = this.isEmpty();
      this.cd.detectChanges(); // manual call necessary, otherwise displayedAreas wouldn't update in time
      this.redistribute();
    }
    
    this._tabs = Object.assign(this._tabs, {...tabGroups})
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
  // we assume that splitAreaOptions uses the same ordering as the components
  public onDragEnd(ev: any): void {
    this.parent?.setVisibleAreaSizes(ev.sizes);

    [...this._splitAreaOptions.entries()]
      .filter(([_, options]) => options.visible)
      .forEach(([_, settings], index) => settings.size = ev.sizes[index])
  }

  // find first tab group where either its last tab was closed or its first tab was opened
  private getChangeOriginAndType(tabs: {[id: string]: Tab[]}) {
    const hasChange = Object.entries(tabs).find(([id, tabs]) => (this._tabs[id].length === 1 && tabs.length === 0) 
                                                             || (this._tabs[id].length === 0 && tabs.length === 1))

    if (hasChange) {
      const [id, tabs] = hasChange;
      return { id: id, type: tabs.length === 0 ? 'close' : 'open' }
    } else {
      return { id: '', type: 'other'}
    }
  }

  // equally redistribute space to all visible tab groups
  // if filetree is currently visible, its current size will be subtracted before redistributing
  private redistribute() {
    let areas = this.parent?.displayedAreas;

    if (areas) {
      const length = areas.length;
      const filetreeSettings = this._splitAreaOptions.get('filetree')

      const sizes = areas.map((_, index) => {
        if (!filetreeSettings?.visible) {
          return 100 / length;
        } else {
          return index === 0 ? filetreeSettings.size : (100 - filetreeSettings.size) / (length - 1)
        }        
      })
      
      this.parent?.setVisibleAreaSizes(sizes);
      [...this._splitAreaOptions.entries()]
          .filter(([_, options]) => options.visible)
          .forEach(([_, settings], index) => settings.size = sizes[index])
    }
  }

  public onRightClick(ev: MouseEvent, isGlossary: boolean) {
    this.uiEv.clickOutsideOfFiletree(ev, isGlossary);
  }

  public getVisibility(id: string): boolean {
    const mapRes = this._splitAreaOptions.get(id);
    return mapRes ? mapRes.visible : false;
  }

  // empty if no tab group is visible
  private isEmpty(): boolean {
    return ![...this._splitAreaOptions.entries()]
      .filter(([id, _]) => id !== 'filetree' && id !== 'emptyMessage')
      .map(([_, settings]) => settings.visible)
      .reduce((a, b) => a || b)
  }
}