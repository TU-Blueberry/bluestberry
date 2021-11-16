import { Component, OnInit } from '@angular/core'
import { load } from 'js-yaml'

@Component({
  selector: 'app-hint-viewer',
  templateUrl: './hint-viewer.component.html',
  styleUrls: ['./hint-viewer.component.scss'],
})
export class HintViewerComponent {

  dialogue_history_: Array<DialogueContent> = []
  dialogue_options_: Array<Question> = []

  dialogue_history_: Array<DialogueContent> = [];
  dialogue_options_: Array<DialogueContent> = [];

  is_open_ = false;


  constructor() { 
    this.initDialogue();
  }

  initDialogue(): void {
    this.dialogue_history_.push(new DialogueContent(0, "Hast du eine Frage?", false));
    this.dialogue_history_.push(new DialogueContent(1, "Wie geht das?", true));
    this.dialogue_history_.push(new DialogueContent(2, "So geht das!", false));

    this.dialogue_options_.push(new DialogueContent(0, "Aber wie geht x?", true));
    this.dialogue_options_.push(new DialogueContent(1, "Aber wie geht y?", true));
    this.dialogue_options_.push(new DialogueContent(2, "Aber wie geht z?", true));
  }

  toggleHints(): void {
    this.is_open_ = !this.is_open_;
  }

  optionSelected(selected_id: number): void {
    console.log("selected option " + selected_id);

    // get selected option object
    var selected_option_ = this.dialogue_options_.find( opt => opt.id == selected_id)
    this.dialogue_options_ = [];

    // add option to history
    selected_option_!.id = this.dialogue_history_.length;
    this.dialogue_history_.push(selected_option_!);
    

    this.generateAnswer();
    this.generateNewOptions();

  }

  generateAnswer(): void {

    this.dialogue_history_.push(new DialogueContent(this.dialogue_history_.length, "Wieso verstehst du das nicht? So geht das!", false));

  }

  generateNewOptions(): void {
    
    this.dialogue_options_.push(new DialogueContent(0, "Aber wie geht x?", true));
    this.dialogue_options_.push(new DialogueContent(1, "Aber wie geht y?", true));
    this.dialogue_options_.push(new DialogueContent(2, "Aber wie geht z?", true));

  }






}


class DialogueContent {
  
  id: number;
  content: string;
  question: boolean; // false -> answer

  constructor(id: number, content: string, question: boolean) {
    this.id = id;
    this.content = content;
    this.question = question;
  }

  getDivClass(): string {
    if(this.question) {
      return "hint-question"
    } else {
      return "hint-answer"
    }
  }

}



