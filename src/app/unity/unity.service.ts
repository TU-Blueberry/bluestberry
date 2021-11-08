import { Injectable } from '@angular/core';
import { PyodideService } from '../pyodide/pyodide.service';
import { PythonCallable } from '../python-callable/python-callable.decorator';

@Injectable({
  providedIn: 'root',
})
export class UnityService {
  constructor(private readonly pyodideService: PyodideService) {}
  gameInstance: any;
  progress = 0;
  isReady = false;

  initUnity(path: string): any {
    const loader = (window as any).UnityLoader;
    this.gameInstance = loader.instantiate('gameContainer', path, {
      onProgress: (gameInstance: any, progress: number) => {
        this.progress = progress;
        if (progress === 1) {
          this.isReady = true;
        }
      },
    });

    return this.gameInstance;
  }
  updateUnity(update: number) {}

  @PythonCallable
  public toggleRobot() {
    this.gameInstance.SendMessage('AngularCommunicator', 'ToggleRobot');
  }

  @PythonCallable
  public produceBerries(berryArray: string) {
    const berries = this.pyodideService.getGlobal('classification').subscribe();
    this.gameInstance.SendMessage(
      'AngularCommunicator',
      'SpawnBerries',
      berryArray
    );
  }

  @PythonCallable
  public sendClassification(berryArray: string) {
    const berries = this.pyodideService.getGlobal('classification').subscribe();
    this.gameInstance.SendMessage(
      'AngularCommunicator',
      'SpawnBerries',
      berries
    );
  }

  @PythonCallable
  public sendClassificationFromPython() {
    const berries = this.pyodideService.getGlobal('classification').subscribe();
    this.gameInstance.SendMessage(
      'AngularCommunicator',
      'SpawnBerries',
      berries
    );
  }
}
