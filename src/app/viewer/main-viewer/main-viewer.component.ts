import { Component, OnInit } from '@angular/core';
import { FileType } from 'src/app/shared/files/filetypes.enum';
import { UiEventsService } from 'src/app/ui-events.service';
import { FilesystemEventService } from 'src/app/filesystem/events/filesystem-event.service';
import { FilesystemService } from 'src/app/filesystem/filesystem.service';

import { switchMap, map } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { FileType } from 'src/app/shared/filetypes.enum';

@Component({
  selector: 'app-main-viewer',
  templateUrl: './main-viewer.component.html',
  styleUrls: ['./main-viewer.component.scss']
})
export class MainViewerComponent implements OnInit {
  filetreeVisible = true;
  types = FileType;

  constructor(private uiEv: UiEventsService, private fsService: FilesystemService, private fsEventService: FilesystemEventService) {}

  ngOnInit(): void {

    this.uiEv.onFiletreeToggle.subscribe(next => this.filetreeVisible = next);

    this.uiEv.onHintChange.subscribe(() => {

      // TODO 
      const path = "/sortierroboter/hint_files/root.yml"
      
      // var content = this.fsService.getFileAsString(path);
      // content.subscribe(node => console.log(node))

      this.fsService.getFileAsBinary(path).subscribe(node => {
        this.fsEventService.onOpenFile.emit({path: path, byUser: true, fileContent: node, type: FileType.HINT});
      });

    });
  }

}
