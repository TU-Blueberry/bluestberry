import { Injectable } from '@angular/core';
import * as JSZip from 'jszip';
import { Observable, concat, EMPTY, zip } from 'rxjs';
import { finalize, switchMap,  } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { FilesystemService } from '../filesystem/filesystem.service';
import { ConfigService } from '../shared/config/config.service';
import { ZipService } from '../filesystem/zip/zip.service';
import { Store } from '@ngxs/store';
import { ExperienceState, ExperienceStateModel } from './experience.state';
import { ExperienceAction } from './actions';
import { Experience } from './model/experience';
import { AppAction } from '../app.actions';
import { ImportAction } from '../actionbar/actions/import.action';

@Injectable({
  providedIn: 'root'
})
export class ImportExportService {
  constructor(private fs: FilesystemService, private conf: ConfigService, private zip: ZipService, private store: Store) { }

  public importWithOverwrite(zip: JSZip): Observable<never> {
    return this.import(zip, true, false);
  }

  public importGenerateUuid(zip: JSZip): Observable<never> {
    return this.import(zip, false, true);
  }

  public importRegular(zip: JSZip): Observable<never> {
    return this.import(zip, false, false);
  }
  
  private import(zipFile: JSZip, overwrite: boolean, generateUuid: boolean): Observable<never> {
    this.store.dispatch(new AppAction.Change("IMPORTING"));

    return zip(
      this.store.selectOnce<ExperienceStateModel>(ExperienceState),
      this.zip.getConfigFromStream(zipFile)
    ).pipe(
      switchMap(([state, conf]) => {
        if (generateUuid) {
          conf.uuid = uuidv4();
        }

        const isCurrent = state.current && state.current.uuid === conf.uuid;
        const expAvailbleOffline = [...state.lessons, ...state.sandboxes].find(exp => exp.uuid === conf.uuid)?.availableOffline || false;
        const exp: Experience = { name: conf.name, uuid: conf.uuid, type: conf.type, availableOffline: true, preloadedPythonLibs: conf.preloadPythonLibs };
        let importObsv: Observable<never>;

        // user chose to overwrite experience
        if (overwrite) {
          if (isCurrent) {
            // experience user wants to import and overwrite is the one which is currently open --> no need to mount, just delete and store everything from zip
            importObsv = concat(
              this.fs.deleteFolder(`/${conf.uuid}`, false, false,[`/${conf.uuid}/config.json`]),
              this.fs.storeExperience(zipFile, conf.uuid, true),
              this.fs.sync(false)
            ).pipe(finalize(() => this.store.dispatch([
                new ImportAction.OverwriteCurrent(exp),
                new ExperienceAction.UpdateExperience(exp), 
                new ExperienceAction.ChangeCurrent(exp),
                new AppAction.Change("READY")
              ])))
          } else {
            // experience user wants to import and overwrite isn't mounted currently --> mount it temporarily, replace everything, unmount
            importObsv = concat(
              this.fs.mount(conf.uuid),
              expAvailbleOffline ? this.fs.sync(true) : EMPTY,
              expAvailbleOffline ? this.fs.deleteFolder(`/${conf.uuid}`, false, false, []) : EMPTY,
              this.fs.storeExperience(zipFile, conf.uuid),
              this.fs.sync(false),
              this.fs.unmount(`/${conf.uuid}`)
            ).pipe(finalize(() => this.store.dispatch([new ExperienceAction.UpdateExperience(exp), new AppAction.Change("READY")])))
  
          }
        } else {
          // regular import or import of lesson which wasn't yet downloaded
          importObsv = concat(
            this.fs.mount(conf.uuid),
            this.fs.storeExperience(zipFile, conf.uuid),
            generateUuid ? this.conf.updateConfig(conf) : EMPTY,
            this.fs.sync(false),
            this.fs.unmount(conf.uuid)
          ).pipe(finalize(() => {
              if (generateUuid) {
                this.store.dispatch(new ExperienceAction.Add(exp));
              } else {
                // import of lesson which wasn't yet downloaded
                this.store.dispatch(new ExperienceAction.UpdateExperience(exp))
              }

              this.store.dispatch(new AppAction.Change("READY"));
          }))
        }

        return importObsv;
      })
    ) 
  }
}