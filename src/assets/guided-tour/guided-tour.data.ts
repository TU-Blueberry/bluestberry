import {GuidedTour, TourStep, Orientation} from "ngx-guided-tour";

const welcome: TourStep = {
  title: "Herzlich willkommen bei \"Project Blueberry\"",
  content: "Das Ziel dieser Lernplattform ist es, eine praktische Einführung in das Thema Data Science zu geben." +
    "<br><br>Es folgt eine kurze Vorstellung der angebotenen Features und wichtigsten Bedienelemente.",
  selector: "",
  highlightPadding: 0,
  orientation: undefined,
  scrollAdjustment: 0,
  skipStep: false,
  useHighlightPadding: false,
  action(): void {},
  closeAction(): void {},
}

const terminal: TourStep = {
  title: "Das Terminal",
  content: "Im Terminal wird die Ausgabe der Programmausführung anzeigt — inklusive etwaiger Fehlermeldungen.",
  selector: "#terminal-area",
  highlightPadding: 0,
  orientation: Orientation.Top,
  scrollAdjustment: 0,
  skipStep: false,
  useHighlightPadding: false,
  action(): void {},
  closeAction(): void {},
}

const navigation: TourStep = {
  title: "Die Navigationsleiste",
  content: "Mit der Navigationsleiste können Sie u.a. das Dateisystem ein- und ausblenden oder das Hinweis-System öffnen. " +
    "<br><br> Über das Fragezeichensymbol kann diese Info-Tour außerdem jederzeit wiederholt werden.",
  selector: "app-actionbar",
  highlightPadding: 0,
  orientation: Orientation.Right,
  scrollAdjustment: 0,
  skipStep: false,
  useHighlightPadding: false,
  action(): void {},
  closeAction(): void {},
}

const editor: TourStep = {
  title: "Der Code-Editor",
  content: "An dieser Stelle können Sie in Python programmieren und anderweitige Textdateien bearbeiten. " +
    "<br><br>Python-Code kann via Pyodide client-seitig im Browser ausgeführt werden. " +
    "<br><br>Änderungen an einer Datei werden automatisch gespeichert.",
  selector: "#editor-area",
  highlightPadding: 0,
  orientation: Orientation.Right,
  scrollAdjustment: 0,
  skipStep: false,
  useHighlightPadding: false,
  action(): void {},
  closeAction(): void {},
}

const actionbar: TourStep = {
  title: "Der Code-Editor",
  content: "Diese Symbole ermöglichen das Wiederholen / Rückgängig machen von Änderungen in einer Textdatei. " +
    "<br><br>Im Falle einer Python-Datei kann hier die Codeausführung gestartet oder notfalls abgebrochen werden.",
  selector: ".code-action-bar",
  highlightPadding: 0,
  orientation: Orientation.Top,
  scrollAdjustment: 0,
  skipStep: false,
  useHighlightPadding: false,
  action(): void {},
  closeAction(): void {},
}


const visualisation: TourStep = {
  title: "Die Visualisierung",
  content: "Auf der rechten Seite können zum Beispiel Diagramme oder Bilder angezeigt werden " +
    "— und natürlich die Simulation der Blaubeer-Sortiermaschine.",
  selector: "#visualisation-area",
  highlightPadding: 0,
  orientation: Orientation.Left,
  scrollAdjustment: 0,
  skipStep: false,
  useHighlightPadding: false,
  action(): void {},
  closeAction(): void {},
}

const search: TourStep = {
  title: "Die Suchleiste",
  content: "Alternativ zum direkten durchstöbern kann das Dateisystem auch mittels Suchleiste durchforstet werden.",
  selector: "app-search",
  highlightPadding: 0,
  orientation: Orientation.Bottom,
  scrollAdjustment: 0,
  skipStep: false,
  useHighlightPadding: false,
  action(): void {},
  closeAction(): void {},
}

const fileSystem: TourStep = {
  title: "Das Dateisystem",
  content: "Im Dateisystem enhalten sind u.a. Trainingsdaten, Aufgabenstellungen und ein Glossar mit Definitionen." +
    "<br><br>Mittels Rechtsklick können Sie auf das dazugehörige Kontextmenü zugreifen, um zum Beispiel eigene Dateien zu erstellen.",
  selector: "#file-tree-area",
  highlightPadding: 0,
  orientation: Orientation.Right,
  scrollAdjustment: 0,
  skipStep: false,
  useHighlightPadding: false,
  action(): void {},
  closeAction(): void {},
}

const help: TourStep = {
  title: "Hilfe",
  content: "Bei weiteren Fragen ist vielleicht das Hinweissystem hilfreich. " +
    "Alternativ kann diese Tour auch beliebig oft wiederholt werden.",
  selector: ".help",
  highlightPadding: 0,
  orientation: Orientation.Right,
  scrollAdjustment: 0,
  skipStep: false,
  useHighlightPadding: false,
  action(): void {},
  closeAction(): void {},
}

const tourSteps = [
  welcome,
  navigation,
  fileSystem,
  search,
  editor,
  actionbar,
  terminal,
  visualisation,
  // help,
]

export const tour: GuidedTour = {
  tourId: "Intro",
  steps: tourSteps,
  minimumScreenSize: 0,
  preventBackdropFromAdvancing: false,
  resizeDialog: {content: ""},
  useOrb: false,
  completeCallback(): void {},
  skipCallback(stepSkippedOn: number): void {},
}
