import { Injectable } from '@angular/core';
import { State, Action, StateContext } from '@ngxs/store';
import { ViewSizeDefaults } from './model/view-defaults';
import { ResizeMain } from './actions/resize-main.action';
import { OpenCloseTab } from './actions/open-close-tab.action';
import { SplitAreaSettings } from './model/split-settings';
import { SplitSettings } from './model/split-sizes';
import { Filetree } from 'src/app/actionbar/actions/filetree.action';
import { ResizeTerminal } from './actions/resize-terminal.action';
import { Terminal } from './actions/terminal.actions';
import { FromConfig } from './actions/from-config.action';
import { Reset } from '../shared/actions/reset.action';

const defaultSettings = {
    'filetree': { group: 0, order: 0, size: 20, visible: true, minSize: ViewSizeDefaults.minSizeFiletree, maxSize: ViewSizeDefaults.maxSizeFiletree },
    'left': { group: 0, order: 1, size: 0, visible: false, minSize: ViewSizeDefaults.minSizeTab, maxSize: ViewSizeDefaults.maxSizeTab },
    'right': { group: 0, order: 2, size: 0, visible: false, minSize: ViewSizeDefaults.minSizeTab, maxSize: ViewSizeDefaults.maxSizeTab },
    'emptyMessage': { group: 0, order: 3, size: 100, visible: true, minSize: 0, maxSize: 100 },
    'code': { group: 1, order: 0, size: 100, visible: true, minSize: ViewSizeDefaults.minSizeTop, maxSize: ViewSizeDefaults.maxSizeTop },
    'terminal': { group: 1, order: 1, size: 20, visible: false, minSize: ViewSizeDefaults.minSizeTerminal, maxSize: ViewSizeDefaults.maxSizeTerminal }
}

// group 0 = main view (split vertically)
// group 1 = left tab group (split horizontally)
// this is currently hardcoded in every action call (includes indirect calls, see TabState)
// if one were to support different layouts (e.g. right side could be split horizontally as well) this would have to be changed
// (left tab = code + terminal is currently also hardcoded into main-viewer.component.html)
@State<SplitSettings>({
    name: 'viewSettings',
    defaults: defaultSettings
})

@Injectable()
export class ViewSizeState {
    @Action(Reset)
    onReset(ctx: StateContext<SplitSettings>, action: Reset) {
        ctx.setState(defaultSettings);
    }

    @Action(ResizeMain)
    onResizeMain(ctx: StateContext<SplitSettings>, action: ResizeMain) {
        const state = ctx.getState();
        const clone = this.deepClone(state);
        
        Object.entries(clone).filter(([_, options]) => options.visible && options.group === action.groupId)
            .forEach(([_, settings], index) => settings.size = action.updatedSizes[index])

        ctx.setState(clone);
    }

    @Action(FromConfig)
    onFromConfig(ctx: StateContext<SplitSettings>, action: FromConfig) {
        ctx.setState(action.splitSettings)
    }
 
    @Action(OpenCloseTab)
    onOpenClose(ctx: StateContext<SplitSettings>, action: OpenCloseTab) {      
        const state = ctx.getState();
        const clone = this.deepClone(state);
        const changes = action.changes;
        const group = clone[changes.group];

        group.visible = changes.visible;
        clone.emptyMessage.visible = this.isEmpty(clone, action.group);
        clone.emptyMessage.size = 0;

        if (!changes.visible) {
            group.size = 0;
        }  

        const redistributed = this.redistribute(clone, true, action.group);
        ctx.setState(redistributed);
    }

    @Action(ResizeTerminal)
    onResizeTerminal(ctx: StateContext<SplitSettings>, action: ResizeTerminal) {
        const state = ctx.getState();
        const clone = this.deepClone(state);

        Object.entries(clone).filter(([_, settings]) => settings.group === action.group)
            .forEach(([_, settings], index) => settings.size = action.updatedSizes[index])
        ctx.setState(clone);
    }

    @Action(Filetree.Open)
    onFiletreeOpen(ctx: StateContext<SplitSettings>, action: Filetree.Open) {
        const state = ctx.getState();

        // prevent second call if tour is started as this would cause another redistribution
        if (!state.filetree.visible) {
            this.setFiletreeState(ctx, true, action.group);
        }
    }

    @Action(Filetree.Close)
    onFiletreeClose(ctx: StateContext<SplitSettings>, action: Filetree.Close) {
        this.setFiletreeState(ctx, false, action.group);
    }

    @Action(Terminal.Open)
    onTerminalOpen(ctx: StateContext<SplitSettings>, action: Terminal.Open) {
        this.setTerminalState(ctx, true);
    }

    @Action(Terminal.Close)
    onTerminalClose(ctx: StateContext<SplitSettings>, action: Terminal.Close) {
        this.setTerminalState(ctx, false);
    }

    private setTerminalState(ctx: StateContext<SplitSettings>, visible: boolean) {
        const state = ctx.getState();
        const clone = this.deepClone(state);

        clone.terminal.visible = visible;
        clone.code.size = clone.terminal.visible ? (100 - clone.terminal.size) : 100;
        ctx.setState(clone);
    }

    private setFiletreeState(ctx: StateContext<SplitSettings>, visible: boolean, group: number) {
        const state = ctx.getState();
        const clone = this.deepClone(state);

        clone.emptyMessage.visible = this.isEmpty(clone, group);
        clone.emptyMessage.size = 0;
        clone.filetree.visible = visible;

        // need group for redistribution
        const redistributed = this.redistribute(clone, false, group);
        ctx.setState(redistributed);
    }

    private redistribute(state: SplitSettings, isTabChange: boolean, groupId: number): SplitSettings {
        const filetree = state.filetree;
        const visibleAreas = Object.entries(state)
            .filter(([area, settings]) => area !== 'filetree' && settings.group === groupId)
            .filter(([_, settings]) => settings.visible)
            .sort((a, b) => { return a[1].order - b[1].order })
    
        // since we only have 2 tab groups, opening and closing of tabs is handled by redistributing 
        // the whole space (excluding filetree if visible) equally every time
        // if one were to have >2 tab groups, this would have to be handled differently (e.g. closing
        // the third tab group should cause its size to be redistributed among all remaining tab groups)
        visibleAreas.forEach(([_, settings]) => {
            if (isTabChange) {
                if (!filetree.visible) {
                    settings.size = 100 / visibleAreas.length;
                } else {
                    settings.size = (100 - filetree.size) / visibleAreas.length;
                }
            } else {
                // size of filetree is added to/subtracted from all visible areas equally
                const diff = (filetree.size / visibleAreas.length);
                settings.size = filetree.visible ? settings.size - diff : settings.size + diff;
            }
        })

        return state;
    }

    private isEmpty(entries: {[id: string]: SplitAreaSettings}, groupId: number): boolean {
        return Object.entries(entries).filter(([id, settings]) => id !== 'filetree' && id !== 'emptyMessage' && settings.group === groupId)
            .map(([_, settings]) => settings.visible)
            .reduce((a, b) => !a && !b)
    }

    private deepClone(sizes: SplitSettings): SplitSettings {
        const clone = { ...sizes };
        Object.entries(clone).forEach(([id, sizes]) => clone[id] = { ...sizes });

        return clone;
    }
}