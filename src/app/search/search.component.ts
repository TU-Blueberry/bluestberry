import { Component } from '@angular/core';
import { SearchService } from 'src/app/search/search.service';
import {SearchEntry} from "./search.model";
import {FilesystemEventService} from "../filesystem/events/filesystem-event.service";
import {UiEventsService} from "../ui-events.service";

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
  matchingEntries: SearchEntry[] = []

  constructor(
    private searchService: SearchService,
    private ev: FilesystemEventService,
    private uiEv: UiEventsService,
  ) { }

  ngOnInit(): void {
    this.searchService.lastSearches$.subscribe(searches => {
      this.lastSearches = searches;
    });
  }

  clickSuggestion(entry: SearchEntry): void {
    if(entry.file.contents instanceof Uint8Array) {
      this.ev.onUserOpenFile(entry.file.name, entry.file);
      this.uiEv.onActiveElementChange.emit(entry.file.name);
    }

    this.searchService.addSearchToHistory(this.searchTerm);
    this.clearSearch();
    this.highlightedIndex = -1;
    this.isBlurred = true;
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
