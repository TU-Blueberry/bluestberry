import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Location } from '@angular/common';
import { concat, EMPTY, iif } from 'rxjs';
import { map, mergeMap, switchMap, tap } from 'rxjs/operators';
import { FilesystemService } from '../filesystem.service';
import { ZipService } from '../zip/zip.service';
import { FilesystemEventService } from '../events/filesystem-event.service';
import { PyodideService } from 'src/app/pyodide/pyodide.service';

@Injectable({
  providedIn: 'root'
})
export class LessonManagementService {

  constructor(private http: HttpClient, private zipService: ZipService, private fsService: FilesystemService, 
    private location: Location, private fsEv: FilesystemEventService, private py: PyodideService) { }

  /** Retrieves lesson from server and stores it */
  loadFromServer(name: string) {
    const url = this.location.prepareExternalUrl(`/assets/${name}.zip`);
    return this.http.get(url, { responseType: 'arraybuffer' });
  }

  private test(name: string) {
    return this.loadFromServer(name).pipe(
        tap((res) => console.log("%c YEEEEEEEET", "color: red", res)),
        switchMap(buff => this.zipService.loadZip(buff)), 
        switchMap(zip => concat(
          this.fsService.storeLesson(zip, name), 
          this.zipService.getConfigFromStream(zip).pipe(
            switchMap(config => this.fsService.storeConfig(config)))
        ))
    );
  }

  /** Checks whether lesson with the given name already exists in the local filesystem. 
   * If yes, the content from the local filesystem is used.
   * If no, the lesson with the given name will be requested from the server and stored afterwards 
   * Intended for situations where user shall choose between multiple lessons (e.g. application startup)
   * */
    openLessonByName(name: string) {
    return concat(this.fsService.isNewLesson(name).pipe(
      switchMap(isEmpty => iif(() => isEmpty, this.test(name), EMPTY)),
    ), this.checkAfterMount(name))
  }

  // TODO: On close of lesson:
  // Sync everything
  // Reset all PATHS in fsService
  // Reset modulePaths in pyodideService
  // Remove all module paths from pyodides sys.path

  checkAfterMount(name: string){
    console.log("check after mount!")

      return this.fsService.getConfig(name).pipe(map(config => {  
        if (config) {
          console.log("%c Config found!", "color: green", config)
          this.fsService.HIDDEN_PATHS = new Set(this.filterPaths(name, config.hidden));
          this.fsService.MODULE_PATHS = new Set(this.filterPaths(name, config.modules));
          this.fsService.READONLY_PATHS = new Set(this.filterPaths(name, config.readonly));
          this.fsService.EXTERNAL_PATHS = new Set(this.filterPaths(name, config.external));
          this.fsService.checkPermissions(`/${name}`, false);
          this.fsEv.onLessonOpened(config);
          this.py.modulePaths = this.filterPaths(name, config.modules);
        } else {
          console.error("No config found!")
        }
    }));
  }

  private filterPaths(name: string, paths: string[]): string[] {
    return paths.filter(path => path.trim() !== "" && path.trim() !== "/").map(path => `/${name}/${path}`);
  }
}
