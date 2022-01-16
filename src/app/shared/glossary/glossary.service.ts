import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { concat, forkJoin, Observable, of, ReplaySubject, zip } from 'rxjs';
import { filter, map, mergeMap, switchMap, tap } from 'rxjs/operators';
import { FilesystemService } from 'src/app/filesystem/filesystem.service';
import { LessonEventsService } from 'src/app/lesson/lesson-events.service';
import { ExperienceType } from 'src/app/lesson/model/experience-type';

@Injectable({
  providedIn: 'root'
})
export class GlossaryService {
  public glossaryEntries$ = new ReplaySubject<{path: string, node: FSNode}[]>();

  constructor(private lse: LessonEventsService, private fs: FilesystemService, private http: HttpClient, private location: Location) {
    lse.onExperienceOpened.subscribe((exp) => this.changeGlossary(exp))
  }

  private changeGlossary(exp: {open: {path: string, on: string}[], name: string, type: ExperienceType, tabSizes: number[]}) {
    const expGlossary: Observable<FSNode[][]> = this.fs.exists(`/${exp.name}/glossary`).pipe(
      switchMap(exists => {
        const empty: FSNode[][] = [[], []];
        return exists ? this.fs.scan(`/${exp.name}/glossary`, 1, true, true) : of(empty);
      })
    )

    forkJoin([
      this.fs.scan('/glossary', 0, true, true),
      expGlossary
    ]).pipe(
        map(([[_, globalFiles], [__, expFiles]]) => {
          const globalEntries = globalFiles.map(file => ({ path: `/glossary/${file.name}`, node: file }));
          const newEntries = expFiles.map(file => ({ path: `/${exp.name}/glossary/${file.name}`, node: file}))
                                     .filter(file => globalEntries.findIndex(e => e.path === file.path) === -1);
          this.glossaryEntries$.next(newEntries); // [...globalEntries, ...newEntries]
        })
    ).subscribe();
  }

  // TODO: Http errors in this method should not cause application load to fail!
  // TODO: if modified since serverseitig + testen

  // TODO: Wechsel zwischen lektion/lektion, lektion/sandbox und sandbox/lektion testen
  // TODO: Prüfen, ob glossary ordner (2x) trotzdem readonly sind!
  // TODO: Search service

  // global entries are stored in /glossary, lesson-specific ones stay inside the lesson
  public loadGlobalGlossaryEntries() {
    const url = this.location.prepareExternalUrl('/assets/glossary.json');
    
    return zip(
      this.http.get<string[]>(url),
      this.fs.scan('/glossary', 0, true, false)
    ).pipe(
      switchMap(([list, [_, files]]) => {
        const newEntries = list.filter(entry => files.findIndex(element => `${element.name}` === entry) === -1);
        const toDelete = files.filter(file => list.findIndex(element => element === `${file.name}`) === -1);
        const remaining = files.filter(file => list.findIndex(element => element === `${file.name}`) !== -1);

        return concat(
          this.fetchNewEntries(newEntries),
          this.deleteEntries(toDelete),
          this.checkRemaining(remaining)
        )
      })
    )
  }

  // TODO: wegen sync gucken
  private fetchNewEntries(newEntries: string[]) {
    return forkJoin(
      newEntries.map(entry => this.http.get(this.location.prepareExternalUrl(`/assets/glossary/${entry}`), {responseType: 'text'}).pipe(
        switchMap(res => this.fs.createFile(`/glossary/${entry}`, res, true, 0o555))
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