import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import { concat, from, merge, Observable, of, throwError, zip } from 'rxjs';
import { debounceTime, filter, switchMap, take, withLatestFrom } from 'rxjs/operators';
import { AppState, AppStateModel } from 'src/app/app.state';
import { ExperienceState, ExperienceStateModel } from 'src/app/experience/experience.state';
import { Config } from 'src/app/experience/model/config';
import { Experience } from 'src/app/experience/model/experience';
import { FilesystemEventService } from 'src/app/filesystem/events/filesystem-event.service';
import { FilesystemService } from 'src/app/filesystem/filesystem.service';
import { Tab } from 'src/app/tab/model/tab.model';
import { TabState, TabStateModel } from 'src/app/tab/tab.state';
import { ViewSettings } from 'src/app/viewer/model/view-settings';
import { ViewSizeState } from 'src/app/viewer/sizes.state';
import { environment } from 'src/environments/environment';

interface TempConfig {
  [key: string]: any
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  constructor(private fs: FilesystemService, private store: Store, private fsEv: FilesystemEventService) {
    const appState$ = this.store.select<AppStateModel>(AppState);
    appState$.subscribe();

    merge(this.store.select<ViewSettings>(ViewSizeState), this.store.select<TabStateModel>(TabState)).pipe(
      withLatestFrom(appState$),
      filter(([_, appState]) => appState !== undefined && appState.status === 'READY'),
      debounceTime(1000),
      switchMap(() => this.saveStateOfCurrentExperience())
    ).subscribe();

    this.fsEv.onMovePath.pipe(
      switchMap(info => this.updateAfterPathMove(info.oldPath, info.newPath))
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
      switchMap(decrypted => this.parseDecryptedConfig(decrypted))
    )
  }

  public parseDecryptedConfig(buff: ArrayBuffer): Observable<Config> {
    console.log("decrypted", <Config>JSON.parse(new TextDecoder().decode(buff)));
    return of(<Config>JSON.parse(new TextDecoder().decode(buff)))
  }

  public getConfigOfCurrentExperience(): Observable<Config> {
    return this.getCurrentExperience().pipe(
      switchMap(exp => this.getConfigByExperience(exp))
    )
  }

  public getAllLibPaths(exp: Experience): Observable<string[]> {
    return this.getConfigByExperience(exp).pipe(
      switchMap(conf => of(conf.modules.map(module => `/${conf.uuid}/${module}`)))
    )
  }

  public getHintRoot(exp: Experience): Observable<string> {
    return this.getConfigByExperience(exp).pipe(
      switchMap(conf => of(`/${conf.uuid}/${conf.hintRoot}/root.yml`))
    )
  }

  public getGlossaryEntryPoint(exp: Experience): Observable<string> {
    return this.getConfigByExperience(exp).pipe(
      switchMap(conf => of(`/${conf.uuid}/${conf.glossaryEntryPoint}`))
    )
  }

  public getUnityEntryPoint(exp: Experience): Observable<string> {
    return this.getConfigByExperience(exp).pipe(
      switchMap(conf => of(`/${conf.uuid}/${conf.unityEntryPoint}`))
    )
  }

  public getHintRootAndGlossaryEntryPointOfCurrentExperience(): Observable<{ hintRoot: string, glossaryEntryPoint: string }> {
    return this.getCurrentExperience().pipe(
      take(1),
      switchMap(exp => zip(this.getHintRoot(exp), this.getGlossaryEntryPoint(exp))),
      switchMap(([hintRoot, gep]) => of({ hintRoot: hintRoot, glossaryEntryPoint: gep }))
    );
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

  public getTabInfoPathOfCurrentExperience(): Observable<string> {
    return this.getConfigOfCurrentExperience().pipe(
      switchMap(conf => of(`/${conf.uuid}/${conf.tabinfo}`))
    )
  }

  public decryptConfig(data: ArrayBuffer): Observable<ArrayBuffer> {
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

  public updateConfig(config: Config): Observable<never> {
    return concat(
      this.encryptConfig(config).pipe(
        switchMap(buffer => this.fs.overwriteFile(`/${config.uuid}/config.json`, new Uint8Array(buffer), 0o555))
      ),
      this.fs.sync(false)
    )
  }

  public updateAfterPathMove(oldPath: string, newPath: string): Observable<never> {
    // oldPath and newPath are absolute, config is working with relative paths
    const oldPathRelative = oldPath.split('/').splice(2).join('/');
    const newPathRelative = newPath.split('/').splice(2).join('/');

    return this.getConfigOfCurrentExperience().pipe(
      switchMap(conf => {
        const tempConf: TempConfig = { ... conf }
        const stringProps = ['tabinfo', 'hintRoot', 'glossaryEntryPoint', 'unityEntryPoint'];
        const arrProps = ['encrypted', 'hidden', 'external', 'readonly', 'modules'];

        stringProps.forEach(prop => {
          if (tempConf[prop] && typeof tempConf[prop] === 'string' && tempConf[prop].startsWith(oldPathRelative)) {
            tempConf[prop] = tempConf[prop].replace(oldPathRelative, newPathRelative);
          }
        })

        arrProps.forEach(prop => {
          if (tempConf[prop]) {
            tempConf[prop] = tempConf[prop].map((entry: String) => entry.startsWith(oldPathRelative) 
            ? entry.replace(oldPathRelative, newPathRelative)
            : entry 
          )
          }
        })
      
        if (tempConf['open']) {
          tempConf['open'] = tempConf['open'].map((entry: any) => entry.path.startsWith(oldPathRelative) 
          ? ({ path: entry.path.replace(oldPathRelative, newPathRelative), on: entry.on, active: entry.active })
          : entry
          )
        }

        return this.updateConfig((tempConf as Config));
      })
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
}
