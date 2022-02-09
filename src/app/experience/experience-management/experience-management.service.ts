import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import { concat, EMPTY, Observable, of, throwError } from 'rxjs';
import { switchMap, take, tap } from 'rxjs/operators';
import { FilesystemService } from '../../filesystem/filesystem.service';
import { ZipService } from '../../filesystem/zip/zip.service';
import { PyodideService } from 'src/app/pyodide/pyodide.service';
import { Injectable } from '@angular/core';
import { Experience } from '../model/experience';
import { Config } from 'src/app/experience/model/config';
import { GlossaryService } from 'src/app/shared/glossary/glossary.service';
import { ExperienceService } from '../experience.service';
import { ConfigService } from 'src/app/shared/config/config.service';
import { v4 as uuidv4 } from 'uuid';
import { Store } from '@ngxs/store';
import { ExperienceAction } from '../actions';
import { AppAction } from 'src/app/app.actions';
import { ViewDefaultSettings } from 'src/app/viewer/model/view-defaults';

@Injectable({
  providedIn: 'root'
})
export class ExperienceManagementService {
  constructor(private http: HttpClient, private zipService: ZipService, private fsService: FilesystemService, 
    private location: Location, private py: PyodideService, private gs: GlossaryService, 
    private expService: ExperienceService, private configService: ConfigService, private store: Store) {

      concat(
        this.fsService.test,
        this.gs.loadGlobalGlossaryEntries() , // TODO: error catchen?
        this.getAllOptions() // TODO: error catchen?
      ).subscribe(() => {}, err => console.error(err), () => {
        this.store.dispatch([
          new AppAction.Change("READY"),
          new ExperienceAction.RestoreLast()
        ])
      }); 
    }

  /** Checks whether lesson with the given name already exists in the local filesystem. 
   * If yes, the content from the local filesystem is used.
   * If no, the lesson with the given name will be requested from the server and stored afterwards */
  public openLesson(lesson: Experience): Observable<never> {
    return this.expService.available(lesson.uuid).pipe(
      tap((existsAlready) => console.log(`%cexistsAlready? ${existsAlready}`, "color: red")),
      take(1),
      switchMap(existsAlready => {
        return existsAlready ? this.openExistingExperience(lesson) : this.loadAndStoreLesson(lesson);        
      })
    )
  }

  public openSandbox(sandbox: Experience): Observable<never> {
    return this.openExistingExperience(sandbox);
  }
 
  public createAndStoreSandbox(name: string): Observable<Experience> {
    const uuid = uuidv4();

    const newConfig: Config = {
      open: [],
      uuid: uuid,
      name: name, 
      type: 'SANDBOX',
      splitSettings: ViewDefaultSettings,
      unityEntryPoint: '',
      encrypted: [],
      hidden: [],
      external: [],
      readonly: [],
      glossaryEntryPoint: '',
      hintRoot: ''
    }

    return concat(
      this.fsService.mount(newConfig.uuid),
      this.configService.storeConfig(newConfig),
      this.fsService.sync(false),
      this.fsService.unmount(newConfig.uuid),
      of(({name: name, uuid: uuid, type: "SANDBOX", availableOffline: true} as Experience))
    )
  }

  // TODO: probably need to clear tabGroups and active tabs on expclose
  public deleteSandbox(isMounted: boolean, sandbox?: Experience): Observable<never> {
    if (!sandbox) {
      return throwError("Fehler: Es wurde keine Sandbox zum Löschen übergeben");
    }

    if (sandbox.type !== 'SANDBOX') {
      return throwError("Fehler: Nur Sandboxes können gelöscht werden")
    } 

    return concat(
      isMounted ? 
      this.closeExperience(sandbox, true) :
      this.fsService.deleteIDB(`/${sandbox.uuid}`)
    )
  }
 
  public openExistingExperience(exp: Experience): Observable<never> {
    return concat(
      this.fsService.mount(exp.uuid),
      this.fsService.sync(true),
      this.py.addToSysPath(exp.uuid),
      this.fsService.changeWorkingDirectory(`/${exp.uuid}/${PyodideService.startFolderName}`),
      this.checkExperienceAfterMount(exp)
    )
  }

