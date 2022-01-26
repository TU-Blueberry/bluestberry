import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import { concat, defer, EMPTY, iif, Observable, of, ReplaySubject, throwError, zip } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { FilesystemService } from '../../filesystem/filesystem.service';
import { ZipService } from '../../filesystem/zip/zip.service';
import { PyodideService } from 'src/app/pyodide/pyodide.service';
import { ExperienceEventsService } from '../experience-events.service';
import { Injectable } from '@angular/core';
import { Experience } from '../model/experience';
import { Config } from 'src/app/experience/model/config';
import { GlossaryService } from 'src/app/shared/glossary/glossary.service';
import { ExperienceService } from '../experience.service';
import { ConfigService } from 'src/app/shared/config/config.service';

@Injectable({
  providedIn: 'root'
})
export class ExperienceManagementService {
  private lessons: Experience[] = [];
  private sandboxes: Experience[] = [];
  public experiences$ = new ReplaySubject<{lessons: Experience[], sandboxes: Experience[], switchTo?: Experience, deleted?: Experience}>();

  constructor(private http: HttpClient, private zipService: ZipService, private fsService: FilesystemService, 
    private location: Location, private py: PyodideService, private ees: ExperienceEventsService, private gs: GlossaryService, 
    private expService: ExperienceService, private configService: ConfigService) {
      concat(
        this.fsService.test,
        this.gs.loadGlobalGlossaryEntries(),
        this.getAllOptions()
      ).subscribe(() => {}) // TODO: Probably display errors
    }

  /** Checks whether lesson with the given name already exists in the local filesystem. 
   * If yes, the content from the local filesystem is used.
   * If no, the lesson with the given name will be requested from the server and stored afterwards */
  public openLesson(lesson: Experience) {
    return concat(
      this.expService.exists(lesson.uuid)
    ).pipe(
      tap((existsAlready) => console.log(`%cexistsAlready? ${existsAlready}`, "color: red"))
    ).pipe(
      switchMap(existsAlready => iif(() => !existsAlready, 
        this.loadAndStoreLesson(lesson), 
        this.openExistingExperience(lesson)
      )
     )
    ) 
  }

  public openSandbox(sandbox: Experience): Observable<never> {
    return this.openExistingExperience(sandbox);
  }
 
  public createAndStoreSandbox(name: string): Observable<never> {
    const uuid = "TEMP";  // TODO: uuid

    const newConfig: Config = {
      open: [],
      uuid: uuid,
      name: name, 
      type: 'SANDBOX',
      splitSettings: [],
      unityEntryPoint: '',
      encrypted: [],
      hidden: [],
      external: [],
      readonly: [],
      glossaryEntryPoint: ''
    }

    return concat(
      this.fsService.mount(newConfig.uuid),
      this.configService.storeConfig(newConfig),
      this.fsService.sync(false),
      this.fsService.unmount(newConfig.uuid),
      defer(() => {
        const sandbox: Experience = {name: name, uuid: uuid, type: "SANDBOX", availableOffline: true}
        this.sandboxes.push(sandbox);
        this.experiences$.next({lessons: this.lessons, sandboxes: this.sandboxes, switchTo: sandbox})
      })
    )
  }

  // TODO: Delete from localStorage!
  public deleteSandbox(isMounted: boolean, sandbox?: Experience, ): Observable<never> {
    if (!sandbox) {
      return throwError("Fehler: Es wurde keine Sandbox zum Löschen übergeben");
    }

    if (sandbox.type !== 'SANDBOX') {
      return throwError("Fehler: Nur Sandboxes können gelöscht werden")
    } 

    return concat(
      isMounted ? 
      this.closeExperience(sandbox, true) :
      this.fsService.deleteIDB(`/${sandbox.uuid}`),
      defer(() => {
        this.sandboxes = this.sandboxes.filter(element => element.name !== sandbox.name);
        this.experiences$.next({lessons: this.lessons, sandboxes: this.sandboxes, deleted: sandbox});
      })
    )
  }
 
  private openExistingExperience(exp: Experience): Observable<never> {
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
      !deleteBeforeClose ? this.fsService.sync(false) : EMPTY,
      deleteBeforeClose ? this.fsService.deleteIDB(`/${exp.uuid}`) : EMPTY,
      defer(() => this.ees.emitExperienceClosed(`/${exp.uuid}`))
    )
  }

  public changeExperience(oldExperience: Experience, newExperience: Experience) {
    // need to call "openLesson" when switching to a lesson as we need to check whether the lesson needs to be downloaded
    return concat(
      oldExperience.uuid !== '' ? 
        this.closeExperience(oldExperience, false) : 
        EMPTY,
      newExperience.type === 'LESSON' ? 
        this.openLesson(newExperience) : 
        this.openExistingExperience(newExperience)
    );
  }

  /** Get all possible lessons/sandbox. This includes lessons which are available on
   * the server, lessons which were removed from the server but are still stored locally
   * as well as all local sandboxes. */
  private getAllOptions() {
    return zip(
      this.expService.getAndCheckAllExperiences(),
      this.getLessonList()
    ).pipe(
      tap(([validConfs, server]) => {
        this.lessons = validConfs.filter(conf => conf.type === 'LESSON');
        this.sandboxes = validConfs.filter(conf => conf.type === 'SANDBOX');

        server.map(lesson => ({name: lesson.name, uuid: lesson.uuid, type: 'LESSON', availableOffline: false}) as Experience)
          .filter(lesson => !validConfs.find(e => e.uuid === lesson.uuid))
          .forEach(conf => {
            if (conf.type === 'LESSON') {
              this.lessons.push(conf);
            }

            if (conf.type === 'SANDBOX') {
              this.sandboxes.push(conf)
            }
          });

        this.experiences$.next({lessons: this.lessons, sandboxes: this.sandboxes})
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
          this.checkExperienceAfterMount(lesson),
          defer(() => {
            const current = this.lessons.findIndex(l => l.uuid === lesson.uuid);

            if (current >= 0) {
              // since switching to lesson was successful, we can assume that it was downloaded
              // and stored in the filesystem, thus being available for offline use from now on
              this.lessons[current] = { ... this.lessons[current], availableOffline: true } 
              this.experiences$.next({lessons: this.lessons, sandboxes: this.sandboxes})
            }
          })
        )
      )
    )  
  }

  // TODO: Kann sein, dass readonly permissions hier zu spät gesetzt werden?
  // Wird ja immer erst nach dem Sync aufgerufen
  // sollte aber kein problem sein wenn das nach jedem mount so gesetzt wird
  private checkExperienceAfterMount(exp: Experience): Observable<never> {
    const fullPath = `/${exp.uuid}`;

    return this.configService.getConfigByExperience(exp).pipe(switchMap(config => {
      if (config) {
        console.log("%c Config found!", "color: green", config)
        this.fsService.EXP_HIDDEN_PATHS = new Set(this.filterPaths(fullPath, config.hidden));
        this.fsService.EXP_MODULE_PATHS = new Set(this.filterPaths(fullPath, config.modules || []));
        this.fsService.EXP_READONLY_PATHS = new Set(this.filterPaths(fullPath, config.readonly));
        this.fsService.EXP_EXTERNAL_PATHS = new Set(this.filterPaths(fullPath, config.external));
        this.fsService.EXP_GLOSSARY_PATH = `${fullPath}/glossary`;
  
        return concat(
          this.fsService.checkPermissionsForExperience(fullPath),
          this.fsService.checkPermissionsForGlossary(),
          defer(() => this.ees.emitExperienceOpened(config))
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
