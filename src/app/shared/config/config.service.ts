import { Injectable } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Config } from 'src/app/experience/model/config';
import { Experience } from 'src/app/experience/model/experience';
import { FilesystemService } from 'src/app/filesystem/filesystem.service';
import { SplitAreaSettings } from 'src/app/viewer/model/split-settings';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  constructor(private fs: FilesystemService) { }

  public storeConfig(config: Config): Observable<never> {
    return this.encryptConfig(config).pipe(
      switchMap(buffer => this.fs.createFile(`/${config.uuid}/config.json`, new Uint8Array(buffer), false))
    )
  }

  public updateConfig(config: Config): Observable<never> {
    return this.encryptConfig(config).pipe(
      switchMap(buffer => this.fs.overwriteFile(`/${config.uuid}/config.json`, new Uint8Array(buffer)))
    )
  }

  public getConfigByExperience(exp: Experience): Observable<Config> {
    return this.fs.getFileAsBinary(`/${exp.uuid}/config.json`).pipe(
     switchMap(buff => this.decryptConfig(buff)),
     switchMap(decrypted => {
       console.log("decrypted", decrypted)
       const conf = <Config>JSON.parse(new TextDecoder().decode(decrypted))
       return of(conf)
     })
   )
 }

 // TODO: On load of settings from config:
 // set minSizeTab, minSizeFiletree variables!
 // (But only if config.tabSizes isnt empty)

 /*
 NGXS:
  was grade mit welchen größen offen ist
  tour active y/n

  später ggf. welche zeile im editor, wo bei den hints etc.

 */

 // TODO: Resize after toggle of sidebar

 // TODO: Aufrufende Methode muss sync machen!

 // TODO: Muss noch abspeichern, ob terminal gerade offen und wie groß dabei
 // TODO: After opening/after import/after switching:
    // check if hints/terminal is open and set buttons in sidebar accordingly!
 // TODO: probably allow configuring min/max sizes via config as well?!
 public updateTabsAndSizes(exp: Experience, settings: Map<string, SplitAreaSettings>, open: { path: string, on: string, active: boolean }[]) {
  return this.getConfigByExperience(exp).pipe(
    switchMap(conf => {
      conf.open = open;
      conf.splitSettings = [...settings];     
      return this.updateConfig(conf)  
    })
  )
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
        console.log("decryspt ", data)

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
