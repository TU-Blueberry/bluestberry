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
  // poor compatibility of idb with firefox currently
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
   * configs are stored in the root of the experience 
   * localstorage only stores uuid, name and type
   * at application startup, content of localstorage is compared to indexedb.databases() to make sure
   * every localstorage entry corresponds to an idb-database and vice versa
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

  // checks whether exp with given uuid already exists
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
   
  // possible improvement: catch cases where expierence has no config (shouldn't happen but you never know)
  // if no config.json exists, one could check whether some sort of glossary folder exists (would indicate that it is a lesson)
  // otherwise, one could
  //    ... create a new "best-effort" config for the experience in question with the available information
  //    ... or display experiences without a config seperately in the UI
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