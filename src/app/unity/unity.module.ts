import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { PyodideService } from '../pyodide/pyodide.service';

@NgModule({
  declarations: [],
  providers: [PyodideService],
  imports: [CommonModule],
})
export class UnityModule {}