  // TODO: SET STARTFOLDERNAME in pyservice

  // if delete flag is set, experience will be deleted before closing it
  public closeExperience(exp: Experience, deleteBeforeClose: boolean) {
    return concat(
      this.py.removeFromSysPath(exp.uuid),
      this.fsService.changeWorkingDirectory('/'),
      this.fsService.unmount(exp.uuid),
      this.fsService.reset(),
      this.fsService.sync(false),
      deleteBeforeClose ? this.fsService.deleteIDB(`/${exp.uuid}`) : EMPTY
    )
  }

  /** Get all possible lessons/sandbox. This includes lessons which are available on
   * the server, lessons which were removed from the server but are still stored locally
   * as well as all local sandboxes. */
  private getAllOptions() {
    return concat(
      this.expService.checkAllExperiences(),
      this.getAndStoreAllLessons()
    )
  }

  private getAndStoreAllLessons(): Observable<never> {
    return this.getLessonList().pipe(
      switchMap(lessons => {
        lessons.map(lesson => ({name: lesson.name, uuid: lesson.uuid, type: 'LESSON', availableOffline: false}) as Experience)
          .forEach(lesson => this.store.dispatch(new ExperienceAction.Add(lesson)));

        return EMPTY;
      })
    )
  }

  /** Retrieves the lesson with the given name from the server */
  private loadLessonFromServer(uuid: string) {
    const url = this.location.prepareExternalUrl(`/assets/${uuid}.zip`);
    return this.http.get(url, { responseType: 'arraybuffer' });
  }

  private getLessonList(): Observable<{name: string, uuid: string}[]> {
    const url = this.location.prepareExternalUrl('/assets/lessons.json');
    return this.http.get<{name: string, uuid: string}[]>(url);
  }

  private loadAndStoreLesson(lesson: Experience) {
    return this.loadLessonFromServer(lesson.uuid).pipe(
      switchMap(buff => this.zipService.loadZip(buff)),
      switchMap(zip => 
        concat(
          this.fsService.mount(lesson.uuid),
          this.fsService.storeLesson(zip, lesson.uuid),
          this.fsService.sync(false),
          this.fsService.changeWorkingDirectory(`/${lesson.uuid}/${PyodideService.startFolderName}`),
          this.py.addToSysPath(lesson.uuid),
          this.checkExperienceAfterMount(lesson)
        )
      )
    )  
  }

  // TODO: Kann sein, dass readonly permissions hier zu spät gesetzt werden?
  // Wird ja immer erst nach dem Sync aufgerufen
  // sollte aber kein problem sein wenn das nach jedem mount so gesetzt wird
  private checkExperienceAfterMount(exp: Experience): Observable<never> {
    const fullPath = `/${exp.uuid}`;

    return this.configService.getConfigByExperience(exp).pipe(
      switchMap(config => {
        if (config) {
          console.log("%c Config found!", "color: green", config)
          this.fsService.EXP_HIDDEN_PATHS = new Set(this.filterPaths(fullPath, config.hidden));
          this.fsService.EXP_MODULE_PATHS = new Set(this.filterPaths(fullPath, config.modules || []));
          this.fsService.EXP_READONLY_PATHS = new Set(this.filterPaths(fullPath, config.readonly));
          this.fsService.EXP_EXTERNAL_PATHS = new Set(this.filterPaths(fullPath, config.external));
          this.fsService.EXP_GLOSSARY_PATH = `${fullPath}/glossary`;
          this.fsService.EXP_HINT_ROOT_PATH = `${fullPath}/${config.hintRoot}`;

          return concat(
            this.fsService.checkPermissionsForExperience(fullPath),
            this.fsService.checkPermissionsForGlobalGlossary(),
          );
        } else {
          return throwError("No config found!")
        }
    }));
  }

  private filterPaths(name: string, paths: string[]): string[] {
    return paths.filter(path => path.trim() !== "" && path.trim() !== "/")
                .map(path => `${name}/${path}`);
  }
}
