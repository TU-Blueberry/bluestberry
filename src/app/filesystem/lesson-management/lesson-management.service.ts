import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Location } from '@angular/common';
import { concat, EMPTY, iif } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
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
  loadFromServerAndOpen(name: string) {
    const url = this.location.prepareExternalUrl(`/assets/${name}.zip`);

    return this.http.get(url, { responseType: 'arraybuffer' }).pipe(mergeMap(
      buff => {
        return this.zipService.loadZip(buff).pipe(mergeMap(zip => concat(
          this.fsService.storeLesson(zip, name), 
          this.zipService.getConfigFromStream(zip).pipe(mergeMap(config => this.fsService.storeConfig(config))))));
      }
    ));
  }

  /** Checks whether lesson with the given name already exists in the local filesystem. 
   * If yes, the content from the local filesystem is used.
   * If no, the lesson with the given name will be requested from the server and stored afterwards 
   * Intended for situations where user shall choose between multiple lessons (e.g. application startup)
   * */
    openLessonByName(name: string) {
    return concat(this.fsService.checkIfLessonDoesntExistYet(name).pipe(
      mergeMap(isEmpty => iif(() => isEmpty, this.loadFromServerAndOpen(name), EMPTY)),
    ), this.checkAfterMount(name))
  }

  // TODO: On close of lesson:
  // Sync everything
  // Reset all PATHS in fsService
  // Reset modulePaths in pyodideService
  // Remove all module paths from pyodides sys.path
  checkAfterMount(name: string){
      return this.fsService.getConfig(name).pipe(map(config => {  
        if (config) {
          console.log("%c Config found!", "color: green", config)
          this.fsService.HIDDEN_PATHS = new Set(config.hidden.map(path => `/${name}/${path}`));
          this.fsService.MODULE_PATHS = new Set(config.modules.map(path => `/${name}/${path}`));
          this.fsService.READONLY_PATHS = new Set(config.readonly.map(path => `/${name}/${path}`));
          this.fsService.EXTERNAL_PATHS = new Set(config.external.map(path => `/${name}/${path}`));
          this.fsService.checkPermissions(`/${name}`, false);
          this.fsEv.onLessonOpened(config);
          this.py.modulePaths = config.modules.map(path => `/${name}/${path}`);
        } else {
          console.error("No config found!")
        }
    }));
  }
}
