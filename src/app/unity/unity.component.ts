import {
  AfterViewInit,
  Component,
  Input,
  OnChanges,
  OnInit,
} from '@angular/core'
import { UnityScenes } from '../shared/unity/unity.scenes.enum'
import { UnityService } from './unity.service'

@Component({
  selector: 'unity',
  templateUrl: './unity.component.html',
  styleUrls: ['./unity.component.scss'],
})
export class UnityComponent implements OnInit, OnChanges, AfterViewInit {
  gameInstance: any
  progress = 0
  isReady = 0
  isEnabled = false
  @Input() updateMessage = 0

  /**
   * In case we want to update Unity with a binding I have included an example.
   */
  ngOnChanges(): void {
    console.log("bla on changes")
    console.log(this.updateMessage)
    this.unityService.updateUnity(this.updateMessage)
  }

  constructor(private unityService: UnityService) {}
  ngAfterViewInit(): void {}

  // Initialize Unity with our standard Scene.
  ngOnInit(): void {
    console.log("bla on init")
    this.gameInstance = this.unityService.initUnity(UnityScenes.BerrySorter)
  }

  startUnity() {
    console.log("bla start unity")
    this.isEnabled = true
  }

  private updateUnity() {}
}
