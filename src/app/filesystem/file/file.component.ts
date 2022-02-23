import { ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { ConfigService } from 'src/app/shared/config/config.service';
import { UiEventsService } from 'src/app/ui-events.service';
import { FilesystemEventService } from '../events/filesystem-event.service';
import { FilesystemService } from '../filesystem.service';
import { TreeNode } from '../model/tree-node';

@Component({
  selector: 'app-file',
  templateUrl: './file.component.html',
  styleUrls: ['./file.component.scss'],
})
export class FileComponent implements OnInit, OnDestroy {
  isRenaming = false;
  isActive = false;
  tentativeName = '';
  showContextMenu = false;
  offsetX = 0;
  offsetY = 0;
  closeContextMenuSubscription: Subscription;
  activeElementChangeSubscription?: Subscription;
  
  private _node: TreeNode;

  @Input() set node(node: TreeNode) {
    this._node = node;
    this.isRenaming = this._node.isTentativeNode;

    if (this._node.isTentativeNode) {
      this.uiEv.changeUserInputLocation(this._node.parentPath + `/${this.generateRandomName()}`)
    }

    this.activeElementChangeSubscription = this.uiEv.onActiveElementChange.subscribe(newActiveElementPath => {
      this.isActive = this._node.path === newActiveElementPath
      this.cd.detectChanges();
    });

    this._node.onNewUserInputLocation().subscribe(() => {
      this.isRenaming = false;
      
      if (this._node.isTentativeNode) {
        this.dismissNameChange();
      }
    }); 
  }

  get node(): TreeNode {
    return this._node;
  }

  @Output() onDeleteRequested: EventEmitter<boolean> = new EventEmitter();
  constructor(private fsService: FilesystemService, private ev: FilesystemEventService, private uiEv: UiEventsService, private cd: ChangeDetectorRef, private conf: ConfigService) {
    this._node = new TreeNode(this.uiEv, this.fsService, this.ev, this.conf);
    this.closeContextMenuSubscription = this.uiEv.onCloseAllContextMenues.subscribe(() => {
      this.showContextMenu = false;
      this.cd.detectChanges();
    });
  }

  // copied from some random gist. only purpose is to create some random new name to stop renaming in any other component
  private generateRandomName(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  ngOnInit(): void {
    this.isRenaming = this._node.isTentativeNode;
  }
  
  ngOnDestroy(): void {
    this.closeContextMenuSubscription.unsubscribe();
    this.activeElementChangeSubscription?.unsubscribe();
  }

  deleteFile(ev: Event) {
    ev.stopPropagation();
    ev.preventDefault();
    this.fsService.deleteFile(this._node?.path, true).subscribe();
  }

  onClick(): void {
    if (this.fsService.isFile(this._node.path) && !this.isRenaming && this._node.ref) {
      this.ev.onUserOpenFile(this._node.path, this._node.ref);
      this.uiEv.onActiveElementChange.emit(this._node.path);
    } 
  }

  startRenaming(ev: Event): void {
    ev.stopPropagation();
    ev.preventDefault();
    this.isRenaming = true;
    this.tentativeName = this._node.name;
    this.uiEv.changeUserInputLocation(this._node.path);
  }

  cancelRenaming(): void {
    this.isRenaming = false;
    this.tentativeName = '';
  }

  changeName(params: {newName: string, isFile: boolean}): void {
    this.isRenaming = false;

    if (!this._node?.isTentativeNode) {
      this.fsService.rename(`${this._node.parentPath}/${this._node.name}`, `${this._node.parentPath}/${params.newName}`).subscribe();
    } else {
      const newPath = `${this._node.parentPath}/${params.newName}`;
      this.ev.createNewNodeByUser(newPath, params.isFile);
      this._node.name = params.newName;
      this.fsService.createFile(newPath, new Uint8Array(), true).subscribe(
        () => {}, 
        (err) => (this.ev.failedCreationFromUi(newPath , true), console.error(err)), 
        () => {this.ev.updateSyncStatusOfTentative(newPath, params.isFile)}
      );
    }
  }

  dismissNameChange(): void {
    this.isRenaming = false;
    this.tentativeName = '';
    this.onDeleteRequested.emit(true);
  }

  updateTentativeName(event: Event) {
    this.tentativeName = (event.target as HTMLInputElement)?.value;
  }

  getExtensionFromTentativeName(): string {
    const extension = this.tentativeName.split(".");
    return extension.length > 1 ? extension[extension.length - 1].toUpperCase() : "UNKNOWN";
  }

  closeContextMenu(): void {
    this.showContextMenu = false;
  }

  toggleContextMenu(ev: MouseEvent): void {
    ev.stopPropagation();
    ev.preventDefault();
    this.offsetX = ev.clientX;
    this.offsetY = ev.clientY;

    if (!this.isRenaming) {
      if (!this.showContextMenu) {
        this.uiEv.closeAllContextMenues();
      }

      this.showContextMenu = !this.showContextMenu;
    }

    this.cd.detectChanges();
  }
}
