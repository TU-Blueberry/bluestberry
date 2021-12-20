import { Component, Input, OnInit } from '@angular/core';
import { FilesystemService } from 'src/app/filesystem/filesystem.service';
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

  @Input('data')
  set data(data: any) {
    if (data !== undefined) {
      const extension = this.fsService.getExtension(data.path || '');
      this._fileType = FileTypes.getType(extension); 
      this.fileTypeString = this.fileType === FileType.JSON ? '{..}' : extension;
      this.fillColor = FileTypes.getColorCode(extension);
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

  constructor(public fsService: FilesystemService) { }

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
