import { Injectable } from "@angular/core";
import { State, Action, StateContext } from "@ngxs/store";
import { GuidedTourService } from "ngx-guided-tour";
import { TabManagementService } from "../tab/tab-management.service";
import { Terminal } from "../viewer/actions/terminal.actions";
import { Filetree } from "./actions/filetree.action";
import { Hints } from "./actions/hints.action";
import { Tour } from "./actions/tour.action";
import { tour } from "../../assets/guided-tour/guided-tour.data";
import { About } from "./actions/about.action";
import { FromConfig } from "../viewer/actions/from-config.action";
import { Reset } from "../shared/actions/reset.action";
import { ConfigService } from "../shared/config/config.service";
import { FilesystemService } from "../filesystem/filesystem.service";
import { ImportAction } from "./actions/import.action";
import { Simulation } from "./actions/simulation.action";

export interface ActionbarModel {
    [itemId: string]: {
        active: boolean;
        disabled: boolean;
        data?: any;
    }
}

@State<ActionbarModel>({
    name: 'actionbar',
    defaults: {
        'filetree': { active: true, disabled: false },
        'terminal': { active: false, disabled: false },
        'hints': { active: false, disabled: true },
        'tour': { active: false , disabled: true },
        'about': { active: false, disabled: false },
        'simulation': { active: false, disabled: true },
        'import': { active: false, disabled: true }
    }
})

@Injectable()
export class ActionbarState {
    constructor(private tabManagement: TabManagementService, private tourService: GuidedTourService, private conf: ConfigService, private fs: FilesystemService) {}

    @Action(Reset)
    onReset(ctx: StateContext<ActionbarModel>, action: Reset) {
        ctx.setState({  
            'filetree': { active: false, disabled: true },
            'terminal': { active: false, disabled: true },
            'hints': { active: false, disabled: true },
            'tour': { active: false, disabled: true },
            'about': { active: false, disabled: true },
            'simulation': { active: false, disabled: true },
            'import': { active: false, disabled: true }
        });
    }

    @Action(FromConfig)
    onFromConfig(ctx: StateContext<ActionbarModel>, action: FromConfig) {
        // für den rest brauche ich info ob lesson oder sandbox
        ctx.setState({
            'filetree': { active: action.splitSettings['filetree'].visible, disabled: false },
            'terminal': { active: action.splitSettings['terminal'].visible, disabled: false },
            'hints': { active: this.checkIfHintsAreOpen(action.openTabs), disabled: action.type !== 'LESSON' },
            'tour': { active: false, disabled: action.type !== 'LESSON'},
            'about': { active: false, disabled: false },
            'simulation': { active: this.checkIfSimulationIsOpen(action.openTabs), disabled: action.type !== 'LESSON' },
            'import': { active: false, disabled: false }
        });
    }

    @Action(Filetree.Open)
    onFiletreeOpen(ctx: StateContext<ActionbarModel>, action: Filetree.Open) {
       this.updateActionbarStore(ctx, 'filetree', true);
    }  

    @Action(Filetree.Close)
    onFiletreeClose(ctx: StateContext<ActionbarModel>, action: Filetree.Close) {
        this.updateActionbarStore(ctx, 'filetree', false);
    }

    @Action(Terminal.Open)
    onTerminalOpen(ctx: StateContext<ActionbarModel>, action: Terminal.Open) {
        this.updateActionbarStore(ctx, 'terminal', true);
    }

    @Action(Terminal.Close)
    onTerminalClose(ctx: StateContext<ActionbarModel>, action: Terminal.Close) {
        this.updateActionbarStore(ctx, 'terminal', false);
    }

    @Action(Hints.Open)
    onHintsOpen(ctx: StateContext<ActionbarModel>, action: Hints.Open) {
        this.updateActionbarStore(ctx, 'hints', true);
        return this.tabManagement.openHints();         
    }

    @Action(Hints.Inactive)
    onHintsInactive(ctx: StateContext<ActionbarModel>, action: Hints.Inactive) {
        this.updateActionbarStore(ctx, 'hints', false);
    }

    @Action(Hints.Active)
    onHintsActive(ctx: StateContext<ActionbarModel>, action: Hints.Active) {
        this.updateActionbarStore(ctx, 'hints', true);
    }

    @Action(Hints.Close)
    onHintsClose(ctx: StateContext<ActionbarModel>, action: Hints.Close) {
        this.updateActionbarStore(ctx, 'hints', false);
    }

    @Action(Tour.Start)
    onTourStart(ctx: StateContext<ActionbarModel>, action: Tour.Start) {
        this.updateActionbarStore(ctx, 'tour', true);
        ctx.dispatch([new Filetree.Open(0), new Terminal.Open()]);

        tour.completeCallback = () => ctx.dispatch(new Tour.End());
        tour.skipCallback = () => ctx.dispatch(new Tour.End());

        this.tourService.startTour(tour);
    }

    @Action(Tour.End)
    onTourEnd(ctx: StateContext<ActionbarModel>, action: Tour.End) {
        this.updateActionbarStore(ctx, 'tour', false);
    }

    @Action(About.Open)
    onAboutOpen(ctx: StateContext<ActionbarModel>, action: About.Open) {
        this.updateActionbarStore(ctx, 'about', true);
    }

    @Action(About.Close)
    onAboutClose(ctx: StateContext<ActionbarModel>, action: About.Close) {
        this.updateActionbarStore(ctx, 'about', false);
    }

    @Action(ImportAction.OpenImportWindow)
    onImportWindowOpen(ctx: StateContext<ActionbarModel>, action: ImportAction.OpenImportWindow) {
        this.updateActionbarStore(ctx, 'import', true);
    }

    @Action(ImportAction.CloseImportWindow)
    onImportWindowClose(ctx: StateContext<ActionbarModel>, action: ImportAction.CloseImportWindow) {
        this.updateActionbarStore(ctx, 'import', false);
    }

    @Action(Simulation.Open)
    onSimulationOpen(ctx: StateContext<ActionbarModel>, action: Simulation.Open) {
        this.updateActionbarStore(ctx, 'simulation', true);
        return this.tabManagement.openSimulation();    
    }

    @Action(Simulation.Close)
    onSimulationClose(ctx: StateContext<ActionbarModel>, action: Simulation.Close) {
        this.updateActionbarStore(ctx, 'simulation', false);
    }
    
    private updateActionbarStore(ctx: StateContext<ActionbarModel>, item: string, active: boolean, data?: any, disabled = false) {
        const state = ctx.getState();
        ctx.setState({
            ...state,
            [item]: { active: active, data: data, disabled: disabled }
        });
    }

    private checkIfHintsAreOpen(tabs: { path: string, on: string, active: boolean }[]): boolean {
        return tabs.findIndex(tab => tab.path.toUpperCase() === 'HINT' && tab.active) > -1;
    }

    private checkIfSimulationIsOpen(tabs: { path: string, on: string, active: boolean }[]): boolean {
        return tabs.findIndex(tab => tab.path.toUpperCase() === 'UNITY' && tab.active) > -1;
    }
 }
