import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {TabGroupComponent} from 'src/app/tab/tab-group/tab-group.component';
import {TabTemplateDirective} from 'src/app/tab/tab-template.directive';
import {NgIconsModule} from '@ng-icons/core';
import {FileTabDirective} from 'src/app/tab/file-tab.directive';

@NgModule({
  declarations: [
    TabGroupComponent,
    TabTemplateDirective,
    FileTabDirective,
  ],
  exports: [
    TabGroupComponent,
    TabTemplateDirective,
    FileTabDirective,
  ],
    imports: [
        CommonModule,
        NgIconsModule,
    ]
})
export class TabModule { }
