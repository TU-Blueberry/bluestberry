import { Injectable } from '@angular/core';
import * as JSZip from 'jszip';
import { JSZipObject } from 'jszip';
import { from, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { FilesystemService } from '../filesystem.service';
import { ConfigObject } from '../model/config';
import { saveAs } from 'file-saver';

@Injectable({
  providedIn: 'root'
})
export class ZipService {
  zipper: JSZip = new JSZip();

  constructor(private fsService: FilesystemService) { }

  getConfigFromStream(unzipped: JSZip): Observable<ConfigObject> {
    return this.getFileFromZip("config.json", unzipped).pipe(switchMap(config => {
      const stream = config.internalStream("string");

      return new Observable<ConfigObject>(subscriber => {
        console.log("Get config from stream!!!!!")

        stream.on("error", () => subscriber.error("Error trying to stream config"));
        stream.accumulate().then((data => {
          const parsedConfig: ConfigObject = JSON.parse(data);
        
          if (parsedConfig.name) {
            console.log("NEXT: ", parsedConfig)
            subscriber.next(parsedConfig);
            subscriber.complete();
          } else {
            subscriber.error("Config is missing name property");
          }      
        }));
      });
    }));   
  }

  getFileFromZip(path: string, unzipped: JSZip): Observable<JSZipObject> {
    return new Observable(subscriber => {
      const file = unzipped.file(path);

      if (!file) {
        subscriber.error("Couldn't find config file");
      } else {
        subscriber.next(file);
        subscriber.complete();
      }
    });
  }

  export(name: string): Observable<void> {
    return this.exportLesson(name).pipe(map(blob => saveAs(blob, name)));
  }

  exportLesson(name: string): Observable<Blob> {
    return new Observable(subscriber => {
      const zip = new JSZip();
      this.fsService.fillZip(`/${name}/`, zip, name);
      zip.generateAsync({ type: "blob" }).then(function (blob) {
        subscriber.next(blob);
        subscriber.complete();
      }, function (err) {
        subscriber.error();
      });
    });
  }

  loadZip(buff: ArrayBuffer): Observable<JSZip> {
    return from(this.zipper.loadAsync(buff));
  }
 
}
