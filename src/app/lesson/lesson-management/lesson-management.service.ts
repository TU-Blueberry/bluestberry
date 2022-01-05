import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import { concat, defer, EMPTY, iif, Observable, of, ReplaySubject, throwError, zip } from 'rxjs';
import { ignoreElements, switchMap, tap } from 'rxjs/operators';
import { FilesystemService } from '../../filesystem/filesystem.service';
import { ZipService } from '../../filesystem/zip/zip.service';
import { PyodideService } from 'src/app/pyodide/pyodide.service';
import { LessonEventsService } from '../lesson-events.service';
import { Injectable } from '@angular/core';
import { Experience } from '../model/experience';
import { ConfigObject } from 'src/app/filesystem/model/config';

@Injectable({
  providedIn: 'root'
})
export class LessonManagementService {
  private lessons: Experience[] = [];
  private sandboxes: Experience[] = [];
  public experiences$ = new ReplaySubject<{lessons: Experience[], sandboxes: Experience[], switchTo?: Experience, deleted?: Experience}>();

  constructor(private http: HttpClient, private zipService: ZipService, private fsService: FilesystemService, 
    private location: Location, private py: PyodideService, private lse: LessonEventsService) {
      concat(
        this.fsService.test,
        this.getAllOptions()
      ).subscribe(() => {}) // TODO: Probably display errors
    }

  /** Checks whether lesson with the given name already exists in the local filesystem. 
   * If yes, the content from the local filesystem is used.
   * If no, the lesson with the given name will be requested from the server and stored afterwards */
  public openLesson(lesson: Experience) {
    return concat(
      this.py.pyodide.pipe(ignoreElements()), 
      this.fsService.isNewLesson(lesson.name).pipe(tap((isNewLesson) => console.log(`%cisEmpty? ${isNewLesson}`, "color: red")))
    ).pipe(
      switchMap(isNewLesson => iif(() => isNewLesson, 
        this.loadAndStoreLesson(lesson), 
        this.openExistingExperience(lesson)
      )
     )
    ) 
  }

  public openSandbox(sandbox: Experience) {
    return this.openExistingExperience(sandbox);
  }
 
  public createAndStoreSandbox(name: string) {
    const newConfig: ConfigObject = {
      open: [],
      name: name, 
      type: 'SANDBOX',
      tabSizes: [],
      unityEntryPoint: '',
      encrypted: [],
      hidden: [],
      external: [],
      readonly: [],
      glossaryEntryPoint: ''
    }

    const helper = new Observable(subscriber => {
      const sandbox: Experience = {name: name, type: "SANDBOX"}
      this.sandboxes.push(sandbox);
      this.experiences$.next({lessons: this.lessons, sandboxes: this.sandboxes, switchTo: sandbox})
      subscriber.complete();
    })

    return concat(
      this.fsService.storeConfig(newConfig),
      this.fsService.mountAndSync(`/sandbox_${name}`), // create folder for new sandbox and sync it
      this.fsService.unmountAndSync(`/sandbox_${name}`),
      helper
    )
  }

  // TODO: Doesn't work properly yet!
  // TODO: Config löschen!
  public deleteSandbox(needsMount: boolean, sandbox?: Experience, ): Observable<void> {
    console.log("delete sandbox called", sandbox);
    console.log("needs mount? ", needsMount)

    if (!sandbox) {
      return throwError("Fehler: Es wurde keine Sandbox zum Löschen übergeben");
    }

    if (sandbox.type !== 'SANDBOX') {
      return throwError("Fehler: Nur Sandboxes können gelöscht werden")
    } 

    // sandbox may either be already mounted (in case it is currently being used by the user) or unmounted
    let baseObservable: Observable<void>
    
    if (needsMount) {
      baseObservable = concat(
        this.fsService.mountAndSync(`/sandbox_${sandbox.name}`),
        this.fsService.deleteFolder(`/sandbox_${sandbox.name}`, false),
        this.fsService.unmountAndSync(`/sandbox_${sandbox.name}`)
      );
    } else {
      baseObservable = this.closeExperience(sandbox, true)
    }

    return baseObservable.pipe(switchMap(() => {
      this.sandboxes = this.sandboxes.filter(element => element.name !== sandbox.name);
      this.experiences$.next({lessons: this.lessons, sandboxes: this.sandboxes, deleted: sandbox});
      return EMPTY;
    }))
  }
 
  // TODO: Kann sein, dass öffnen von Tabs leicht angepasst werden muss 
  private openExistingExperience(exp: Experience) {
    const path = exp.type === 'LESSON' ? exp.name : `/sandbox_${exp.name}`;
    const symlinkSandbox = exp.type === 'SANDBOX' ? defer(() => this.fsService.createSymlink(`/sandbox_${exp.name}`, `/${exp.name}`)) : EMPTY;

    return concat(
      this.fsService.mountAndSync(path),
      this.py.addToSysPath(`/${exp.name}`),
      symlinkSandbox,
      this.fsService.changeWorkingDirectory(`/${exp.name}`),
      this.checkExperienceAfterMount(exp)
    )
  }

