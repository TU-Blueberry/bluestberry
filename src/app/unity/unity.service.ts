import { Injectable } from '@angular/core'
import { Observable, of, throwError, zip } from 'rxjs'
import { map, switchMap, take } from 'rxjs/operators'
import { resourceLimits } from 'worker_threads'
import { Config } from '../experience/model/config'
import { FilesystemService } from '../filesystem/filesystem.service'
import { PythonCallable } from '../python-callable/python-callable.decorator'
import { ConfigService } from '../shared/config/config.service'
import { UnityBerryDTO } from '../shared/unity/unity.berry.dto'

interface UnityFiles {
  dataUrl: string
  wasmCodeUrl: string
  wasmFrameworkUrl: string
}

@Injectable({
  providedIn: 'root',
})
export class UnityService {
  constructor(
    private fsService: FilesystemService,
    private conf: ConfigService
  ) {}
  gameInstance: any
  progress = 0
  isReady = false

  initUnity(): Observable<any> {
    return this.conf.getConfigOfCurrentExperience().pipe(
      switchMap((conf) => {
        return !conf.unityEntryPoint
          ? throwError('Config contains no unity entry point')
          : this.fsService
              .getFileAsBinary(`/${conf.uuid}/${conf.unityEntryPoint}`)
              .pipe(
                take(1),
                switchMap((file) => {
                  const unityJson = JSON.parse(new TextDecoder().decode(file))
                  const blob = new Blob([file.buffer])
                  const uri = URL.createObjectURL(blob)

                  const unityInfo: UnityFiles = {
                    dataUrl: this.toFullPath(conf, unityJson.dataUrl),
                    wasmCodeUrl: this.toFullPath(conf, unityJson.wasmCodeUrl),
                    wasmFrameworkUrl: this.toFullPath(
                      conf,
                      unityJson.wasmFrameworkUrl
                    ),
                  }

                  // convert all other necessary files to object uris
                  return this.getUnityFilesAsObjectUris(unityInfo).pipe(
                    switchMap((uris) => {
                      const uriMap = {
                        [unityJson.dataUrl]: uris[0],
                        [unityJson.wasmCodeUrl]: uris[1],
                        [unityJson.wasmFrameworkUrl]: uris[2],
                      }

                      const loader = (window as any).UnityLoader
                      this.gameInstance = loader.instantiate(
                        'gameContainer',
                        uri,
                        uriMap,
                        {
                          onProgress: (gameInstance: any, progress: number) => {
                            this.progress = progress
                            if (progress === 1) {
                              this.isReady = true
                              this.disableWebGLInput()
                            }
                          },
                        }
                      )

                      return of(this.gameInstance)
                    })
                  )
                })
              )
      })
    )
  }

  private getUnityFilesAsObjectUris(info: UnityFiles): Observable<string[]> {
    return zip(
      this.fsService.getFileAsBinary(info.dataUrl),
      this.fsService.getFileAsBinary(info.wasmCodeUrl),
      this.fsService.getFileAsBinary(info.wasmFrameworkUrl)
    ).pipe(
      map((files) => {
        return files.map((file) => this.uint8ToBlob(file))
      })
    )
  }

  // we start with the json file which is located at /<uuid>/<unityEntryPoint>
  // unityEntryPoint looks sth like 'unity/berrysort/Build/berrysort.json
  // all the other necessary files (wasm etc) are in the same folder
  // thus remove berrysort.json from the path to get the folder; add everything else to it
  private toFullPath(conf: Config, value: string) {
    return `/${conf.uuid}/${conf.unityEntryPoint
      ?.split('/')
      .slice(0, -1)
      .join('/')}/${value}`
  }

  private uint8ToBlob(file: Uint8Array): string {
    const blob = new Blob([file.buffer])
    const uri = URL.createObjectURL(blob)

    return uri
  }

  updateUnity(update: number) {}

  /**
   * Send a message to the currently active Unity Instance.
   * @param gameObject The Game Object in the Scene hierarchy where the script is on.
   * @param method  The Method that is included in one of the scripts on the GameObject
   * @param parameters The Parameters to send alongside the method call.
   */
  sendMessageWithParam(gameObject: string, method: string, parameters: string) {
    this.gameInstance.SendMessage(gameObject, method, parameters)
  }
  sendMessage(gameObject: string, method: string) {
    this.gameInstance.SendMessage(gameObject, method)
  }

  cleanUpUnity(): void {
    this.gameInstance.Quit()
  }

  @PythonCallable
  public toggleRobot() {
    this.sendMessage('AngularCommunicator', 'ToggleRobot')
  }

  @PythonCallable
  public sendTraits(berries: string) {
    this.sendMessageWithParam('AngularCommunicator', 'receiveTraits', berries)
  }

  @PythonCallable
  public changeFPS(fps: string) {
    this.sendMessageWithParam(
      'AngularCommunicator',
      'changeRefreshAngular',
      fps
    )
  }

  /**
   * Toggle if Unity should capture mouse and keyboards.
   */
  @PythonCallable
  public disableWebGLInput() {
    this.gameInstance.SendMessage('AngularCommunicator', 'disableWebGLInput')
  }

  @PythonCallable
  public enableWebGLInput() {
    this.gameInstance.SendMessage('AngularCommunicator', 'enableWebGLInput')
  }

  // Basic calls to stop or start the current scene
  @PythonCallable
  public stop() {
    this.gameInstance.SendMessage('AngularCommunicator', 'start')
  }

  @PythonCallable
  public start() {
    this.gameInstance.SendMessage('AngularCommunicator', 'stop')
  }
}
