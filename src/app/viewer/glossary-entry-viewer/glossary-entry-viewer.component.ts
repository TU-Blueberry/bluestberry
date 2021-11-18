import {Component, Input, OnInit} from '@angular/core';
import {KatexOptions, MarkdownService} from "ngx-markdown";
import {HttpClient} from "@angular/common/http";

@Component({
  selector: 'app-glossary-entry-viewer',
  templateUrl: './glossary-entry-viewer.component.html',
  styleUrls: ['./glossary-entry-viewer.component.scss']
})
export class GlossaryEntryViewerComponent implements OnInit {
  @Input() entryIdentifier = '';
  content = ''
  options: KatexOptions = {
    // displayMode: true,
    throwOnError: false,
    errorColor: '#cc0000',
  }

  constructor(private markdownService: MarkdownService, private http: HttpClient) {}

  ngOnInit(): void {
    /* Sets class for images which is defined in styles.css */
    this.markdownService.renderer.image = (href, title, text) => {
      let out = '<img class="glossary-image"  src="' + href + '" alt="' + text + '"';

      if (title) {
        out += ' title="' + title + '"';
      }

      return out;
    }

    /* Sets content of this glossary entry according to the given entryIdentifier */
    this.http.get('/assets/glossary/' + this.entryIdentifier + '/content.md', { responseType: 'text' })
      .subscribe(data => this.content = data);
    }
}
