import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-hint-viewer',
  templateUrl: './hint-viewer.component.html',
  styleUrls: ['./hint-viewer.component.scss']
})
export class HintViewerComponent {

  // https://material.angular.io/cdk/overlay/examples#cdk-overlay-basic


  questions_storage_ : Array<Question> = [];
  answer_storage_ : Array<Answer> = [];

  dialogue_history_: Array<DialogueContent> = [];
  dialogue_options_: Array<Question> = [];

  is_open_ = false;


  constructor() { 
    this.loadQuestionAnswers();
    this.initDialogue();
  }

  loadQuestionAnswers(): void {

    var q0 = new Question(0, "Welche Klassifikatoren gibt es?");
    var q1 = new Question(1, "Erzähl mir einen Witz!");
    var q2 = new Question(2, "Was ist ein Random Forest?");
    var q3 = new Question(3, "Was ist ein Neuronales Netz?");
    var q4 = new Question(4, "Was ist eine Support Vector Machines?");
    var q5 = new Question(5, "Was ist Clustering?");
    
    var a0 = new Answer(0, "Willkommen bei Blueberry. Wie kann ich dir helfen?");
    var a1 = new Answer(1, "Es gibt viele Klassifikatoren, einige Beispiele sind Random Forests, Neuronale Netze, Support Vector Machines oder auch Clusteringverfahren.");
    var a2 = new Answer(2, "Denk dir selber einen aus.");
    var a3 = new Answer(3, "Ja weiß ich auch nicht...");
    
    a0.addQuestionIdOption(q0.getQuestionId());
    a0.addQuestionIdOption(q1.getQuestionId());
    a1.addQuestionIdOption(q2.getQuestionId());
    a1.addQuestionIdOption(q3.getQuestionId());
    a1.addQuestionIdOption(q4.getQuestionId());
    a1.addQuestionIdOption(q5.getQuestionId());
    
    q0.setNextAnswerId(a1.getAnswerId());
    q2.setNextAnswerId(a3.getAnswerId());
    q3.setNextAnswerId(a3.getAnswerId());
    q4.setNextAnswerId(a3.getAnswerId());
    q5.setNextAnswerId(a3.getAnswerId());
    q1.setNextAnswerId(a2.getAnswerId());

    this.questions_storage_.push(q0);
    this.questions_storage_.push(q1);
    this.questions_storage_.push(q2);
    this.questions_storage_.push(q3);
    this.questions_storage_.push(q4);
    this.questions_storage_.push(q5);
    
    this.answer_storage_.push(a0);
    this.answer_storage_.push(a3);
    this.answer_storage_.push(a1);
    this.answer_storage_.push(a2);
    
  }
  

  initDialogue(): void {

    const starting_answer = this.answer_storage_.find(a => a.getAnswerId() == 0);
    this.dialogue_history_.push(starting_answer!);
    const options = this.getQuestionOptions(starting_answer!);

    for(var o of options) {
      this.dialogue_options_.push(o);
    }

  }

  toggleHints(): void {
    this.is_open_ = !this.is_open_;
  }

  optionSelected(selected_id: number): void {

    // // get selected option object
    const selected_option = this.dialogue_options_.find( q => q.getQuestionId() == selected_id)
    this.dialogue_options_ = [];

    // // add option to history
    this.dialogue_history_.push(selected_option!)

    this.generateConversationStep();

  }

  generateConversationStep(): void {

    const last_question = this.dialogue_history_[this.dialogue_history_.length-1] as Question;

    const answer = this.answer_storage_.find(a => a.getAnswerId() == last_question.getNextAnswerId());
    if(answer == undefined) {
      console.log("next answer with id " + last_question.getNextAnswerId() + " not found");
      return;
    }

    this.dialogue_history_.push(answer!);

    const new_options = this.getQuestionOptions(answer!);
    for(var o of new_options) {
      this.dialogue_options_.push(o);
    }

  }

  undo(): void {
    if(this.dialogue_history_.length < 2) {
      return;
    }

    this.dialogue_options_ = []; // clear current options
    this.dialogue_history_.pop(); // remove last answer
    this.dialogue_history_.pop(); // remove last question

    const last_answer = this.dialogue_history_[this.dialogue_history_.length-1] as Answer;
    const new_options = this.getQuestionOptions(last_answer);
    for(var o of new_options) {
      this.dialogue_options_.push(o);
    }

  }

  getQuestionOptions(answer: Answer): Array<Question> {
    return this.questions_storage_.filter( q => answer.getQuestionIdOptions().includes(q.getQuestionId()) );
  }

}


abstract class DialogueContent {
  
  private content: string; // displayed text

  protected question: boolean = false; // false -> answer

  constructor(content: string) {
    this.content = content;
  }

  getDivClass(): string {
    if(this.question) {
      return "hint-question"
    } else {
      return "hint-answer"
    }
  }

  getContent(): string {
    return this.content;
  }

}


class Answer extends DialogueContent {

  private answer_id: number;

  private question_id_options: Array<number> = [];

  constructor(tipp_id: number, content: string) {
    super(content);
    this.answer_id = tipp_id;
    this.question = false;
  }

  getAnswerId(): number {
    return this.answer_id;
  }

  addQuestionIdOption(id: number): void {
    this.question_id_options.push(id);
  }

  getQuestionIdOptions(): Array<number> {
    return this.question_id_options;
  }

}

class Question extends DialogueContent {

  private question_id: number;

  private next_answer_id: number = -1;

  constructor(question_id: number, content: string) {
    super(content);
    this.question_id = question_id;
    this.question = true;
  }

  getQuestionId(): number {
    return this.question_id;
  }

  setNextAnswerId(id: number): void {
    this.next_answer_id = id;
  }

  getNextAnswerId(): number {
    return this.next_answer_id;
  }

}


