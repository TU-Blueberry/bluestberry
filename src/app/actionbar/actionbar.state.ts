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

export interface ActionbarModel {
    [itemId: string]: {
        active: boolean;
        data?: any;
    }
}

@State<ActionbarModel>({
    name: 'actionbar',
    defaults: {
        'filetree': { active: true },
        'terminal': { active: false },
        'hints': { active: false },
        'tour': { active: false },
        'about': { active: false },
        'simulation': { active: false },
        'import': { active: false }
    }
})

@Injectable()
export class ActionbarState {
    constructor(private tabManagement: TabManagementService, private tourService: GuidedTourService, private conf: ConfigService, private fs: FilesystemService) {}

    @Action(Reset)
    onReset(ctx: StateContext<ActionbarModel>, action: Reset) {
        ctx.setState({  
            'filetree': { active: false },
            'terminal': { active: false },
            'hints': { active: false },
            'tour': { active: false },
            'about': { active: false },
            'simulation': { active: false },
            'import': { active: false }
        });
    }

    @Action(FromConfig)
    onFromConfig(ctx: StateContext<ActionbarModel>, action: FromConfig) {
        ctx.setState({
            'filetree': { active: action.splitSettings['filetree'].visible },
            'terminal': { active: action.splitSettings['terminal'].visible },
            'hints': { active: this.checkIfHintsAreOpen(action.openTabs) },
            'tour': { active: false },
            'about': { active: false },
            'simulation': { active: false },
            'import': { active: false }
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
    
    private updateActionbarStore(ctx: StateContext<ActionbarModel>, item: string, active: boolean, data?: any) {
        const state = ctx.getState();
        ctx.setState({
            ...state,
            [item]: { active: active, data: data }
        });
    }

    private checkIfHintsAreOpen(tabs: { path: string, on: string, active: boolean }[]): boolean {
        return tabs.findIndex(tab => tab.path === 'HINT' && tab.active) > -1;
    }
}
