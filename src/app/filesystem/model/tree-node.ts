
import { ComponentRef } from "@angular/core";
import { forkJoin, Subscription } from "rxjs";
import { filter, map, switchMap, tap } from "rxjs/operators";
import { UiEventsService } from "../../ui-events.service";
import { FilesystemEventService } from "../events/filesystem-event.service";
import { FileComponent } from "../file/file.component";
import { FilesystemService } from "../filesystem.service";

export class TreeNode {
    private _ref?: FSNode;
    private _activeElementChangeSubscription: Subscription;

    private _isEmptyNode = false;
    private _isActive = false;
    private _path = '';
    private _depth = 0;
    private _parentPath = '';
    private _isRoot = false;
    private _rootName = '';
    private _tempName = '';

    constructor(private uiEv: UiEventsService, private fs: FilesystemService, private ev: FilesystemEventService) {
        this._activeElementChangeSubscription = this.uiEv.onActiveElementChange
            .subscribe(newActiveElementPath => this.isActive = this.path === newActiveElementPath);
    }

    // ----- Methods provided by this class -----
    public getSubfolders() {
        return this.getNodes().pipe(map(([folders, _]) => folders.map(folder => ({ path: `${this.path}/${folder.name}`, node: folder }))))
    }
    
    public getNodes() {
        return this.fs.scan(this._path, this._depth, true)
            .pipe(tap(([files, folders]) => this._isEmptyNode = folders.length === 0 && files.length === 0));
    }

    public checkPermissions() {
        this.fs.checkPermissions(this._path, false);
    }

    private isDirectChild(pathToCheck: string): boolean {
       const splitPath = pathToCheck.split("/");
    
        if (splitPath.length > 1) {
          splitPath.splice(splitPath.length - 1, 1);
          return splitPath.join("/") === this._path;
        } else {
          return pathToCheck === this._path;
        } 
    }

    public updateEmptyStatus() {
        const entries = this._ref?.contents;

        
        if (this._path !== '' && entries !== undefined && entries !== null && !(entries instanceof Uint8Array)) {
             this.fs.scanWithoutFetch(entries, this._path, this._depth, true).subscribe(([folders, files]) => {
                this._isEmptyNode = folders.length === 0 && files.length === 0;
            }); 
        }

        if (!entries) {
            this._isEmptyNode = true;
        }
    }

    public generateTreeNode(depth: number, fullPath?: string, node?: FSNode, rootName?: string, ): TreeNode  {
        const treeNode = new TreeNode(this.uiEv, this.fs, this.ev);
        treeNode.depth = depth ;
        treeNode.parentPath = this._path;
   
        if (node && fullPath) {
            treeNode.ref = node;
            treeNode.path = fullPath;
        }
        
        if (rootName) {
            treeNode.rootName = rootName;
            treeNode.isRoot = true;
        }
        
        treeNode.updateEmptyStatus();

        return treeNode;
    }

    public getChildrenAsTreeNodes() {
       return this.getNodes().pipe(map(([folders, files]) => 
            [...folders.map(node => this.generateTreeNode(this._depth + 1,`${this._path}/${node.name}`, node)), 
            ...files.map(node => this.generateTreeNode(this._depth + 1,`${this._path}/${node.name}`, node))]));
    }

    public destroy() {
        this._activeElementChangeSubscription.unsubscribe();
    }

    // ----- Observables for events -----
    public onDelete() {
        return this.ev.onDeletePath.pipe(filter(path => this.isDirectChild(path)), tap(() => this.updateEmptyStatus()));
    }

    public addNewFilesListener(fileMap: Map<string, Array<ComponentRef<FileComponent>>>) {
       return this.ev.onWriteToFile.pipe(
           filter(params => this.isDirectChild(params.path) && !fileMap.has(params.path)), 
           tap(params => this.updateEmptyStatus()),
           switchMap(params => this.fs.getNodeByPath(params.path).pipe(
                filter(node => node !== undefined),
                map(node => ({node: node, path: params.path})))
            ))
    }

    public addAfterCodeExecutionListener() {
        return this.ev.afterCodeExecution;
    }

    public pathMoveOldPath() {
        return this.ev.onMovePath.pipe(filter(params => this.isDirectChild(params.oldPath), tap(() => this.updateEmptyStatus)));
    }

    public pathMoveNewPath() {
        return this.ev.onMovePath.pipe(
            filter(params => this.isDirectChild(params.newPath)),
            switchMap(params => forkJoin([this.fs.getNodeByPath(params.newPath), this.fs.isFile(params.newPath)]).pipe(
                filter(([node, isFile]) => node !== undefined),
                map(([node, isFile]) => ({ node: node, isFile: isFile, newPath: params.newPath}),
                tap(() => this.updateEmptyStatus()))
            )),
        );
    }

    public onNewUserInputLocation() {
        return this.uiEv.onNewUserInputLocation.pipe(filter(path => !this.isDirectChild(path) && path !== this._path));
    }

    public failedChild() {
        return this.ev.onFailedCreationFromUi.pipe(filter(params => this.isDirectChild(params.path)));
    }

    public onNewNodeByUser() {
        return this.ev.onNewNodeByUser.pipe(filter(params => this.isDirectChild(params.path)), tap(() => this.updateEmptyStatus()))
    }

    public onNewNodeByUserSynced() {
        return this.ev.onNewNodeByUserSynced.pipe(filter(params => this.isDirectChild(params.path)));
    }

    // ----- Getters and setters -----
    public set isActive(isActive: boolean) {
        this._isActive = isActive;
    }
    
    public get isActive() : boolean {
        return this._isActive;
    }

    public set path(path : string) {
        this._path = path;
        this.fs.getNodeByPath(this._path).subscribe(ref => this._ref = ref);
    }

    public get path(): string {
        return this._path;
    }

    public get isEmptyNode() {
        return this._isEmptyNode;
    }

    public get isTentativeNode() {
        return this._ref === undefined || this._ref === null;
    }

    public set depth(depth: number) {
        this._depth = depth;
    }

    public get depth() {
        return this._depth;
    }

    public set ref(ref: FSNode | undefined) {
        this._ref = ref;
        this.updateEmptyStatus();
    }

    public get ref() {
        return this._ref;
    }

    public get name() {
        if (this._isRoot) {
            return this._rootName;
        } else {
            if (this.ref) {
                return this.ref.name;
            } else {
                return this._tempName;
            }
        }
    }

    public set name(name: string) {
        if (this._ref) {
            this._ref.name = name;
        } else {
            this._tempName = name;
        }
    }

    public set parentPath(path: string) {
        this._parentPath = path;
    }

    public get parentPath() {
        return this._parentPath;
    }

    public set isRoot(isRoot: boolean) {
        this._isRoot = isRoot;
    }

    public get isRoot() {
        return this._isRoot;
    }

    public set rootName(rootName: string) {
        if (rootName.trim().length > 0) {
            this._rootName = rootName;
            this.isRoot = true;
        }
    }

    public get rootName() {
        return this._rootName;
    }
}