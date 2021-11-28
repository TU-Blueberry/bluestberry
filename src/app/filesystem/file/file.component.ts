import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UiEventsService } from 'src/app/ui-events.service';
import { FilesystemEventService } from '../events/filesystem-event.service';
import { FilesystemService } from '../filesystem.service';
import { TreeNode } from '../tree-node';

@Component({
  selector: 'app-file',
  templateUrl: './file.component.html',
  styleUrls: ['./file.component.scss']
})
export class FileComponent {
  isRenaming = false;
  isActive = false;

  public _node: TreeNode;

  /* @Input('depth') depth: number = 0;
  @Input('path') path: string = '';
  @Input('ref') ref?: FSNode;
  @Input('parentPath') parentPath: string = ''; */

   @Input('node') set node(node: TreeNode) {
    this._node = node;
  }

  @Output() onDeleteRequested: EventEmitter<boolean> = new EventEmitter();
  constructor(private fsService: FilesystemService, private ev: FilesystemEventService, private uiEv: UiEventsService) {
    this._node = new TreeNode(this.uiEv, this.fsService, this.ev);
  }

  deleteFile(ev: Event) {
    ev.stopPropagation();
    ev.preventDefault();
    this.fsService.deleteFile(this._node.path);
    this.fsService.sync(false).subscribe();
  }

  onDoubleClick(): void {
    if (this._node.ref?.contents instanceof Uint8Array) {
      this.ev.onUserOpenFile(this._node.path, this._node.ref);
      this.uiEv.onActiveElementChange.emit(this._node.path);
    } 
  }

  startRenaming(ev: Event): void {
    ev.stopPropagation();
    ev.preventDefault();
    this.isRenaming = true;
  }

  cancelRenaming(): void {
    this.isRenaming = false;
  }

  changeName(params: {newName: string, isFile: boolean}): void {
    this.isRenaming = false;

    if (!this._node.isNewNode) {
      this.fsService.rename(`${this._node.parentPath}/${this._node.name}`, `${this._node.parentPath}/${params.newName}`).subscribe();
    } else {
      this.fsService.createFile(`${this._node.parentPath}/${params.newName}`, new Uint8Array()).subscribe(() => {}, (err) => console.error(err), () => {
        this.ev.createNewNodeByUser(`${this._node.parentPath}/${params.newName}`, params.isFile);
    });
    }
  }

  dismissNameChange(): void {
    this.isRenaming = false;
    this.onDeleteRequested.emit(true);
  }
}
