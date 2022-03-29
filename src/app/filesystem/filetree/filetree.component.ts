import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ComponentFactoryResolver, EventEmitter, Input, OnDestroy, Output, ViewChild, ViewContainerRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { FilesystemService } from '../filesystem.service';
import { FolderComponent } from '../folder/folder.component';
import { filter } from 'rxjs/operators';
import { ZipService } from '../zip/zip.service';
import { TreeNode } from '../model/tree-node';
import { UiEventsService } from 'src/app/ui-events.service';
import { FilesystemEventService } from '../events/filesystem-event.service';
import { Experience } from 'src/app/experience/model/experience';
import { Actions, ofActionSuccessful } from '@ngxs/store';
import { ExperienceAction } from 'src/app/experience/actions';
import { ConfigService } from 'src/app/shared/config/config.service';
import { GlossaryService } from 'src/app/shared/glossary/glossary.service';
import { ImportAction } from 'src/app/actionbar/actions/import.action';

@Component({
  selector: 'app-filetree',
  templateUrl: './filetree.component.html',
  styleUrls: ['./filetree.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FiletreeComponent implements OnDestroy{
  SELECTED_LESSON?: Experience;
  _isGlossary = false;
  toggleSubscription?: Subscription;
  outsideClickSubscription?: Subscription;
  noGlossaryEntries = false;

  @Input() set isGlossary(isGlossary: boolean) {
    this._isGlossary = isGlossary;
    this.init();
  }

  @Output() expandChange: EventEmitter<boolean> = new EventEmitter();
  @ViewChild('content', { read: ViewContainerRef }) ref!: ViewContainerRef;
  constructor(private fsService: FilesystemService, private componentFactoryResolver: ComponentFactoryResolver, 
    private zipService: ZipService, private uiEv: UiEventsService, private ev: FilesystemEventService,
    private cd: ChangeDetectorRef, private action$: Actions, private conf: ConfigService, private gs: GlossaryService) { }

  private init(): void {
    if (this._isGlossary === true) {
      this.gs.glossaryEntries$.subscribe(entries => {
        this.kickstartTreeGeneration(entries);
      }); 
    }

    this.action$.pipe(ofActionSuccessful(ExperienceAction.Open))
      .subscribe((action: ExperienceAction.Open) => this.onOpenOrUpdate(action))

    this.action$.pipe(ofActionSuccessful(ImportAction.OverwriteCurrent))
      .subscribe((action: ImportAction.OverwriteCurrent) => this.onOpenOrUpdate(action));

    this.action$.pipe(ofActionSuccessful(ExperienceAction.Close))
      .subscribe(() =>  this.ref.clear());
  }

  onOpenOrUpdate(action: ExperienceAction.Open | ImportAction.OverwriteCurrent) {
    if (this._isGlossary === false) {
      this.SELECTED_LESSON = action.exp;
      this.kickstartTreeGeneration();
    } 
  }

  // possible further optimization: only delete and create new components for glossary entries which changed
  private kickstartTreeGeneration(additionalGlossaryEntries?: { path: string; node: FSNode; }[]) {  
    this.ref.clear();

    const path = this._isGlossary ? '/glossary' : `/${this.SELECTED_LESSON?.uuid}`;
    const name = this._isGlossary ? 'Glossar' : this.SELECTED_LESSON?.name;
    const folderFactory = this.componentFactoryResolver.resolveComponentFactory(FolderComponent);
    const folderComp = this.ref.createComponent(folderFactory).instance;
    const baseNode = new TreeNode(this.uiEv, this.fsService, this.ev, this.conf);
    baseNode.path = "/";

    this.outsideClickSubscription = this.uiEv.onClickOutsideOfFiltree.pipe(
      filter(click => click.isGlossary === (additionalGlossaryEntries !== undefined))
    ).subscribe(click => {
      folderComp.closeContextMenu();
      folderComp.toggleContextMenu(click.ev);
    });

    this.fsService.getNodeByPath(path).subscribe((node) => {
      folderComp.node = baseNode.generateTreeNode(0, path, node, name);
      folderComp.node.isRoot = true; 
      folderComp.node.isGlossary = this._isGlossary;
      folderComp.node.path = path;
      this.toggleSubscription = folderComp.onExpandToggle.subscribe(next => this.expandChange.emit(next));

      additionalGlossaryEntries?.forEach(entry => 
        folderComp.createSubcomponent(true, entry.path, entry.node)
      )

      if (additionalGlossaryEntries && additionalGlossaryEntries.length === 0 && this.ref.length === 1) {
        this.noGlossaryEntries = true;
      } else {
        this.noGlossaryEntries = false;
      }

      this.cd.markForCheck();
    }); 
  }

  ngOnDestroy(): void {
    this.toggleSubscription?.unsubscribe();
    this.outsideClickSubscription?.unsubscribe();
  }
}
