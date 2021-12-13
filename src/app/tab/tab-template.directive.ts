import {Directive, Input, TemplateRef, ViewContainerRef} from '@angular/core';
import {TabType} from 'src/app/tab/model/tab-type.model';

@Directive({
  selector: '[appTabTemplate]'
})
export class TabTemplateDirective {
  @Input('appTabTemplateType')
  type?: TabType;

  constructor(public templateRef: TemplateRef<any>) {
  }
}
