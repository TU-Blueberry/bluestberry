import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {FilesystemService} from "../filesystem/filesystem.service";
import {SearchEntry} from "./search.model";

@Injectable({
  providedIn: 'root'
})

export class SearchService {
  private readonly MAX_SEARCH_SUGGESTIONS = 5;
  lastSearchedTerms: string[] = []
  lastSearches$ = new BehaviorSubject<string[]>(this.lastSearchedTerms);
  filePaths: string[] = [ // TODO: Either dynamically expand on folder/workspace creation or generalize search function
    '/sortierroboter',
    '/sortierroboter/BlueberryData/TrainingData',
    '/sortierroboter/glossary',
    '/sortierroboter/test_files',  //TODO: Remove eventually
    '/glossary'
  ];

  constructor(private fsService: FilesystemService) { }

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

  //Return array of files  with path to open in new tab in searchcomponent
  public search(searchTerm: string): SearchEntry[] {
    let matchingEntries: any[] = []

    if (searchTerm === '') {
      return matchingEntries;
    }

    for (const path of this.filePaths) {
      this.fsService.scanForSearch(path, 1, true).subscribe(
        data => {
          let files = data[1];
          for (const file of files) {
            if (file.name.toLowerCase().includes(searchTerm.toLowerCase())) {
              const fullPath = `${path}/${file.name}`
              matchingEntries.push(<SearchEntry>{file: file, path: fullPath});
            }
          }
        }
      );

    }
    // TODO: Search file content as well
    if (matchingEntries.length < this.MAX_SEARCH_SUGGESTIONS) {
      // let fileContent: string | Uint8Array
      // this.fsService.getFileContent("/sortierroboter/Glossary/example.md", "utf8").subscribe(
      //   data => {
      //     fileContent = data
      //   }
      // );
    }
    return matchingEntries.slice(0,this.MAX_SEARCH_SUGGESTIONS);
  }
}
