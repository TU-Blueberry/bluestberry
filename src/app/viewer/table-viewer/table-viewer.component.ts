import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { BehaviorSubject, from, of, ReplaySubject } from 'rxjs';
import { concatAll, concatMap, filter, map, mergeMap, share, skip, take, tap, toArray } from 'rxjs/operators';
import { FileTabDirective } from 'src/app/tab/file-tab.directive';
import { createDS, columnFactory, PblNgridComponent } from '@pebula/ngrid';

@Component({
  selector: 'app-table-viewer',
  templateUrl: './table-viewer.component.html',
  styleUrls: ['./table-viewer.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class TableViewerComponent implements OnInit {

  private readonly ENTRY_DELIMITER: string = "\n";
  private readonly VALUE_DELIMITER: string = ";";

  private header$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]); // name of table columns, no complex definitions yet
  private decodedData$: ReplaySubject<string[]> = new ReplaySubject<any>(1);
  
  pblColumns: any;
  pblDatasource: any;
  currSortLabel: string = "";
  currSortDirection: string = "";

  @ViewChild(PblNgridComponent, { static: true }) pblTable: PblNgridComponent<any> | undefined;

  constructor(private fileTabDirective: FileTabDirective) { }

  ngOnInit(): void {

    this.header$.pipe(skip(1)).subscribe( 
      (headerNames: string[]) => {
        console.log(headerNames);
        this.pblColumns = columnFactory()
          .table( ... headerNames.map( (header) => {return {'prop': header, 'sort': true, 'editable': true, 'reoder': true, 'resize': true}}) )
          .build();
        debugger;
      })
    
    this.pblDatasource = createDS()
      .onTrigger( ev => this.decodedData$ )
      .create();
    this.decodedData$.subscribe( chg => console.log );

    this.fileTabDirective.dataChanges
      .pipe( 
        map( (data: {content: any}) => new TextDecoder().decode(data.content))
      ).subscribe( (res: string) => {
        const input = res.split(this.ENTRY_DELIMITER);
        const header = input.shift()?.split(this.VALUE_DELIMITER);
        this.header$.next(header!);
        const data = from(input).pipe(
          filter( entry => !!entry.length),
          concatMap( entry => of(Object.assign({}, ...header!.map( (v,i) => {return {[v]: entry.split(this.VALUE_DELIMITER)[i]}})))),
          toArray()
        ).subscribe( (res) => {
          this.decodedData$.next(res);
        });     

      })
  }

  sortBy(colName: string): void {
    this.currSortLabel = colName;
    this.toggleSortDirection();
    this.pblDatasource.hostGrid.setSort(this.currSortLabel, this.currSortDirection);
  }

  toggleSortDirection(): void {
    if(this.currSortDirection === "asc") {
      this.currSortDirection = "desc";
    } else {
      this.currSortDirection = "asc";
    }
  }

  test(): void {
    console.log(this.pblDatasource);
    // this.pblDatasource.sortedData
  }


}
