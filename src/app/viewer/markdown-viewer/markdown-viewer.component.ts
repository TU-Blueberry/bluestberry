import {Component, OnInit} from '@angular/core';
import {KatexOptions, MarkdownService} from "ngx-markdown";
import {FileTabDirective} from "../../tab/file-tab.directive";

@Component({
  selector: 'app-markdown-viewer',
  templateUrl: './markdown-viewer.component.html',
  styleUrls: ['./markdown-viewer.component.scss']
})
export class MarkdownViewerComponent implements OnInit {
  content = ''
  options: KatexOptions = {
    // displayMode: true,
    throwOnError: false,
    errorColor: '#cc0000',
  }

  constructor(
    private markdownService: MarkdownService,
    private fileTabDirective: FileTabDirective,
  ) {}

  ngOnInit(): void {
    /* Sets class for images which is defined in styles.css */
    this.markdownService.renderer.image = (href, title, text) => {
      let out = '<img class="glossary-image"  src="' + href + '" alt="' + text + '"';

      if (title) {
        out += ' title="' + title + '"';
      }
      return out;
    }

    this.fileTabDirective.dataChanges.subscribe(data => {
      if(data) {
        this.content = new TextDecoder().decode(data.content);
      }
    });
  }
}
