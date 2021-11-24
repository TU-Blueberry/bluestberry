import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {TabGroupComponent} from 'src/app/tab/tab-group/tab-group.component';
import {TabTemplateDirective} from 'src/app/tab/tab-template.directive';
import {NgIconsModule} from '@ng-icons/core';



@NgModule({
  declarations: [
    TabGroupComponent,
    TabTemplateDirective
  ],
  exports: [
    TabGroupComponent,
    TabTemplateDirective,
  ],
  imports: [
    CommonModule,
    NgIconsModule
  ]
})
export class TabModule { }
