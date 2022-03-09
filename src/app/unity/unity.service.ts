import { Injectable } from '@angular/core'
import { Observable, of, throwError, zip } from 'rxjs'
import { map, switchMap, take } from 'rxjs/operators'
import { Config } from '../experience/model/config'
import { FilesystemService } from '../filesystem/filesystem.service'
import { PythonCallable } from '../python-callable/python-callable.decorator'
import { ConfigService } from '../shared/config/config.service'
import { UnityBerryDTO } from '../shared/unity/unity.berry.dto'

interface UnityFiles {
  dataUrl: string, 
  wasmCodeUrl: string, 
  wasmFrameworkUrl: string
}

@Injectable({
  providedIn: 'root',
})

export class UnityService {
  constructor(private fsService: FilesystemService, private conf: ConfigService) {}
  gameInstance: any
  progress = 0
  isReady = false

  initUnity(): Observable<any> {
    return this.conf.getConfigOfCurrentExperience().pipe(
      switchMap(conf => {
        return !conf.unityEntryPoint 
          ? throwError("Config contains no unity entry point")
          : this.fsService.getFileAsBinary(`/${conf.uuid}/${conf.unityEntryPoint}`).pipe(
              take(1),
              switchMap(file => {
                const unityJson = JSON.parse(new TextDecoder().decode(file));
                const blob = new Blob([file.buffer]);
                const uri = URL.createObjectURL(blob);
        
                const unityInfo: UnityFiles = {    
                  "dataUrl": this.toFullPath(conf, unityJson.dataUrl),
                  "wasmCodeUrl": this.toFullPath(conf, unityJson.wasmCodeUrl),
                  "wasmFrameworkUrl": this.toFullPath(conf, unityJson.wasmFrameworkUrl),
                }

                // convert all other necessary files to object uris
                return this.getUnityFilesAsObjectUris(unityInfo).pipe(
                  switchMap(uris => {
                    const uriMap = {
                      [unityJson.dataUrl]: uris[0],
                      [unityJson.wasmCodeUrl]: uris[1],
                      [unityJson.wasmFrameworkUrl]: uris[2]
                    }

                    const loader = (window as any).UnityLoader
                    this.gameInstance = loader.instantiate('gameContainer', uri, uriMap, {
                      onProgress: (gameInstance: any, progress: number) => {
                        this.progress = progress
                        if (progress === 1) {
                          this.isReady = true
                          this.disableWebGLInput()
                          // this.initialPresentation()
                        }
                      },
                    });
                    
                    return of(this.gameInstance)
                  })
                )
              })
        )})
      )
  }

  private getUnityFilesAsObjectUris(info: UnityFiles): Observable<string[]> {
    return zip(
      this.fsService.getFileAsBinary(info.dataUrl),
      this.fsService.getFileAsBinary(info.wasmCodeUrl),
      this.fsService.getFileAsBinary(info.wasmFrameworkUrl)
    ).pipe(
      map(files => {
        return files.map(file => this.uint8ToBlob(file))
      })
    )
  }

  // we start with the json file which is located at /<uuid>/<unityEntryPoint>
  // unityEntryPoint looks sth like 'unity/berrysort/Build/berrysort.json
  // all the other necessary files (wasm etc) are in the same folder
  // thus remove berrysort.json from the path to get the folder; add everything else to it
  private toFullPath(conf: Config, value: string) {
    return `/${conf.uuid}/${conf.unityEntryPoint?.split('/').slice(0, -1).join('/')}/${value}` 
  }

  private uint8ToBlob(file: Uint8Array): string {
    const blob = new Blob([file.buffer]);
    const uri = URL.createObjectURL(blob);

    return uri;
  }

  updateUnity(update: number) {}

  cleanUpUnity(): void {
    this.gameInstance.Quit()
  }

  @PythonCallable
  public toggleRobot() {
    this.gameInstance.SendMessage('AngularCommunicator', 'ToggleRobot')
  }

  @PythonCallable
  public sendClassification(berries: string) {
    console.log('Sending Classification to Unity')
    //console.log(berries)
    this.gameInstance.SendMessage(
      'AngularCommunicator',
      'receiveClassification',
      berries
    )
  }

  @PythonCallable
  public sendTraits(berries: string) {
    this.gameInstance.SendMessage(
      'AngularCommunicator',
      'receiveTraits',
      berries
    )
  }

  @PythonCallable
  public changeFPS(fps: string) {
    this.gameInstance.SendMessage(
      'AngularCommunicator',
      'changeRefreshAngular',
      fps
    )
  }

  @PythonCallable
  public stop() {
    this.gameInstance.SendMessage('AngularCommunicator', 'start')
  }

