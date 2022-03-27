import { Injectable } from '@angular/core'
import { Observable, of, throwError, zip } from 'rxjs'
import { map, switchMap, take } from 'rxjs/operators'
import { Config } from '../../experience/model/config'
import { FilesystemService } from '../../filesystem/filesystem.service'
import { PythonCallable } from '../../python-callable/python-callable.decorator'
import { ConfigService } from '../../shared/config/config.service'
import { UnityBerryDTO } from '../../shared/unity/unity.berry.dto'
import { UnityService } from '../unity.service'

interface UnityFiles {
  dataUrl: string
  wasmCodeUrl: string
  wasmFrameworkUrl: string
}

@Injectable({
  providedIn: 'root',
})
export class BerrySort {
  unityService: UnityService
  constructor(unityService: UnityService) {
    this.unityService = unityService
  }

  @PythonCallable
  public toggleRobot() {
    this.unityService.sendMessage('AngularCommunicator', 'ToggleRobot')
  }

  @PythonCallable
  public sendClassification(berries: string) {
    this.unityService.sendMessageWithParam(
      'AngularCommunicator',
      'receiveClassification',
      berries
    )
  }

  @PythonCallable
  public sendTraits(berries: string) {
    this.unityService.sendMessageWithParam(
      'AngularCommunicator',
      'receiveTraits',
      berries
    )
  }

  @PythonCallable
  public stop() {
    this.unityService.sendMessage('AngularCommunicator', 'start')
  }

  @PythonCallable
  public start() {
    this.unityService.sendMessage('AngularCommunicator', 'stop')
  }

  @PythonCallable
  public toggleWebGLInput() {
    this.unityService.sendMessage('AngularCommunicator', 'toggleWebGLInput')
  }

  @PythonCallable
  public disableWebGLInput() {
    this.unityService.sendMessage('AngularCommunicator', 'disableWebGLInput')
  }

  @PythonCallable
  public sendManualBerries(berries: UnityBerryDTO[]) {
    for (var berry of berries) {
      this.sendManualBerry(
        `${berry.trait},${berry.classification},${berry.imagePath}`
      )
    }
  }

  // Send a Berry delimited by commata: trait,classification,imagePath
  @PythonCallable
  public async sendManualBerry(berry: string) {
    var berryParts: string[] = berry.split(',')
    var imagePath = berryParts[2]
    var berryImage = await this.unityService.provideImage(imagePath)
    this.unityService.sendMessageWithParam(
      'AngularCommunicator',
      'queueBerryWithImage',
      berry + ',' + berryImage.split(',')[1]
    )
  }

  // And then send an Image. As soon as the Image has been created and Rendered the berry will be produced.
  // But not before.
  @PythonCallable
  public sendImage(image: string) {
    this.unityService.sendMessageWithParam(
      'AngularCommunicator',
      'acceptImage',
      image
    )
  }

  @PythonCallable
  public reset() {
    this.unityService.sendMessage('AngularCommunicator', 'reset')
  }
}
