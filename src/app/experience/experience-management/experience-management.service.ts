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

      // could use some error handling
      // fs, glossary entries and list of available lessons/sandboxes need to be initialized/fetched before app is ready for user interaction
      concat(
        this.fsService.initFs,
        this.gs.loadGlobalGlossaryEntries(),
        this.getAllOptions()
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
      take(1),
      switchMap(existsAlready => {
        return existsAlready ? this.openExistingExperience(lesson) : this.loadAndStoreLesson(lesson);        
      })
    )
  }

  // sandboxes are always local, no need to download anything
  public openSandbox(sandbox: Experience): Observable<never> {
    return this.openExistingExperience(sandbox);
  }
 
  // create a new sandbox with default values
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
      modules: [],
      readonly: [],
      glossaryEntryPoint: '',
      hintRoot: '',
      preloadPythonLibs: [],
      tabinfo: '__tabinfo'  // folder to save content of special tabs, e.g. plotly, to restore on next load
    }

    return concat(
      this.fsService.mount(newConfig.uuid),
      this.fsService.createFolder(`/${newConfig.uuid}/${newConfig.tabinfo}`, false),
      this.configService.storeConfig(newConfig),
      this.fsService.sync(false),
      this.fsService.unmount(newConfig.uuid),
      of(({name: name, uuid: uuid, type: "SANDBOX", availableOffline: true} as Experience))
    )
  }

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
      this.getAllLibsAndAddToSysPath(exp),
      this.fsService.changeWorkingDirectory(`/${exp.uuid}`),
      this.checkExperienceAfterMount(exp)
    )
  }

  // if delete flag is set, experience will be deleted before closing it
  public closeExperience(exp: Experience, deleteBeforeClose: boolean) {
    return concat(
      this.removeAllLibPaths(exp),
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

  // get content of lessons.json
  private getAndStoreAllLessons(): Observable<never> {
    return this.getLessonList().pipe(
      switchMap(lessons => {
        lessons.map(lesson => ({name: lesson.name, uuid: lesson.uuid, type: 'LESSON', availableOffline: false}) as Experience)
          .forEach(lesson => this.store.dispatch(new ExperienceAction.Add(lesson)));

        return EMPTY;
      })
    )
  }

  // get all custom libs for this exp, add them to sys.path so they can be resolved during python execution
  private getAllLibsAndAddToSysPath(exp: Experience): Observable<never> {
    return this.configService.getAllLibPaths(exp).pipe(
      switchMap(libs => {
        this.py.addToSysPath(libs);
        return EMPTY; 
      })
    )
  }

  private removeAllLibPaths(exp: Experience): Observable<never> {
    return this.configService.getAllLibPaths(exp).pipe(
      switchMap(libs => {
        this.py.removeFromSysPath(libs);
        return EMPTY; 
      })
    )
  }

  /** Retrieves the lesson with the given name from the server */
  private loadLessonFromServer(name: string) {
    const url = this.location.prepareExternalUrl(`/assets/${name}.zip`);
    return this.http.get(url, { responseType: 'arraybuffer' });
  }

  private getLessonList(): Observable<{name: string, uuid: string}[]> {
    const url = this.location.prepareExternalUrl('/assets/lessons.json');
    return this.http.get<{name: string, uuid: string}[]>(url);
  }

  private loadAndStoreLesson(lesson: Experience) {
    return this.loadLessonFromServer(lesson.name).pipe(
      switchMap(buff => this.zipService.loadZip(buff)),
      switchMap(zip => 
        concat(
          this.fsService.mount(lesson.uuid),
          this.fsService.storeExperience(zip, lesson.uuid),
          this.fsService.sync(false),
          this.fsService.changeWorkingDirectory(`/${lesson.uuid}`),
          this.getAllLibsAndAddToSysPath(lesson),
          this.checkExperienceAfterMount(lesson)
        )
      )
    )  
  }

  // after experience is mounted, update fsService with info from config and check permissions
  private checkExperienceAfterMount(exp: Experience): Observable<never> {
    const fullPath = `/${exp.uuid}`;

    return this.configService.getConfigByExperience(exp).pipe(
      switchMap(config => {
        if (config) {
          this.fsService.EXP_HIDDEN_PATHS = new Set(this.filterEmptyConfigPaths(fullPath, config.hidden));
          this.fsService.EXP_MODULE_PATHS = new Set(this.filterEmptyConfigPaths(fullPath, config.modules));
          this.fsService.EXP_READONLY_PATHS = new Set(this.filterEmptyConfigPaths(fullPath, config.readonly));
          this.fsService.EXP_EXTERNAL_PATHS = new Set(this.filterEmptyConfigPaths(fullPath, config.external));
          this.fsService.EXP_GLOSSARY_PATH = new Set(this.filterEmptyConfigPaths(fullPath, [config.glossaryEntryPoint]));
          this.fsService.EXP_HINT_ROOT_PATH = new Set(this.filterEmptyConfigPaths(fullPath, [config.hintRoot]));
          this.fsService.EXP_TABINFO_PATH = new Set(this.filterEmptyConfigPaths(fullPath, [config.tabinfo]));

          // set rx permissions for experience where necessary and global glossary scope
          return concat(
            this.fsService.checkPermissionsForExperience(fullPath),
            this.fsService.checkPermissionsForGlobalGlossary(),
          );
        } else {
          return throwError("No config found!")
        }
    }));
  }

  // remove empty paths from config, map everything else to full absolute path
  private filterEmptyConfigPaths(parentPath: string, paths: string[]): string[] {
    return paths.filter(path => path.trim() !== "" && path.trim() !== "/")
                .map(path => `${parentPath}/${path}`);
  }
}
