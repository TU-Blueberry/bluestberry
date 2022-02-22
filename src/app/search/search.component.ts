import { Component } from '@angular/core';
import { SearchService } from 'src/app/search/search.service';
import {SearchEntry} from "./search.model";
import {FilesystemEventService} from "../filesystem/events/filesystem-event.service";
import {UiEventsService} from "../ui-events.service";
import { FilesystemService } from '../filesystem/filesystem.service';
import Fuse from 'fuse.js'

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class SearchComponent {
  searchTerm = '';
  isBlurred = true;
  highlightedIndex = -1;
  lastSearches: string[] = [];
  matchingEntries: Fuse.FuseResult<SearchEntry>[] = [];

  constructor(
    private searchService: SearchService,
    private fs: FilesystemService,
    private ev: FilesystemEventService,
    private uiEv: UiEventsService,
  ) { }

  ngOnInit(): void {
    this.searchService.lastSearches$.subscribe(searches => {
      this.lastSearches = searches;
    });
  }

  clickSuggestion(entry: Fuse.FuseResult<SearchEntry>): void {
    this.fs.getNodeByPath(entry.item.path).subscribe(node => {
      this.ev.onUserOpenFile(entry.item.path, node);
      this.uiEv.onActiveElementChange.emit(entry.item.name);

      this.searchService.addSearchToHistory(this.searchTerm);
      this.clearSearch();
      this.highlightedIndex = -1;
      this.isBlurred = true;
    })
  }

  onEnter(): void {
    if (this.highlightedIndex >= 0 && this.highlightedIndex < this.matchingEntries.length) {
      this.clickSuggestion(this.matchingEntries[this.highlightedIndex]);
    }
  }

  clearSearch(): void {
    this.searchTerm = '';
  }

  selectHistoryElement(element: string) {
    this.onTermChange(element);
  }

  deleteHistoryElement(element: string) {
    this.searchService.deleteSearchFromHistory(element);
  }

  onTermChange(term: string) {
    this.searchTerm = term;
    this.matchingEntries = this.searchService.search(term);
  }

  onBlur(event: any): void {
    if (event.relatedTarget) {
      event.preventDefault();
    } else {
      this.isBlurred = true;
      this.highlightedIndex = -1;
    }
  }

  onFocus(): void {
    this.isBlurred = false;
  }

  focusNextElement() {
    const size = this.matchingEntries.length;

    if (this.highlightedIndex < size - 1) {
      this.highlightedIndex += 1;
    }
  }

  focusPreviousElement() {
    if (this.highlightedIndex >= 0) {
      this.highlightedIndex -= 1;
    }
  }
}