  // if delete flag is set, experience will be deleted before closing it
  // emscripten provides no real way of permanently deleting IDBs, see https://github.com/emscripten-core/emscripten/issues/4952
  public closeExperience(exp: Experience, deleteBeforeClose: boolean): Observable<void> {
    const fullPath = exp.type === 'LESSON' ? `/${exp.name}` : `/sandbox_${exp.name}`;
    const unlinkSandbox = exp.type === 'SANDBOX' ? defer(() => this.fsService.unlinkPath(`/${exp.name}`)) : EMPTY;

    return concat(
      unlinkSandbox,
      this.py.removeFromSysPath(`/${exp.name}`),
      this.fsService.changeWorkingDirectory("/"),
      this.fsService.unmountAndSync(fullPath),
      this.fsService.reset(),
      deleteBeforeClose ? this.fsService.deleteIDB(`/sandbox_${exp.name}`) : EMPTY,
      of(this.lse.emitExperienceClosed(fullPath))
    )
  }

  public changeExperience(oldExperience: Experience, newExperience: Experience) {
    // if we switch to a lesson we need to call openLesson in order to check if the lesson needs to be downloaded first
    const helper = newExperience.type === 'LESSON' ? this.openLesson(newExperience) : this.openExistingExperience(newExperience);
    
    return concat(
      oldExperience.name !== '' ? this.closeExperience(oldExperience, false) : EMPTY,
      helper
    );
  }

  /** Get all possible lessons/sandbox. This includes lessons which are available on
   * the server, lessons which were removed from the server but are still stored locally
   * as well as all local sandboxes. */
  private getAllOptions() {
    return zip(this.fsService.getAllConfigs(), this.getLessonList()).pipe(
      tap(([configs, serverList]) => {
        this.lessons = serverList.map(lesson => ({name: lesson, type: "LESSON"}));

        configs.forEach(config => {
          if (config.type === 'LESSON') {
            if (!this.lessons.find(element => element.name === config.name)) {
              this.lessons.push({name: config.name, type: "LESSON"});
            }
          } else {
            this.sandboxes.push({name: config.name, type: "SANDBOX"});
          }
        });

        this.experiences$.next({lessons: this.lessons, sandboxes: this.sandboxes})
      })
    )
  }  

  /** Retrieves the lesson with the given name from the server */
  private loadLessonFromServer(name: string) {
    const url = this.location.prepareExternalUrl(`/assets/${name}.zip`);
    return this.http.get(url, { responseType: 'arraybuffer' });
  }

  private getLessonList(): Observable<string[]> {
    const url = this.location.prepareExternalUrl('/assets/lessons.json');
    return this.http.get<string[]>(url);
  }

  private loadAndStoreLesson(lesson: Experience) {
    return concat(
      this.loadLessonFromServer(lesson.name).pipe(
        switchMap(buff => this.zipService.loadZip(buff)),
        switchMap(zip => 
          concat(
            this.fsService.mountAndSync(lesson.name).pipe(ignoreElements()),
            this.fsService.storeLesson(zip, lesson.name).pipe(ignoreElements()), 
            this.zipService.getConfigFromStream(zip).pipe(
              switchMap(config => this.fsService.storeConfig(config))),
            this.py.addToSysPath(lesson.name)
          )
        )
      ),
      this.checkExperienceAfterMount(lesson)
    )
  }

  // TODO: Gucken ob HIDDEN_PATHS etc. noch richtig sind
  private checkExperienceAfterMount(exp: Experience): Observable<void>{
    const fullPath = `/${exp.name}`;

    return this.fsService.getConfigByExperience(exp).pipe(switchMap(config => {  
      if (config) {
        console.log("%c Config found!", "color: green", config)
        this.fsService.HIDDEN_PATHS = new Set(this.filterPaths(fullPath, config.hidden));
        this.fsService.MODULE_PATHS = new Set(this.filterPaths(fullPath, config.modules || []));
        this.fsService.READONLY_PATHS = new Set(this.filterPaths(fullPath, config.readonly));
        this.fsService.EXTERNAL_PATHS = new Set(this.filterPaths(fullPath, config.external));
  
        return concat(
          this.fsService.checkPermissions(fullPath, false),
          this.fsService.sync(false),
          of(this.lse.emitExperienceOpened(config))
        );
      } else {
        return throwError("No config found!")
      }
    }));
  }

  private filterPaths(name: string, paths: string[]): string[] {
    return paths.filter(path => path.trim() !== "" && path.trim() !== "/").map(path => `${name}/${path}`);
  }
}
