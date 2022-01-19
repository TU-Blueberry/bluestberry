import { AfterViewInit, Component, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { FileType } from 'src/app/shared/files/filetypes.enum';
import { UiEventsService } from 'src/app/ui-events.service';
import { FilesystemService } from 'src/app/filesystem/filesystem.service';
import { TabManagementService } from 'src/app/tab/tab-management.service';
import { GuidedTourService } from "ngx-guided-tour";
import { tour } from 'src/assets/guided-tour/guided-tour.data';
import { SplitAreaDirective, SplitComponent } from 'angular-split';
import { IArea } from 'angular-split/lib/interface';

@Component({
  selector: 'app-main-viewer',
  templateUrl: './main-viewer.component.html',
  styleUrls: ['./main-viewer.component.scss']
})
export class MainViewerComponent implements OnInit, AfterViewInit {
  filetreeVisible = true;
  terminalVisible = true;
  types = FileType;

  // TODO: left/right side closed + no tab open at all (keep in mind that lesson may be opened with no tabs as well)

  // percent of viewport width
  readonly minSizeFiletree = 10;
  readonly minSizeLeftTab = 10;
  readonly minSizeRightTab = 10;
  readonly maxSizeFiletree = 30;

  readonly collapseSize = 34;
  readonly navbarHeight = 48;
  readonly minHeightExpanded = 200;

  public testHeight = 0;

  public maxSizeLeftTab = 100
  public maxSizeRightTab = 100;

  public currentSizeFiletree = this.minSizeFiletree;
  public currentSizeLeftTab = 45;
  public currentSizeRightTab = 45;

  private lastSizeFiletree = this.currentSizeFiletree;
  private lastSizeLeftTab = 45;
  private lastSizeRightTab = 45;

  private filesDirective?: IArea;
  private glossaryDirective?: IArea;

  @ViewChild(SplitComponent) splitEl!: SplitComponent
  @ViewChildren(SplitComponent) splitEl2!: QueryList<SplitComponent>
  @ViewChildren(SplitAreaDirective) areasEl!: QueryList<SplitAreaDirective>
  constructor(
    private uiEv: UiEventsService,
    private fsService: FilesystemService,
    private guidedTourService: GuidedTourService,
    private tabManagementService: TabManagementService
  ) { }

  onGlossaryExpandChange(isExpanded: boolean): void {
    this.updateSizes(true, isExpanded);
  }

  // minSize doesnt work, see https://github.com/angular-split/angular-split/issues/255
  updateSizes(isGlossary: boolean, isExpanded: boolean) {
    const directive = isGlossary ? this.glossaryDirective : this.filesDirective;
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

  onFilesExpandChange(isExpanded: boolean): void {
    this.updateSizes(false, isExpanded);
  }

  ngAfterViewInit(): void {
    const areas = this.splitEl2?.get(1)?.displayedAreas;
    this.filesDirective = areas?.[0];
    this.glossaryDirective = areas?.[1];
  }

  public onRightClick(ev: MouseEvent, isGlossary: boolean) {
    this.uiEv.clickOutsideOfFiletree(ev, isGlossary);
  }

  test(): void {
    // assumption: lastSize has been set before calling this method
    const hiddenElements = [this.currentSizeFiletree, this.currentSizeLeftTab, this.currentSizeRightTab].filter(size => size = 0).length;

    // Würde erstmal objekte mit min, current und maxSize machen
    // dann array von objekten
    // vielleicht kann jedes objekt ne methode set haben, die neue größe und #anderer tabs kriegt und die difference zurückgibt

    // TODO: Muss auch maxSize anpassen (wenn rechter tab geschlossen wird kann linker z.B. größer werden)
  }

  ngOnInit(): void {
    // TODO: Das muss vmtl auch berechnet werden, wenn tabs geschlossen/geöffnet werden
    this.uiEv.onFiletreeToggle.subscribe(next => {
      const currentSizes = this.splitEl.getVisibleAreaSizes();

      // TODO: Store in localstorage (key: name der lektion)
      // --> Service dafür anlegen
      // on lesson open: load from localstorage
      // on lesson close: store in localstorage
      if (currentSizes[0] !== '*') {
        let difference;
        const openTabGroups = Number(this.currentSizeLeftTab > 0) + Number(this.currentSizeRightTab > 0)
        this.currentSizeLeftTab = Number(currentSizes[1].valueOf())
        this.currentSizeRightTab = Number(currentSizes[2].valueOf())

        // TODO: ablauf ist ja immer ähnlich, kann man vmtl verallgemeinern?
        // Im Sinne von: nur currentSizeFileTree setzen, dann andere Methode aufrufen die neu verteilt
        if (next === false) { // wenn filetree gleich eingeklappt wird
          this.lastSizeFiletree = Number(currentSizes[0].valueOf()); // müsste bei close left/close right dann deren größe sein
          this.currentSizeFiletree = 0;

          if (openTabGroups === 0) {
            return; // no division by zero
          }

          if (this.currentSizeLeftTab > 0) {
            this.currentSizeLeftTab = Math.round(this.currentSizeLeftTab + (this.lastSizeFiletree / openTabGroups));
          }

          if (this.currentSizeRightTab > 0) {
            this.currentSizeRightTab = Math.floor(this.currentSizeRightTab + (this.lastSizeFiletree / openTabGroups));
          }

          difference = 100 - (this.currentSizeRightTab + this.currentSizeLeftTab); // distribute difference to 100% equally among tabs
        } else {
          this.currentSizeFiletree = this.lastSizeFiletree;

          if (openTabGroups === 0) {
            return; // no division by zero
          }

          if (this.currentSizeLeftTab > 0) {
            this.currentSizeLeftTab = Math.floor(this.currentSizeLeftTab - (this.lastSizeFiletree / openTabGroups));
          }

          if (this.currentSizeRightTab > 0) {
            this.currentSizeRightTab = Math.floor(this.currentSizeRightTab - (this.lastSizeFiletree / openTabGroups));
          }

          difference = 100 - (this.currentSizeRightTab + this.currentSizeLeftTab + this.currentSizeFiletree);
        }

        this.currentSizeLeftTab += difference / 2;
        this.currentSizeRightTab += difference / 2;
        this.lastSizeLeftTab = this.currentSizeLeftTab;
        this.lastSizeRightTab = this.currentSizeRightTab;
      }
    });
    this.uiEv.onToggleTerminal.subscribe(() => this.terminalVisible = !this.terminalVisible);
    this.uiEv.onStartTour.subscribe(
      () => {
        this.filetreeVisible = true;
        this.terminalVisible = true;
        this.guidedTourService.startTour(tour);
      }
    );
    this.uiEv.onHintChange.subscribe(() => {

      // TODO
      const path = "/sortierroboter/hint_files/root.yml"

      this.fsService.getFileAsBinary(path).subscribe(data => {
        this.tabManagementService.openHintsManually({path: path, content: data});
      });
    });
  }
}
