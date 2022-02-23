import { Injectable } from '@angular/core';
import * as JSZip from 'jszip';
import { JSZipObject } from 'jszip';
import { concat, forkJoin, from, Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { FilesystemService } from '../filesystem.service';
import { Config } from 'src/app/experience/model/config';
import { ConfigService } from 'src/app/shared/config/config.service';
import { Experience } from 'src/app/experience/model/experience';
import { Store } from '@ngxs/store';
import { ExperienceState, ExperienceStateModel } from 'src/app/experience/experience.state';

@Injectable({
  providedIn: 'root'
})
export class ZipService {
  constructor(private fsService: FilesystemService, private conf: ConfigService, private store: Store) { }

  getConfigFromStream(unzipped: JSZip): Observable<Config> {
    return this.getFileFromZip("config.json", unzipped).pipe(
      switchMap(config => {
        const stream = config.internalStream("arraybuffer");

        return from(stream.accumulate()).pipe(
          switchMap(data => this.conf.decryptConfig(data)),
          switchMap(decrypted => this.conf.parseDecryptedConfig(decrypted))
        )
    }));   
  }

  getFileFromZip(path: string, unzipped: JSZip): Observable<JSZipObject> {
    return new Observable(subscriber => {
      console.log(unzipped)

      const file = unzipped.file(path);

      if (!file) {
        subscriber.error(`Couldn't find file at ${path}`);
      } else {
        subscriber.next(file);
        subscriber.complete();
      }
    });
  }

  // TODO: Wenn jemals "external" umgesetzt: mounten und Dateien in Zip packen
  export(exp: Experience): Observable<JSZip> {
    return this.store.selectOnce<ExperienceStateModel>(ExperienceState).pipe(
      switchMap(state => {
        if ((state.current && state.current.uuid === exp.uuid)) {
          return this.exportCurrent(exp)
        } else {
          return this.exportOther(exp);
        }
      })
    )
  }

  private exportCurrent(exp: Experience): Observable<JSZip> {
    const zip = new JSZip();

    return concat(
      this.conf.saveStateOfCurrentExperience(),
      this.createZip(`/${exp.uuid}`, zip, exp.uuid),
      of(zip)
    ) 
  }

  private exportOther(exp: Experience): Observable<JSZip> {
    const zip = new JSZip();

    return concat(
      this.fsService.mountManySyncOnce([exp.uuid]),
      this.conf.saveStateOfCurrentExperience(),
      this.createZip(`/${exp.uuid}`, zip, exp.uuid),
      this.fsService.unmount(exp.uuid),
      of(zip)
    )
  }

  private createZip(path: string, zip: JSZip, uuid: string) {
    return this.addLayerToZip(path, 0, zip, uuid);
  }

  private addLayerToZip(path: string, depth: number, zip: JSZip, uuid: string): Observable<any> {
    return this.fsService.scanAll(path, depth, true).pipe(
      switchMap(([folders, files]) => {
        folders.forEach(folder => zip.folder(this.removePrefix(`${path}/${folder.name}`, uuid)))
        files.forEach(file => {
          zip.file(this.removePrefix(`${path}/${file.name}`, uuid), (file.contents as Uint8Array), { createFolders: true });
        })
        return forkJoin(folders.map(folder => this.addLayerToZip(`${path}/${folder.name}`, depth + 1, zip, uuid)))
      })
    )
  }

  // prevent first level of zip from only containing a folder with the lessonName
  private removePrefix(path: string, uuid: string): string {
    return path.replace(`/${uuid}/`, '');
  }

  loadZip(buff: ArrayBuffer): Observable<JSZip> {
    return from(new JSZip().loadAsync(buff));
  }
}
