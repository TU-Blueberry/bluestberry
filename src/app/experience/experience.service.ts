import { Injectable } from '@angular/core';
import { concat, EMPTY, from, Observable, of, zip } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { FilesystemService } from 'src/app/filesystem/filesystem.service';
import { Experience } from 'src/app/experience/model/experience';
import { ConfigService } from '../shared/config/config.service';
import { Store } from '@ngxs/store';
import { ExperienceState, ExperienceStateModel } from './experience.state';
import { ExperienceAction } from './actions';

@Injectable({
  providedIn: 'root'
})
export class ExperienceService {
  private readonly reservedNames = ['UnityCache', 'glossary', 'idbfs', 'idbfs-test']

  constructor(private store: Store, private fs: FilesystemService, private conf: ConfigService) { }

  // TODO: Types
  // TODO: Firefox compatibiliy?
  // https://developer.mozilla.org/en-US/docs/Web/API/IDBFactory/databases
  private getAllExperiencesFromIDB(): Observable<Experience[]> {
    return from((window.indexedDB as any).databases()).pipe(
      map((infos: any) => infos
          .map((info: any) => ({ name: info.name.startsWith('/') ? info.name.substring(1) : info.name, version: info.version }))
          .filter((info: any) => !this.reservedNames.includes(info.name || ''))
          .map((info: any) => ({ uuid: info.name || '', name: '', type: 'UNKNOWN' }))
      )
    )
  }

  /**
   * Configs liegen regulär im Verzeichnis der Experience
   * Im LocalStorage werden lediglich uuid, name und type abgespeichert
   * Beim Start der Anwendung wird Inhalt von localStorage mit indexedb.databases() verglichen
   */
  public checkAllExperiences(): Observable<never> {
    return zip(
      this.store.select<Experience[]>(state => state.experiences.lessons),
      this.store.select<Experience[]>(state => state.experiences.sandboxes),
      this.getAllExperiencesFromIDB()
    ).pipe(
      switchMap(([lessons, sandboxes, idb]) => {
        const state = [...lessons, ...sandboxes];
        const fixable = [...idb.filter(exp => !state.find(lsExp => lsExp.uuid === exp.uuid))]

        // remove all sandboxes with no corresponding idb entry
        sandboxes.filter(sb => !idb.find(idbExp => idbExp.uuid === sb.uuid))
          .forEach(sb => this.store.dispatch(new ExperienceAction.Remove(sb)));

        // change available lessons with no idb entry back to not-available
        lessons.filter(ls => ls.availableOffline === true)
          .filter(ls => !idb.find(idbExp => idbExp.uuid === ls.uuid))
          .forEach(ls => this.store.dispatch(new ExperienceAction.ResetAvailability(ls)))

        return this.fixMissingExperiences(fixable).pipe(
          switchMap(fixed => {
            fixed.forEach(exp => this.store.dispatch(new ExperienceAction.Add(exp)));
            return EMPTY
          })
        );
      })
    )
  }

  public available(uuid: string): Observable<boolean> { 
    return this.store.select<ExperienceStateModel>(ExperienceState).pipe(
      switchMap(state => {
        const exps = [...state.lessons, ...state.sandboxes];
        const exp = exps.find(exp => exp.uuid === uuid);
        let available = false;

        if (exp && exp.availableOffline && exp.availableOffline === true) {
          available = true;
        }
        
        return of(available)
      })
    )
  }
   
  // Mögliche Erweiterung in Zukunft: Fälle abfangen, in denen zu einer Experience keine config.json existiert
  // Sollte eigentlich nicht vorkommen, aber man weiß ja nie...
  // Falls config.json also fehlt könnte man z.B. gucken, ob es glossary ordner gibt (Indiz für Lesson)
  // Ansonsten könnte man
  //    ... entweder neue config (sandbox-style) generieren (name dann identisch zu uuid oder ebenfalls zufällig generiert)
  //    ... oder in der UI separat anzeigen (z.B. "Experiences mit Problem")
  private fixMissingExperiences(exps: Experience[]): Observable<Experience[]> {
    const _exps = [...exps];
    const paths = exps.map(exp => `/${exp.uuid}`)

    if (exps.length === 0) {
      return of([]);
    }

    return concat(
      this.fs.mountManySyncOnce(paths),
      zip(..._exps.map(exp => this.conf.getConfigByExperience(exp)))
    ).pipe(
      switchMap(confs => {
        const exps: Experience[] = confs.map(conf => ({ name: conf.name, uuid: conf.uuid, type: conf.type, availableOffline: true, preloadedPythonLibs: conf.preloadPythonLibs })) 

        return concat(
          this.fs.unmountMany(paths),
          of(exps)
        )
      })
    )
  }
}