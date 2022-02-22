import { Injectable } from '@angular/core';
import { Actions, ofActionSuccessful } from '@ngxs/store';
import { BehaviorSubject, forkJoin, merge, Observable } from 'rxjs';
import { filter, finalize, switchMap } from 'rxjs/operators';
import { ExperienceAction } from '../experience/actions';
import {FilesystemService} from "../filesystem/filesystem.service";
import Fuse from 'fuse.js'
import { SearchEntry } from './search.model';
import { FilesystemEventService } from '../filesystem/events/filesystem-event.service';

@Injectable({
  providedIn: 'root'
})

export class SearchService {
  private isLoaded = false;
  private fuse: Fuse<SearchEntry>;
  private readonly MAX_SEARCH_SUGGESTIONS = 5;
  lastSearchedTerms: string[] = []
  lastSearches$ = new BehaviorSubject<string[]>(this.lastSearchedTerms);

  constructor(private fsService: FilesystemService, private action$: Actions, private ev: FilesystemEventService) {
    this.fuse = new Fuse([], { keys: ['name', 'path'], useExtendedSearch: true });
    this.action$.pipe(
      ofActionSuccessful(ExperienceAction.Open),
      switchMap((action: ExperienceAction.Open) => merge(
        this.scan(`/${action.exp.uuid}`, 0),
        this.scan('/glossary', 0)
      ).pipe(finalize(() => this.isLoaded = true )))
    ).subscribe();

    // potential improvement: save and store generated index when closing exp, use it once exp is opened again
    this.action$.pipe(
      ofActionSuccessful(ExperienceAction.Close)
    ).subscribe(() => this.reset())

    this.ev.onDeletePath.pipe(
      filter(() => this.isLoaded)
    ).subscribe(path => this.onDeletePath(path));

    this.ev.onMovePath.pipe(
      filter(() => this.isLoaded)
    ).subscribe(params => this.onMovePath(params));

    this.ev.onWriteToFile.pipe(
      filter(() => this.isLoaded)
    ).subscribe(params => this.onWriteToFile(params));
  }

  private scan(path: string, depth: number): Observable<any> {
    return this.fsService.scanForSearch(path, depth, true).pipe(
      switchMap(([folders, files]) => {
        files.forEach(file => this.fuse.add({ name: file.name, path: `${path}/${file.name}` }));
        return forkJoin(folders.map(folder => this.scan(`${path}/${folder.name}`, depth + 1)));
      })
    )
  }

  private reset() {
    const options = {
      keys: ['name', 'path'],
    }

    this.fuse = new Fuse([], options);
    this.isLoaded = false;
  }

  // delete every matching entry
  private onDeletePath(path: string) {
    this.fuse.remove(doc => doc.path.startsWith(path));
  }

  // add file if it doesn't exist yet
  private onWriteToFile(params: { path: string, bytesWritten: number }) {  
    if (this.fuse.search(`="${params.path}"`).length === 0) {
      const parts = params.path.split('/')
      const name = parts.pop();

      if (name && this.fsService.isAllowedPath(params.path, false, true)) {
        // hide config.json on root level of expierience (/<uuid>/config.json)
        if ((name !== 'config.json') || (name === 'config.json' && parts.length > 2)) {
          this.fuse.add({ name: name, path: params.path })
        } 
      }
    } 
  }

  // onMovePath is triggered for both files and folders
  private onMovePath(params: { oldPath: string, newPath: string, extension: string }) {
    const removed = this.fuse.remove(doc => doc.path.startsWith(params.oldPath));
    removed.forEach(entry => {
      const updatedEntry: SearchEntry = {
        // folders have no extension
        name: params.extension === '' ? entry.name : params.newPath.split('/').pop() || '', 
        path: entry.path.replace(params.oldPath, params.newPath) 
      }
      this.fuse.add(updatedEntry);
    })
  }

  public addSearchToHistory(searchTerm: string) {
    const index = this.lastSearchedTerms.indexOf(searchTerm);

    if(index > -1) {
      this.lastSearchedTerms = this.lastSearchedTerms.filter(st => st !== searchTerm);
    }
    this.lastSearchedTerms.push(searchTerm);

    if (this.lastSearchedTerms.length > this.MAX_SEARCH_SUGGESTIONS) {
      this.lastSearchedTerms.shift();
    }
    this.lastSearches$.next(this.lastSearchedTerms);
  }

  public deleteSearchFromHistory(searchTerm: string) {
    this.lastSearchedTerms = this.lastSearchedTerms.filter(st => st !== searchTerm);
    this.lastSearches$.next(this.lastSearchedTerms);
  }

  public search(searchTerm: string) {
    // data is indexed by name and path; user search shall only consider name
    return this.fuse.search({ $and: [{ name: searchTerm }] }, { limit: this.MAX_SEARCH_SUGGESTIONS });
  }
}