  @PythonCallable
  public start() {
    this.gameInstance.SendMessage('AngularCommunicator', 'stop')
  }

  @PythonCallable
  public toggleWebGLInput() {
    this.gameInstance.SendMessage('AngularCommunicator', 'toggleWebGLInput')
  }

  @PythonCallable
  public disableWebGLInput() {
    this.gameInstance.SendMessage('AngularCommunicator', 'disableWebGLInput')
  }

  @PythonCallable
  public sendManualBerries(berries: UnityBerryDTO[]) {
    for (var berry of berries) {
      this.sendManualBerry(
        `${berry.trait},${berry.classification},${berry.imagePath}`
      )
    }
  }

  // --- Manual Mode here ---
  @PythonCallable
  public enableManual() {
    this.gameInstance.SendMessage('AngularCommunicator', 'enableManual')
  }

  @PythonCallable
  public disableManual() {
    this.gameInstance.SendMessage('AngularCommunicator', 'disableManual')
  }

  // Send a Berry delimited by commata: trait,classification,imagePath
  @PythonCallable
  public sendManualBerry(berry: string) {
    var berryParts: string[] = berry.split(',')
    var imagePath = berryParts[2]
    var berryImage = this.fsService.getFileAsBinary(imagePath)
    //console.log(imagePath)

    // TODO: This is bad practice but I can't help it right now.
    if (!berryImage) {
      return
    }

    berryImage.subscribe((result) => {
      //console.log(berryImage)
      if (result instanceof Uint8Array) {
        var blob = new Blob([result], { type: 'image/png' })

        var reader = new FileReader()
        reader.readAsDataURL(blob)
        reader.onloadend = () => {
          var base64data = reader.result
          if (base64data) {
            this.gameInstance.SendMessage(
              'AngularCommunicator',
              'queueBerryWithImage',
              berry + ',' + base64data.toString().split(',')[1]
            )
          }
        }
      }
    })
  }

  // And then send an Image. As soon as the Image has been created and Rendered the berry will be produced.
  // But not before.
  @PythonCallable
  public sendImage(image: string) {
    this.gameInstance.SendMessage('AngularCommunicator', 'acceptImage', image)
  }

  @PythonCallable
  public reset() {
    this.gameInstance.SendMessage('AngularCommunicator', 'reset')
  }

  @PythonCallable
  public initialPresentation() {
    this.gameInstance.SendMessage('AngularCommunicator', 'queueBerry')

    var berries: UnityBerryDTO[] = []

    for (var i = 0; i < 10; i++) {
      berries.push(new UnityBerryDTO('1', '1', '0', '0'))
      berries.push(new UnityBerryDTO('1', '1', '0', '0'))
      berries.push(new UnityBerryDTO('0', '0', '0', '0'))
      berries.push(new UnityBerryDTO('1', '1', '0', '0'))
      berries.push(new UnityBerryDTO('1', '1', '0', '0'))
      berries.push(new UnityBerryDTO('1', '0', '0', '0'))
      berries.push(new UnityBerryDTO('1', '0', '0', '0'))
      berries.push(new UnityBerryDTO('0', '1', '0', '0'))
      berries.push(new UnityBerryDTO('1', '0', '0', '0'))
      berries.push(new UnityBerryDTO('1', '0', '0', '0'))
    }

    /*  for (var i = 0; i < 10; i++) {
      berries.push(new UnityBerryDTO('1', '1', '0', '0'))
      berries.push(new UnityBerryDTO('1', '1', '0', '0'))
      berries.push(new UnityBerryDTO('0', '0', '0', '0'))
      berries.push(new UnityBerryDTO('1', '1', '0', '0'))
      berries.push(new UnityBerryDTO('1', '1', '0', '0'))
      berries.push(new UnityBerryDTO('1', '1', '0', '0'))
      berries.push(new UnityBerryDTO('1', '1', '0', '0'))
      berries.push(new UnityBerryDTO('0', '0', '0', '0'))
      berries.push(new UnityBerryDTO('1', '1', '0', '0'))
      berries.push(new UnityBerryDTO('1', '1', '0', '0'))
    } */

    var good: number = 0
    var bad: number = 0

    var baseGood = '/BlueberryData/TestData/good_'
    var baseBad = '/BlueberryData/TestData/bad_'
    var ending = '.JPG'

    for (var berry of berries) {
      var berrystring = `${berry.classification}, ${berry.trait},`

      // console.log(berry.trait)

      berrystring =
        berry.trait == '1'
          ? berrystring + baseGood + good + ending
          : berrystring + baseBad + bad + ending

      if (berry.trait == '1') good = good + 1
      if (berry.trait == '0') bad = bad + 1

      this.sendManualBerry(berrystring)
    }
  }
}
