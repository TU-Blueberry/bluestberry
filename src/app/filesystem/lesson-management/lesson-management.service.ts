import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { concat, EMPTY, iif, Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { FilesystemService } from '../filesystem.service';
import { ZipService } from '../zip/zip.service';

@Injectable({
  providedIn: 'root'
})
export class LessonManagementService {

  constructor(private http: HttpClient, private zipService: ZipService, private fsService: FilesystemService) { }

  /** Retrieves lesson from server and stores it */
  loadFromServerAndOpen(name: string) {
    return this.http.get(`/assets/${name}.zip`, { responseType: 'arraybuffer' }).pipe(mergeMap(
      buff => {
        return this.zipService.loadZip(buff).pipe(mergeMap(zip => this.fsService.storeLesson(zip, name)));
      }
    ));
  }

  /** Checks whether lesson with the given name already exists in the local filesystem. 
   * If yes, the content from the local filesystem is used.
   * If no, the lesson with the given name will be requested from the server and stored afterwards 
   * Intended for situations where user shall choose between multiple lessons (e.g. application startup)
   * */
    openLessonByName(name: string): Observable<any> {
    return concat(this.fsService.checkIfLessonDoesntExistYet(name).pipe(
      mergeMap(isEmpty => iif(() => isEmpty, this.loadFromServerAndOpen(name), EMPTY))
    ), this.fsService.sync(false))
  }
}
