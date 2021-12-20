import {GuidedTour, TourStep, Orientation} from "ngx-guided-tour";

const welcome: TourStep = {
  title: "Willkommen!",
  content: "Mit unserer Lernplattform kannst du anhand eines praktischen Beispiels erste Erfahrungen als Data Sciencist sammeln." +
    "<br><br>Diese Tour bietet eine kurze Einführung zu den wichtigsten Komponenten.",
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
  selector: ".terminal",
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
  content: "Mit der Navigationsleiste kann man das Datei- oder Hinweis-System öffnen, " +
    "die Anzeige des Terminals (de-)aktivieren, oder diese Info-Tour starten.",
  selector: "app-actionbar",
  highlightPadding: 0,
  orientation: Orientation.Right,
  scrollAdjustment: 0,
  skipStep: false,
  useHighlightPadding: false,
  action(): void {},
  closeAction(): void {},
}

const left: TourStep = {
  title: "Der Code-Editor",
  content: "An dieser Stelle kannst du programmieren. Änderungen werden dabei automatisch abgespeichert." +
    "<br><br>Die Symbole unten rechts dienen dazu Änderungen zu wiederholen / rückgängig zu machen und Python-Code auszuführen.",
  selector: "#left",
  highlightPadding: 0,
  orientation: Orientation.Right,
  scrollAdjustment: 0,
  skipStep: false,
  useHighlightPadding: false,
  action(): void {},
  closeAction(): void {},
}

const right: TourStep = {
  title: "Die Visualisierung",
  content: "Auf der rechten Seite werden zum Beispiel Diagramme oder Bilder dargestellt " +
    "— und natürlich unsere Blaubeer-Sortiermaschine.",
  selector: "#right",
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
  content: "Im Dateisystem finden sich unter anderem Trainingsdaten für die Klassifikation, " +
    "Aufgabenstellungen und ein Glossar mit Definitionen und (hoffentlich) hilfreichen Tipps.",
  selector: "app-filetree",
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
  left,
  terminal,
  right,
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
