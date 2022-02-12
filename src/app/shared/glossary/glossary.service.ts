import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { concat, forkJoin, Observable, of, ReplaySubject, zip } from 'rxjs';
import { filter, map, mergeMap, switchMap, tap } from 'rxjs/operators';
import { FilesystemService } from 'src/app/filesystem/filesystem.service';
import { Actions, ofActionSuccessful } from '@ngxs/store';
import { ExperienceAction } from 'src/app/experience/actions';
import { Experience } from 'src/app/experience/model/experience';
import { ConfigService } from '../config/config.service';

@Injectable({
  providedIn: 'root'
})
export class GlossaryService {
  public glossaryEntries$ = new ReplaySubject<{path: string, node: FSNode}[]>();

  constructor(private action$: Actions, private fs: FilesystemService, private http: HttpClient, private location: Location, private conf: ConfigService) {
    this.action$.pipe(
      ofActionSuccessful(ExperienceAction.Open)
    ).subscribe((action: ExperienceAction.Open) => this.changeGlossary(action.exp));
  }

  private changeGlossary(exp: Experience) {
    const expGlossary: Observable<{glossaryEntryPoint: string, nodes: FSNode[][]}> = this.conf.getConfigByExperience(exp).pipe(
      filter(conf => conf.glossaryEntryPoint !== ''),
      switchMap(conf => this.fs.exists(`/${exp.uuid}/${conf.glossaryEntryPoint}`).pipe(
        switchMap(exists => {
          const empty: FSNode[][] = [[], []];
          return exists ? this.fs.scanAll(`/${exp.uuid}/${conf.glossaryEntryPoint}`, 1, true) : of(empty);
        }),
        switchMap(nodes => of({ glossaryEntryPoint: conf.glossaryEntryPoint, nodes: nodes }))
      )) 
    )

    forkJoin([
      this.fs.scanAll('/glossary', 0, true),
      expGlossary
    ]).pipe(
        map((res, _) => {
   
          let globalFiles: FSNode[][];
          let expFiles: { glossaryEntryPoint: string, nodes: FSNode[][]};
          [globalFiles, expFiles] = res;

          const globalEntries = globalFiles[1].map(file => ({ path: `/glossary/${file.name}`, node: file }));
          const newEntries = expFiles.nodes[1].map(file => ({ path: `/${exp.uuid}/${expFiles.glossaryEntryPoint}/${file.name}`, node: file}))
                                     .filter(file => globalEntries.findIndex(e => e.node.name === file.node.name) === -1);
          this.glossaryEntries$.next(newEntries);
        })
    ).subscribe();
  }

  // TODO: Http errors in this method should not cause application load to fail!
  // TODO: if modified since serverseitig + testen

  // TODO: Wechsel zwischen lektion/lektion, lektion/sandbox und sandbox/lektion testen
  // TODO: Prüfen, ob glossary ordner (2x) trotzdem readonly sind!

  // global entries are stored in /glossary, lesson-specific ones stay inside the lesson
  public loadGlobalGlossaryEntries() {
    const url = this.location.prepareExternalUrl('/assets/glossary.json');
    
    return zip(
      this.http.get<string[]>(url),
      this.fs.scanAll('/glossary', 0, true)
    ).pipe(
      switchMap(([list, [_, files]]) => {
        const newEntries = list.filter(entry => files.findIndex(element => `${element.name}` === entry) === -1);
        const toDelete = files.filter(file => list.findIndex(element => element === `${file.name}`) === -1);
        const remaining = files.filter(file => list.findIndex(element => element === `${file.name}`) !== -1);

        return concat(
          this.fetchNewEntries(newEntries),
          this.deleteEntries(toDelete),
          this.checkRemaining(remaining),
          this.fs.sync(false)
        )
      })
    )
  }

  private fetchNewEntries(newEntries: string[]) {
    return forkJoin(
      newEntries.map(entry => this.http.get(this.location.prepareExternalUrl(`/assets/glossary/${entry}`), {responseType: 'text'}).pipe(
        switchMap(res => this.fs.createFile(`/glossary/${entry}`, res, false, 0o555))
      ))
    )
  }

  private deleteEntries(toDelete: FSNode[]) {
    return forkJoin(toDelete.map(entry => this.fs.deleteFile(`/glossary/${entry.name}`, false)));
  }

  // TODO: Von wann ist der timestamp? Hoffentlich der, wann erstmalig written
  // Check all remaining entries for updates and update local file if necessary
  private checkRemaining(remaining: FSNode[]) {
    return forkJoin(
      remaining.map(
        entry => this.http.get(
          this.location.prepareExternalUrl(`/assets/glossary/${entry.name}`), 
          { headers: { 'if-modified-since': `${entry.timestamp}`}, observe: 'response', responseType: 'text'}
        ).pipe(
          filter(resp => resp.status !== 304),
          tap(resp => console.log(resp)),
          mergeMap(content => {
            // TODO: Auf 0o555 klappt hier noch nicht
            // Vermutlich irgendwas damit zu tun, dass der /glossary Ordner dann schon/dann noch nicht
            // in READONLY_FOLDERS im fs ist?
            // TODO: Fix in service atm wieder rausgenommen
            console.log("overwrite!")
            return this.fs.overwriteFile(`/glossary/${entry.name}`, content.body || ''); 
          })
        )
      )
    ).pipe(tap((res) => console.log(res)));
  }
}
