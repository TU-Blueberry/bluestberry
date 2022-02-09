import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import { concat, from, merge, Observable, of, throwError, zip } from 'rxjs';
import { debounceTime, filter, switchMap, take, withLatestFrom } from 'rxjs/operators';
import { AppState, AppStateModel } from 'src/app/app.state';
import { ExperienceState, ExperienceStateModel } from 'src/app/experience/experience.state';
import { Config } from 'src/app/experience/model/config';
import { Experience } from 'src/app/experience/model/experience';
import { FilesystemService } from 'src/app/filesystem/filesystem.service';
import { Tab } from 'src/app/tab/model/tab.model';
import { TabState, TabStateModel } from 'src/app/tab/tab.state';
import { ViewSettings } from 'src/app/viewer/model/view-settings';
import { ViewSizeState } from 'src/app/viewer/sizes.state';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  constructor(private fs: FilesystemService, private store: Store) {
    const appState$ = this.store.select<AppStateModel>(AppState);
    appState$.subscribe();

    merge(this.store.select<ViewSettings>(ViewSizeState), this.store.select<TabStateModel>(TabState)).pipe(
      withLatestFrom(appState$),
      filter(([_, appState]) => appState !== undefined && appState.status === 'READY'),
      debounceTime(1000),
      switchMap(() => this.saveStateOfCurrentExperience())
    ).subscribe();
  }

  public storeConfig(config: Config): Observable<never> {
    return this.encryptConfig(config).pipe(
      switchMap(buffer => this.fs.createFile(`/${config.uuid}/config.json`, new Uint8Array(buffer), false))
    )
  }

  public getConfigByExperience(exp: Experience): Observable<Config> {
    return this.fs.getFileAsBinary(`/${exp.uuid}/config.json`).pipe(
      switchMap(buff => this.decryptConfig(buff)),
      switchMap(decrypted => {
        const conf = <Config>JSON.parse(new TextDecoder().decode(decrypted))
        console.log("decrypted", conf)
        return of(conf)
      })
    )
  }

  public getConfigOfCurrentExperience(): Observable<Config> {
    return this.getCurrentExperience().pipe(
      switchMap(exp => this.getConfigByExperience(exp))
    )
  }

  public getHintRoot(exp: Experience): Observable<string> {
    return this.getConfigByExperience(exp).pipe(
      switchMap(conf => of(`${conf.hintRoot}/root.yml`))
    )
  }

  public saveStateOfCurrentExperience(): Observable<never> {
    return this.getCurrentExperience().pipe(
      take(1),
      switchMap(exp => zip(
        this.store.selectOnce<ViewSettings>(ViewSizeState),
        this.store.selectOnce<TabStateModel>(TabState),
        this.getConfigByExperience(exp)
      )),
      switchMap(([settings, tabs, conf]) => {
        conf.splitSettings = settings
        conf.open = this.convertTabStateModel(tabs);
        return this.updateConfig(conf);
      })
    )
  }

  private updateConfig(config: Config): Observable<never> {
    return concat(
      this.encryptConfig(config).pipe(
        switchMap(buffer => this.fs.overwriteFile(`/${config.uuid}/config.json`, new Uint8Array(buffer), 0o555))
      ),
      this.fs.sync(false)
    )
  }

  private getCurrentExperience(): Observable<Experience> {
    return this.store.select<ExperienceStateModel>(ExperienceState).pipe(
      switchMap(state => {
        return !state.current ? throwError("No current experience") : of(state.current);
      }       
    ))
  }

  private convertTabStateModel(tabs: TabStateModel): Array<{path: string, on: string, active: boolean}> {
    const open: Array<{ path: string, on: string, active: boolean }> = [];

    Object.entries(tabs).forEach(([groupId, content]) => {
      content.tabs.forEach(tab => {
        open.push(({
          on: groupId, 
          path: tab.path !== '' ? tab.path : tab.type,
          active: this.checkIfActive(content, tab)
        }))
      })
    })

    return open;
  }

  private checkIfActive(group: { tabs: Tab[]; active?: Tab | undefined }, tab: Tab): boolean {
    if (tab.path === '') {
      return (group.active && group.active.type === tab.type && group.active.title === tab.title && group.active.path === tab.path) || false;
    } else {
      return (group.active && tab.path === group.active.path) || false
    }
  }

  private getKey(): Observable<CryptoKey> {
    const key = window.crypto.subtle.importKey("jwk", environment.aesKey, { name: "AES-GCM" }, false, ["encrypt", "decrypt"])
    return from(key);
  }

  private encryptConfig(config: Config): Observable<ArrayBuffer> {
    const enc = new TextEncoder().encode(JSON.stringify(config));
 
    return this.getKey().pipe(
      switchMap(key => {
        return from(window.crypto.subtle.encrypt({
          name: 'AES-GCM',
          iv: environment.iv
        }, key, enc))
      })
    );
  }

  private decryptConfig(data: ArrayBuffer): Observable<ArrayBuffer> {
    return this.getKey().pipe(
      switchMap(key => {
        return from(window.crypto.subtle.decrypt({ 
          name: "AES-GCM",
          iv: environment.iv
        },
        key,
        data
        ))
      })
    )
  }
}
