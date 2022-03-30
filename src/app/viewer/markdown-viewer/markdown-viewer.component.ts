import {Component, OnInit} from '@angular/core';
import {KatexOptions, MarkdownService} from "ngx-markdown";
import { FilesystemService } from 'src/app/filesystem/filesystem.service';
import {FileTabDirective} from "../../tab/file-tab.directive";
import { fromByteArray } from "base64-js"

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
    private fs: FilesystemService,
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

      let out = '';

      if (href.startsWith('http')) {
        out = '<img src="' + href + '" alt="Hier sollte eigentlich ein Bild sein!"';
      } else {
        // glossary entries support images from the local file system!
        // image path needs to be absolute
        try {
          const file = this.fs.getFileAsBinarySync(href);
          const extension = href.split('.').pop() || 'png';
          const image = `data:image/${extension};base64,${fromByteArray(file)}`;
  
          out = '<img src="' + image + '" alt="Hier sollte eigentlich ein Bild sein!"';
  
          if (text) {
            out += ' class="' + text + '"'
          }
          if (title) {
            out += ' title="' + title + '"';
          }
          out += '>'
        } catch (err) {
          out = '<p style="color: #cc0000">Fehler beim Laden des Bildes!</p>';
        }
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
