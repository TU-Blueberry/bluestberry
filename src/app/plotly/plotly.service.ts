import { Injectable } from '@angular/core';
import { PythonCallable } from '../python-callable/python-callable.decorator'
import { TabManagementService } from 'src/app/tab/tab-management.service';

@Injectable({
  providedIn: 'root'
})
export class PlotlyService {

  constructor(private tabManagementService: TabManagementService) { }

  @PythonCallable
  public sendPlotlyHtml(htmlString: string) {
    const encodedHtmlString = new TextEncoder().encode(htmlString)
    this.tabManagementService.openPlotly(encodedHtmlString)
  }
}
