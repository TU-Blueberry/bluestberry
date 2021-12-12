import { Component, Input, OnInit } from '@angular/core';
import { TabType } from 'src/app/tab/model/tab-type.model';
import { FileType, FileTypes } from '../filetypes.enum';

@Component({
  selector: 'app-file-icons',
  templateUrl: './file-icons.component.html',
  styleUrls: ['./file-icons.component.scss']
})
export class FileIconsComponent implements OnInit {
  private _fileType?: FileType;
  private _isActive = false;
  private _isTentativeFile = false;
  
  public _tabType?: TabType;
  public fileTypeEnum = FileType;
  public fileTypeString = '';
  public fillColor = '';

  @Input('fileType')
  set filetype(type: string) {
    if (type !== '') {
      this._fileType = FileTypes.getType(type); 
      this.fileTypeString = this.fileType === FileType.JSON ? '{..}' : type;
      this.fillColor = FileTypes.getColorCode(type);
    }
  }

  @Input('isTentativeFile')
  set isTentativeFile(isTentativeFile: boolean) {
    this._isTentativeFile = isTentativeFile;
  }

  @Input('tabType') 
  set tabType(type: TabType) {
    this._tabType = type;
  }

  @Input('isActive') 
  set isActive(active: boolean) {
    this._isActive = active;
  }

  get fileType(): FileType | undefined {
    return this._fileType;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get isTentativeFile(): boolean {
    return this._isTentativeFile;
  }

  constructor() { }

  ngOnInit(): void {
  }

  public getImageIconPath(): string {
    return FileTypes.imageIconPath; 
  }

  public getTableIconPath(): string {
    return FileTypes.tableIconPath;
  }

  public getPlainTextIconPath(): string {
    return FileTypes.plainTextPath;
  }

  public getUnknownFileTypeIconPath(): string {
    return FileTypes.unknownFilePath;
  }

  public getUnityIconPath(): string {
    return FileTypes.unityPath;
  }

  public getHintIconPath(): string {
    return FileTypes.hintPath;
  }
}
