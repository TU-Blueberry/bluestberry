import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { PyodideService } from '../pyodide/pyodide.service'
import { BerrySort } from './experiences/unity.berrysort'
import { UnityComponent } from './unity.component'
import { UnityService } from './unity.service'

@NgModule({
  declarations: [UnityComponent],
  providers: [PyodideService, UnityService, BerrySort],
  exports: [UnityComponent],
  imports: [CommonModule],
})
export class UnityModule {}
