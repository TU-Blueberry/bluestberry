import { Injectable } from '@angular/core';
import { concat, from, Observable, of, zip } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { FilesystemService } from 'src/app/filesystem/filesystem.service';
import { ExperienceEventsService } from 'src/app/experience/experience-events.service';
import { Experience } from 'src/app/experience/model/experience';
import { ConfigService } from '../shared/config/config.service';

@Injectable({
  providedIn: 'root'
})
export class ExperienceService {
  private readonly reservedNames = ['UnityCache', 'glossary', 'idbfs', 'idbfs-test']
  private validExperiences: Experience[] = [];

  constructor(private ees: ExperienceEventsService, private fs: FilesystemService, private conf: ConfigService) {
    ees.onExperienceOpened.subscribe(exp => {
      const item = localStorage.getItem(exp.uuid)

      if (item) {
        const parsed: Experience = JSON.parse(item);
        parsed.availableOffline = true;
        localStorage.setItem(exp.uuid, JSON.stringify(parsed));
      } else {
        const entry: Experience = {uuid: exp.uuid, name: exp.uuid, type: exp.type, availableOffline: true };
        localStorage.setItem(exp.uuid, JSON.stringify(entry));
      }
    });
  }

  /**
   * Configs liegen regulär im Verzeichnis der Experience
   * Im LocalStorage werden lediglich uuid, name und type abgespeichert
   * Beim Start der Anwendung wird Inhalt von localStorage mit indexedb.databases() verglichen
   */
  public getAllExperiencesFromLocalStorage(): Observable<Experience[]> {
    const items: {[key: string]: string} = { ...localStorage }

    return of(Object.keys(items)
      .filter(key => key !== 'lastExperience')
      .map(key => JSON.parse(items[key]))
    )
  }

  // TODO: Types
  // TODO: Firefox compatibiliy?
  // https://developer.mozilla.org/en-US/docs/Web/API/IDBFactory/databases
  public getAllExperiencesFromIDB(): Observable<Experience[]> {
    return from((window.indexedDB as any).databases()).pipe(
      map((infos: any) => infos
          .map((info: any) => ({ name: info.name.startsWith('/') ? info.name.substring(1) : info.name, version: info.version }))
          .filter((info: any) => !this.reservedNames.includes(info.name || ''))
          .map((info: any) => ({ uuid: info.name || '', name: '', type: 'UNKNOWN' }))
      )
    )
  }

  public getAndCheckAllExperiences(): Observable<Experience[]> {
    let validExp: Experience[] = [];
    let unknownExp: Experience[] = [];

    return zip(
      this.getAllExperiencesFromLocalStorage(),
      this.getAllExperiencesFromIDB()
    ).pipe(
      switchMap(([ls, idb]) => {
        validExp = [...ls.filter(exp => idb.find(idbExp => idbExp.uuid === exp.uuid))]
        unknownExp = [...idb.filter(exp => !ls.find(lsExp => lsExp.uuid === exp.uuid))]

        // remove all entries in local storage with no corresponding idb entry
        ls.filter(exp => !idb.find(idbExp => idbExp.uuid === exp.uuid))
          .forEach(exp => localStorage.removeItem(exp.uuid))

        return this.fixMissingExperiences(unknownExp).pipe(
          switchMap(fixed => {
            this.validExperiences = [...validExp, ...fixed];
            return of (this.validExperiences)
          })
        );
      })
    )
  }

  public exists(uuid: string): Observable<boolean> { 
    const exists = this.validExperiences.find(exp => exp.uuid === uuid) !== undefined
    return of(exists);
  }
 
  
  // Mögliche Erweiterung in Zukunft: Fälle abfangen, in denen zu einer Experience keine config.json existiert
  // Sollte eigentlich nicht vorkommen, aber man weiß ja nie...
  // Falls config.json also fehlt könnte man z.B. gucken, ob es glossary ordner gibt (Indiz für Lesson)
  // Ansonsten könnte man
  //    ... entweder neue config (sandbox-style) generieren (name dann identisch zu uuid oder ebenfalls zufällig generiert)
  //    ... oder in der UI separat anzeigen (z.B. "Experiences mit Problem")
  public fixMissingExperiences(exps: Experience[]): Observable<Experience[]> {
    const _exps = [...exps];
    const paths = exps.map(exp => exp.uuid)

    if (exps.length === 0) {
      return of([]);
    }

    return concat(
      this.fs.mountManySyncOnce(paths),
      zip(..._exps.map(exp => this.conf.getConfigByExperience(exp)))
    ).pipe(
      switchMap(confs => {
        const exps: Experience[] = confs.map(conf => ({ name: conf.name, uuid: conf.uuid, type: conf.type })) 
        exps.forEach(exp => localStorage.setItem(exp.uuid, JSON.stringify(({ ... exp, "availableOffline": true }))))

        return this.fs.unmountMany(paths).pipe(
          switchMap(() => {
            return of(exps);
          })
        )
      })
    )
  }
}
