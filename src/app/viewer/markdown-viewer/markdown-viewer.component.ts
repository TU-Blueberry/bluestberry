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
    /**
     * Example how to overwrite the default behavior of the ngx-markdown renderer.
     * Defaults are defined in node_modules/marked/src/Renderer.js.
     *
     * Currently 'text' is misused for class assignment to apply a specific styling.
     * The corresponding classes must be defined in styles.scss.
    **/
    this.markdownService.renderer.image = (href, title, text) => {
      if (href === null) {
        return '<p style="color: #cc0000">Kein href-Argument übergeben!</p>';
      }

      let out = '<img src="' + href + '" alt="Hier sollte eigentlich ein Bild sein!"';

      if (text) {
        out += ' class="' + text + '"'
      }
      if (title) {
        out += ' title="' + title + '"';
      }
      out += '>'

      return out;
    }

    this.fileTabDirective.dataChanges.subscribe(data => {
      if(data) {
        this.content = new TextDecoder().decode(data.content);
      }
    });
  }
}
