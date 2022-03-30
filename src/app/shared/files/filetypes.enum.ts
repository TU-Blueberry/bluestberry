import { TabType } from "src/app/tab/model/tab-type.model";

export enum FileType {
    IMAGE,
    PROGRAMMING_LANGUAGE,
    MARKDOWN,
    TEX,
    JSON, 
    PLAIN_TEXT,
    TABULAR, 
    OTHER
}

export interface Icons {
    [icon_name: string]: {
        path: string,
        href: string, 
        title: string,
        text: string
    }
}

export class FileTypes {
    // for "about" tab
    static icons: Icons = {
        'dictionary': { path: 'assets/icons/dictionary.png', href: 'https://www.flaticon.com/free-icons/dictionary', title: 'dictionary icons', text: 'Dictionary icons created by Freepik - Flaticon' },
        'experiment': { path: 'assets/icons/experiment.png', href: 'https://www.flaticon.com/free-icons/lab', title: 'lab icons', text: 'Lab icons created by Prosymbols - Flaticon' },
        'robot': { path: 'assets/icons/industrial-robot.png', href: 'https://www.flaticon.com/free-icons/robot-arm', title: 'robot arm icons', text: 'Robot arm icons created by Freepik - Flaticon' },
        'lightbulb': { path: 'assets/icons/lightbulb.png', href: 'https://www.flaticon.com/free-icons/idea', title: 'idea icons', text: 'Idea icons created by Good Ware - Flaticon' },
        'picture': { path: 'assets/icons/picture.png', href: 'https://www.flaticon.com/free-icons/photo', title: 'photo icons', text: 'Photo icons created by Good Ware - Flaticon' },
        'plaintext': { path: 'assets/icons/plaintext.png', href: 'https://www.flaticon.com/free-icons/notepad', title: 'notepad icons', text: 'Notepad icons created by Freepik - Flaticon' },
        'table': { path: 'assets/icons/table.png', href: 'https://www.flaticon.com/free-icons/table', title: 'table icons', text: 'Table icons created by Flat Icons - Flaticon' },
        'unknown_file': { path: 'assets/icons/unknown_file.png', href: 'https://www.flaticon.com/free-icons/unknown', title: 'unknown icons', text: 'Unknown icons created by berkahicon - Flaticon' },
        'mortarboard': { path: 'assets/icons/mortarboard.png', href: 'https://www.flaticon.com/free-icons/blended-learning', title: 'blended learning icons', text: 'Blended learning icons created by Freepik - Flaticon' },
        'line_chart': { path: 'assets/icons/line-chart.png', href: 'https://www.flaticon.com/free-icons/chart', title: 'chart icons', text: 'Chart icons created by Freepik - Flaticon' },
    }
    

    private static extToType = new Map([
        ["MD", FileType.MARKDOWN],
        ["JS", FileType.PROGRAMMING_LANGUAGE],
        ["TS", FileType.PROGRAMMING_LANGUAGE],
        ["PY", FileType.PROGRAMMING_LANGUAGE],
        ["BMP", FileType.IMAGE],
        ["JPG", FileType.IMAGE],
        ["JPEG", FileType.IMAGE],
        ["PNG", FileType.IMAGE],
        ["TIFF", FileType.IMAGE],
        ["CSV", FileType.TABULAR],
        ["XLS", FileType.TABULAR],
        ["XLSX", FileType.TABULAR],
        ["JSON", FileType.JSON],
        ["TXT", FileType.PLAIN_TEXT]
    ])

    // colors for all types without an icon
    private static colors = new Map([
        ["MD", "#F4A261"],
        ["PY", "#2196F3"],
        ["JSON", "#ffe83d"],
        ["TS", "#2bc3ed"],
        ["JS", "#e37d3d"]
    ]);

    public static getColorCode(extension: string): string {
        const code = this.colors.get(extension);
        return code !== undefined ? code : "#E9C46A";
    }

    public static getType(extension: string): FileType {
        const type = this.extToType.get(extension.toUpperCase());
        return type !== undefined ? type : FileType.OTHER;
    }

    public static getFileIconPath(type: FileType | undefined): string {
        switch (type) {
            case FileType.IMAGE: return FileTypes.icons.picture.path;
            case FileType.TABULAR: return FileTypes.icons.table.path;
            case FileType.PLAIN_TEXT: return FileTypes.icons.plaintext.path;
            case FileType.OTHER: return FileTypes.icons.unknown_file.path;
            default: return FileTypes.icons.unknown_file.path;
        }
    }

    public static getTabIconPath(type: TabType | undefined): string {
        switch (type) {
            case 'UNITY': return FileTypes.icons.experiment.path;
            case 'HINT': return FileTypes.icons.lightbulb.path;
            case 'PLOTLY': return FileTypes.icons.line_chart.path;
            default: return FileTypes.icons.unknown_file.path;
        }
    }
}