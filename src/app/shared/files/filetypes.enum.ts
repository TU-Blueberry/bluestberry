import { TabType } from "src/app/tab/model/tab-type.model";

export enum FileType {
    IMAGE,
    DATA,
    PROGRAMMING_LANGUAGE,
    MARKDOWN,
    TEX,
    JSON, 
    PLAIN_TEXT,
    OTHER
}

export class FileTypes {
    static readonly imageIconPath = "assets/icons/picture.png";
    static readonly tableIconPath = "assets/icons/table.png";
    static readonly plainTextPath = "assets/icons/plaintext.png";
    static readonly unknownFilePath = "assets/icons/unknown_file.png";
    static readonly unityPath = "assets/icons/experiment.png";
    static readonly hintPath = "assets/icons/lightbulb.png";

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
        ["CSV", FileType.DATA],
        ["XLS", FileType.DATA],
        ["XLSX", FileType.DATA],
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
            case FileType.IMAGE: return FileTypes.imageIconPath;
            case FileType.DATA: return FileTypes.tableIconPath;
            case FileType.PLAIN_TEXT: return FileTypes.plainTextPath;
            case FileType.OTHER: return FileTypes.unknownFilePath;
            default: return FileTypes.unknownFilePath;
        }
    }

    public static getTabIconPath(type: TabType | undefined): string {
        switch (type) {
            case 'UNITY': return FileTypes.unityPath;
            case 'HINT': return FileTypes.hintPath;
            default: return FileTypes.unknownFilePath;
        }
    }
}