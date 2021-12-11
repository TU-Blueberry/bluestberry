import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { UiEventsService } from 'src/app/ui-events.service';
import { FilesystemEventService } from '../events/filesystem-event.service';
import { FilesystemService } from '../filesystem.service';
import { TreeNode } from '../model/tree-node';

@Component({
  selector: 'app-file',
  templateUrl: './file.component.html',
  styleUrls: ['./file.component.scss']
})
export class FileComponent implements OnInit {
  isRenaming = false;
  isActive = false;

  public _node: TreeNode;

  @Output() onDeleteRequested: EventEmitter<boolean> = new EventEmitter();
  constructor(private fsService: FilesystemService, private ev: FilesystemEventService, private uiEv: UiEventsService) {
    this._node = new TreeNode(this.uiEv, this.fsService, this.ev);
  }

  ngOnInit(): void {
    this.isRenaming = this._node.isTentativeNode;

    if (this._node.isTentativeNode) {
      this.uiEv.changeUserInputLocation(this._node.parentPath + "/new")
    }

    this._node.onNewUserInputLocation().subscribe(() => {
      this.isRenaming = false;
      if (this._node.isTentativeNode) {
        this.dismissNameChange();
      }
    }); 
  }

  deleteFile(ev: Event) {
    ev.stopPropagation();
    ev.preventDefault();
    this.fsService.deleteFile(this._node?.path, true).subscribe();
  }

  onDoubleClick(): void {
    if (this._node?.ref?.contents instanceof Uint8Array) {
      this.ev.onUserOpenFile(this._node.path, this._node.ref);
      this.uiEv.onActiveElementChange.emit(this._node.path);
    } 
  }

  startRenaming(ev: Event): void {
    ev.stopPropagation();
    ev.preventDefault();
    this.isRenaming = true;
    this.uiEv.changeUserInputLocation(this._node.path);
  }

  cancelRenaming(): void {
    this.isRenaming = false;
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
    this.onDeleteRequested.emit(true);
  }
}
