import {Directive, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Tab} from 'src/app/tab/model/tab.model';
import {FilesystemEventService} from 'src/app/filesystem/events/filesystem-event.service';
import {FilesystemService} from 'src/app/filesystem/filesystem.service';
import {filter, map, switchMap} from 'rxjs/operators';
import {ReplaySubject, Subject} from 'rxjs';

@Directive({
    selector: '[appFileTab]',
})
export class FileTabDirective implements OnInit {
    @Output()
    close = new EventEmitter<void>();

    private _tab?: Tab;
    @Input('appFileTab')
    get tab(): Tab | undefined {
        return this._tab;
    }

    set tab(value: Tab | undefined) {
        console.log("tab was set to ", value);
        if (!value) {
            return;
        }
        this._tab = value;
        this.dataChanges.next(value.data);
    }

    dataChanges = new ReplaySubject<any>(1);

    constructor(private filesystemEventService: FilesystemEventService,
                private filesystemService: FilesystemService) {
    }

    ngOnInit(): void {
        this.filesystemEventService.onDeletePath.pipe(
            filter(path => this.tab?.data.path.startsWith(path))
        ).subscribe(() => this.close.next());

        this.filesystemEventService.onMovePath.pipe(
            filter(event => this.tab?.data.path === event.oldPath)
        ).subscribe(event => {
            this.tab!.data.path = event.newPath;
            this.tab!.title = event.newPath.split('/').pop() || event.newPath;
        });

        this.filesystemEventService.onWriteToFile.pipe(
            filter(event => this.tab?.data.path === event.path),
            switchMap(event => this.filesystemService.getFileContent(event.path, 'binary')),
            map(content => content as Uint8Array),
        ).subscribe(content => {
            this.tab!.data.content = content;
            this.dataChanges.next(this.tab!.data);
        });
    }
}