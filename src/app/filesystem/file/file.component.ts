import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
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
  tentativeName = '';
  
  private _node: TreeNode;

  @Input() set node(node: TreeNode) {
    this._node = node;
    this.isRenaming = this._node.isTentativeNode;

    if (this._node.isTentativeNode) {
      this.uiEv.changeUserInputLocation(this._node.parentPath + `/${this.generateUUID()}`)
    }

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
  constructor(private fsService: FilesystemService, private ev: FilesystemEventService, private uiEv: UiEventsService) {
    this._node = new TreeNode(this.uiEv, this.fsService, this.ev);
  }

  // TODO: this isn't a UUID but a random gist i found
  // Might look into libraries like uuid to do the job. this should only be temporary (luckily it isn't important in any way)
  private generateUUID(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  ngOnInit(): void {
    this.isRenaming = this._node.isTentativeNode;
  }

  deleteFile(ev: Event) {
    ev.stopPropagation();
    ev.preventDefault();
    this.fsService.deleteFile(this._node?.path, true).subscribe();
  }

  onClick(): void {
    if (this._node?.ref?.contents instanceof Uint8Array) {
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
}
