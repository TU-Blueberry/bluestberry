import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { BehaviorSubject, from, of, ReplaySubject } from 'rxjs';
import { combineAll, concatAll, concatMap, filter, map, mergeMap, share, skip, switchMap, take, tap, toArray } from 'rxjs/operators';
import { FileTabDirective } from 'src/app/tab/file-tab.directive';
import { createDS, columnFactory, PblNgridComponent } from '@pebula/ngrid';
import { PblNgridRowEvent } from '@pebula/ngrid/target-events';

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
  private decodedData$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
  private originalData$: ReplaySubject<string[]> = new ReplaySubject(1);
  
  pblColumns: any;
  pblDatasource: any;
  currSortLabel: string = "";
  currSortDirection: string = "";

  @ViewChild(PblNgridComponent, { static: true }) pblTable: PblNgridComponent<any> | undefined;

  constructor(private fileTabDirective: FileTabDirective) { }

  ngOnInit(): void {

    this.header$.pipe(skip(1)).subscribe( 
      (headerNames: string[]) => {
        this.pblColumns = columnFactory()
          .table( 
            ... headerNames.map( 
              (header) => {
                return {'prop': header, 'sort': true, 'editable': true, 'reoder': true, 'resize': true}}),
          )
          .build();
      })
    
    this.pblDatasource = createDS()
      .onTrigger( ev => this.decodedData$ )
      .create();
    
    this.decodedData$.subscribe(() => {this.pblDatasource?.refresh();})

    this.pblDatasource.selection.changed.subscribe((selection: any) => {
      // console.log(selection);
      this.syncSelection();
    })

    this.pblDatasource.sortChange.subscribe((chg: any) => {
      // clear selection on sort because there is a bug with ngrid
      this.pblDatasource.selection.clear();
    })

    this.fileTabDirective.dataChanges
      .pipe( 
        map( (data: {content: any}) => new TextDecoder().decode(data.content))
      ).subscribe( (res: string) => {
        const input = res.split(this.ENTRY_DELIMITER);
        const header = input.shift()?.split(this.VALUE_DELIMITER);
        this.header$.next(header!);
        from(input).pipe(
          filter( entry => !!entry.length),
          concatMap( entry => of(Object.assign({}, ...header!.map( (v,i) => {return {[v]: entry.split(this.VALUE_DELIMITER)[i]}})))),
          toArray()
        ).subscribe( (res) => {
          this.decodedData$.next(res);
          this.originalData$.next(res);
        });     
      })

    
  }

  addEntry() {
    const emptyEntry = Object.assign({}, ...this.header$.value.map(h => {return { [h]: "<EMPTY>"}}));
    const currData = this.pblDatasource.sortedData as any[];
    this.decodedData$.next([...currData, emptyEntry]);
  }

  saveChanges() {
    const data = this.pblDatasource.sortedData as any[]
    if(data.length) {
      const keys = this.header$.value;
      const header = [... keys].join(this.VALUE_DELIMITER);
      const entries = data.map( entry => { return ([... keys].map(k => entry[k])).join(this.VALUE_DELIMITER) })

      this.fileTabDirective.saveCurrentFile(new TextEncoder().encode([header, ...entries].join(this.ENTRY_DELIMITER)))
        .subscribe(res => {});
    }
  
  }

  onClickEvents(ev: PblNgridRowEvent<any>) {
    // console.log(this.pblDatasource);
    const rawEntry = this.pblDatasource.sortedData[ev.rowIndex]
    this.pblDatasource.selection.toggle(rawEntry);
    this.syncSelection(); 

  }
  
  syncSelection() {
    const currSelectionJson = this.pblDatasource.selection.selected.map( (obj: any) => JSON.stringify(obj));
    this.pblDatasource.hostGrid.rowsApi.dataRows().map( (row: any) => {
      const rowDataJson = JSON.stringify(this.pblDatasource.sortedData[row.rowIndex]);
      
      if (currSelectionJson.includes(rowDataJson)) {
        row.element.classList.add('row-selected');
      } else {
        row.element.classList.remove('row-selected');
      }
    })
  }

  deleteSelected() {
    const currData = this.decodedData$.value;
    const dataToRemoveAsJson = this.pblDatasource.selection.selected.map( (obj: any) => JSON.stringify(obj));
    // console.log(currData);
    const updatedData = currData.filter( (data: any)=> !dataToRemoveAsJson.includes(JSON.stringify(data)));
    //console.log(updatedData);
    this.decodedData$.next(updatedData);

    this.pblDatasource.selection.clear();
  }

  discardChanges() {
    this.originalData$.subscribe( res => this.decodedData$.next(res));
  }

}
