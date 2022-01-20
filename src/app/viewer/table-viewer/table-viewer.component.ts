import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, from, of, ReplaySubject } from 'rxjs';
import { concatMap, filter, map, mergeMap, share, skip, take, tap } from 'rxjs/operators';
import { FileTabDirective } from 'src/app/tab/file-tab.directive';
import { createDS, columnFactory } from '@pebula/ngrid';

@Component({
  selector: 'app-table-viewer',
  templateUrl: './table-viewer.component.html',
  styleUrls: ['./table-viewer.component.scss']
})
export class TableViewerComponent implements OnInit {

  private readonly ENTRY_DELIMITER: string = "\n";
  private readonly VALUE_DELIMITER: string = ";";

  decodedData: BehaviorSubject<string[]> = new BehaviorSubject<any>([]);
  columns = columnFactory()
    .default({minWidth: 100, sort: true })
    .table({})


  constructor(private fileTabDirective: FileTabDirective) { }

  ngOnInit(): void {
    this.fileTabDirective.dataChanges
      .pipe( 
        map( (data: {content: any}) => new TextDecoder().decode(data.content))
      ).subscribe( (res: string) => {
        const input = res.split(this.ENTRY_DELIMITER);
        const header = input.shift()?.split(this.VALUE_DELIMITER);
        const data = from(input).pipe(
          filter( entry => !!entry.length),
          concatMap( entry => of(Object.assign({}, ...header!.map( (v,i) => {return {[v]: entry.split(this.VALUE_DELIMITER)[i]}}))))
        ).subscribe(res => console.log(res));     

      })
  }

  private parseCsvData(plain: string, ): void {}

}
