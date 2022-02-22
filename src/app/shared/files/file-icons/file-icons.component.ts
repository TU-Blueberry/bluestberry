import { Component, Input } from '@angular/core';
import { FilesystemService } from 'src/app/filesystem/filesystem.service';
import { TabType } from 'src/app/tab/model/tab-type.model';
import { FileType, FileTypes } from '../filetypes.enum';

@Component({
  selector: 'app-file-icons',
  templateUrl: './file-icons.component.html',
  styleUrls: ['./file-icons.component.scss']
})
export class FileIconsComponent {
  private _fileType?: FileType;
  private _isActive = false;
  private _isTentative = false;
  private _isRenaming = false;
  private _specialTabTypes = ['HINT', 'UNITY', 'PLOTLY'];
  
  public _tabType?: TabType;
  public fileTypeEnum = FileType;
  public fileTypeString = '';
  public fillColor = '';

  @Input('path')
  set path(path: string ) {
    const extension = this.fsService.getExtension(path);
    this._fileType = FileTypes.getType(extension); 
    this.fileTypeString = this._fileType === FileType.JSON ? '{..}' : extension;
    this.fillColor = FileTypes.getColorCode(extension);
  }

  @Input('isTentative')
  set isTentative(isTentativeFile: boolean) {
    this._isTentative = isTentativeFile;
  }

  @Input('tabType') 
  set tabType(type: TabType) {
    this._tabType = type;
  }

  @Input('isActive') 
  set isActive(active: boolean) {
    this._isActive = active;
  }

  @Input('isRenaming')
  set isRenaming(isRenaming: boolean) {
    this._isRenaming = isRenaming
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get isTentative(): boolean {
    return this._isTentative;
  }

  get isRenaming(): boolean {
    return this._isRenaming;
  }

  constructor(public fsService: FilesystemService) { }

  public hasIcon(): boolean {
    if (this.isFolder() || this.isSpecialTab()) {
      return true;
    }

    if (this.isRegularFile()) {
      switch (this._fileType) {
        case FileType.PROGRAMMING_LANGUAGE:
        case FileType.MARKDOWN:
        case FileType.JSON:
             return false;
        case FileType.IMAGE:
        case FileType.DATA:
        case FileType.PLAIN_TEXT:
        case FileType.OTHER:
                return true;
      }
    }

    return false;
  }

  public isFolder(): boolean {
    return this._fileType === undefined && this._tabType === undefined;
  }

  public isSpecialTab(): boolean {
    return this._tabType !== undefined && this._specialTabTypes.includes(this._tabType)
  }

  public isRegularFile(): boolean {
    return this._fileType !== undefined;
  }

  public getTabIconPath(): string {
    return FileTypes.getTabIconPath(this._tabType);
  }

  public getFileIconPath(): string {
    return FileTypes.getFileIconPath(this._fileType)
  }
}
