import { Component, OnInit, ViewChild } from '@angular/core';
import { FileType } from 'src/app/shared/files/filetypes.enum';
import { UiEventsService } from 'src/app/ui-events.service';
import { FilesystemService } from 'src/app/filesystem/filesystem.service';
import { TabManagementService } from 'src/app/tab/tab-management.service';
import { GuidedTourService } from "ngx-guided-tour";
import { tour } from "../../../assets/guided-tour/guided-tour.data";
import { SplitComponent } from 'angular-split';

@Component({
  selector: 'app-main-viewer',
  templateUrl: './main-viewer.component.html',
  styleUrls: ['./main-viewer.component.scss']
})
export class MainViewerComponent implements OnInit {
  filetreeVisible = true;
  terminalVisible = true;
  types = FileType;

  // TODO: left/right side closed + no tab open at all (keep in mind that lesson may be opened with no tabs as well)

  // percent of viewport width
  readonly minSizeFiletree = 10;
  readonly minSizeLeftTab = 10;
  readonly minSizeRightTab = 10;
  readonly maxSizeFiletree = 30;


  public maxSizeLeftTab = 100
  public maxSizeRightTab = 100;

  public currentSizeFiletree = this.minSizeFiletree;
  public currentSizeLeftTab = 45;
  public currentSizeRightTab = 45;

  private lastSizeFiletree = this.currentSizeFiletree;
  private lastSizeLeftTab = 45;
  private lastSizeRightTab = 45;

  @ViewChild(SplitComponent) splitEl!: SplitComponent
  constructor(
    private uiEv: UiEventsService,
    private fsService: FilesystemService,
    private guidedTourService: GuidedTourService,
    private tabManagementService: TabManagementService
  ) { }

  ngOnInit(): void {
    // TODO: Das muss vmtl auch berechnet werden, wenn tabs geschlossen/geöffnet werden
    // TODO: Collapse/expand?
    this.uiEv.onFiletreeToggle.subscribe(next => { 
      const currentSizes = this.splitEl.getVisibleAreaSizes(); 

      if (currentSizes[0] !== '*') {
        let difference;
        const openTabGroups = Number(this.currentSizeLeftTab > 0) + Number(this.currentSizeRightTab > 0)
        this.currentSizeLeftTab = Number(currentSizes[1].valueOf())
        this.currentSizeRightTab = Number(currentSizes[2].valueOf())

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
