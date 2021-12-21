import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import { concat, iif, Observable, of, Subject, throwError } from 'rxjs';
import { ignoreElements, switchMap, tap } from 'rxjs/operators';
import { FilesystemService } from '../../filesystem/filesystem.service';
import { ZipService } from '../../filesystem/zip/zip.service';
import { FilesystemEventService } from '../../filesystem/events/filesystem-event.service';
import { PyodideService } from 'src/app/pyodide/pyodide.service';
import { LessonEventsService } from '../lesson-events.service';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LessonManagementService {
  lessons$ = new Subject<string[]>();

  constructor(private http: HttpClient, private zipService: ZipService, private fsService: FilesystemService, 
    private location: Location, private fsEv: FilesystemEventService, private py: PyodideService, private lse: LessonEventsService) {
      this.getLessonList().subscribe(lessons => this.lessons$.next(lessons));
    }

  /** Retrieves lesson from the server */
  private loadFromServer(name: string) {
    const url = this.location.prepareExternalUrl(`/assets/${name}.zip`);
    return this.http.get(url, { responseType: 'arraybuffer' });
  }

  private getLessonList(): Observable<string[]> {
    const url = this.location.prepareExternalUrl('/assets/lessons.json');
    return this.http.get<string[]>(url);
  }

  private loadAndStore(name: string) {
    return this.loadFromServer(name).pipe(
      switchMap(buff => this.zipService.loadZip(buff)),
      switchMap(zip => 
        concat(
          this.fsService.mountAndSync(name).pipe(ignoreElements()),
          this.fsService.storeLesson(zip, name).pipe(ignoreElements()), 
          this.zipService.getConfigFromStream(zip).pipe(
            switchMap(config => this.fsService.storeConfig(config))),
          this.py.addToSysPath(name)
        )
      )
    );
  }

  /** Checks whether lesson with the given name already exists in the local filesystem. 
   * If yes, the content from the local filesystem is used.
   * If no, the lesson with the given name will be requested from the server and stored afterwards 
   * Intended for situations where user shall choose between multiple lessons (e.g. application startup)
   * */
  public openLessonByName(name: string) {
    return concat(
      this.py.pyodide.pipe(ignoreElements()), 
      this.fsService.isNewLesson(name)
    ).pipe(
      switchMap(isEmpty => iif(() => isEmpty === true, 
        concat(this.loadAndStore(name), this.checkAfterMount(name)), 
        concat(this.fsService.mountAndSync(name), this.py.addToSysPath(name), this.checkAfterMount(name)))
     )
    ) 
  }

  public closeLesson(name: string): Observable<void> {
    return concat(
      this.fsService.unmountAndSync(name), 
      this.py.removeFromSysPath(name), 
      of(this.lse.emitLessonClosed(name))
    ).pipe(tap(() => this.fsService.reset()))
  }

  public changeLesson(oldLesson: string, newLesson: string) {
    return concat(
      this.closeLesson(oldLesson), 
      this.openLessonByName(newLesson)
    );
  }

  private checkAfterMount(name: string): Observable<void>{
    return this.fsService.getConfig(name).pipe(switchMap(config => {  
      if (config) {
        console.log("%c Config found!", "color: green", config)
        this.fsService.HIDDEN_PATHS = new Set(this.filterPaths(name, config.hidden));
        this.fsService.MODULE_PATHS = new Set(this.filterPaths(name, config.modules || []));
        this.fsService.READONLY_PATHS = new Set(this.filterPaths(name, config.readonly));
        this.fsService.EXTERNAL_PATHS = new Set(this.filterPaths(name, config.external));
  
        return concat(
          this.fsService.checkPermissions(`/${name}`, false),
          of(this.lse.emitLessonOpened(config, name))
        );
      } else {
        return throwError("No config found!")
      }
    }));
  }

  private filterPaths(name: string, paths: string[]): string[] {
    return paths.filter(path => path.trim() !== "" && path.trim() !== "/").map(path => `/${name}/${path}`);
  }
}
