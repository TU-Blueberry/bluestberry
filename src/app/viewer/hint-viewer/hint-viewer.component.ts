import { Component, OnInit } from '@angular/core'
import { load } from 'js-yaml'

@Component({
  selector: 'app-hint-viewer',
  templateUrl: './hint-viewer.component.html',
  styleUrls: ['./hint-viewer.component.scss'],
})
export class HintViewerComponent {

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

    this.answer_storage_ = [
      new Answer(0, "Wie kann ich dir helfen?", [0,1,2]),
      new Answer(1, "Es gibt viele Klassifikatoren, einige Beispiele sind Random Forests, Neuronale Netze, Support Vector Machines oder auch Clusteringverfahren.", [3, 4, 5, 6]),
      new Answer(2, "Was sind acht Hobbits? Ein Hobbyte!", [0,1,2]),
      new Answer(3, "Das weiß ich auch noch nicht...", [0,1,2]),
      new Answer(4, "Das hier ist Blueberry. Eine Lernplattform für DataScience :)", [0,1,2]),
    ]

    this.questions_storage_ = [
      new Question(0, "Welche Klassifikatoren gibt es?", 1),
      new Question(1, "Erzähl mir einen Witz!", 2),
      new Question(2, "Wo bin ich hier?", 4),
      new Question(3, "Was ist ein Random Forest?", 3),
      new Question(4, "Was ist ein Neuronales Netz?", 3),
      new Question(5, "Was ist eine Support Vector Machines?", 3),
      new Question(6, "Was ist Clustering?", 3),
      new Question(7, "Welche Clusteringverfahren gibt es alles?", 9),
    ]
    
  }
  
  toggleHints(): void {
    this.is_open_ = !this.is_open_;
  }

  initDialogue(): void {
    const starting_answer = this.answer_storage_.find(
      a => a.getAnswerId() == 0
    );

    if(starting_answer == undefined) {
      console.log("no starting answer found");
      return;
    }

    this.dialogue_history_.push(starting_answer!);
    const options = this.getQuestionOptions(starting_answer!);

    for(var o of options) {
      this.dialogue_options_.push(o);
    }
  }


  optionSelected(selected_id: number): void {
    // get selected question object
    const selected_question = this.dialogue_options_.find( q => q.getQuestionId() == selected_id)
    
    // add question to history
    this.dialogue_history_.push(selected_question!)
    this.dialogue_options_ = [];

    const answer = this.answer_storage_.find(a => a.getAnswerId() == selected_question!.getNextAnswerId());

    console.log("next answer " + answer!.getAnswerId() + " " + answer!.getContent())

    if(answer == undefined) {
      console.log("next answer with id " + selected_question!.getNextAnswerId() + " not found");
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
  
  protected content: string; // displayed text

  protected question: boolean = false; // false -> answer

  constructor(content: string = "") {
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

  private answerId: number;

  private questionIdOptions: Array<number> = [];

  constructor(answerId: number, content: string, questionIdOptions: Array<number>) {
    super(content);
    this.answerId = answerId;
    this.question = false;
    this.questionIdOptions = questionIdOptions;
  }

  getAnswerId(): number {
    return this.answerId;
  }

  addQuestionIdOption(id: number): void {
    this.questionIdOptions.push(id);
  }

  getQuestionIdOptions(): Array<number> {
    return this.questionIdOptions;
  }

}

class Question extends DialogueContent {

  private questionId: number;

  private nextAnswerId: number = -1;

  constructor(question_id: number, content: string, nextAnswerId: number) {
    super(content);
    this.questionId = question_id;
    this.question = true;
    this.nextAnswerId = nextAnswerId;
  }

  getQuestionId(): number {
    return this.questionId;
  }

  setNextAnswerId(id: number): void {
    this.nextAnswerId = id;
  }

  getNextAnswerId(): number {
    return this.nextAnswerId;
  }

}



const givenHints = `
{

  "questions": [
      {
          "questionId": 0,
          "content": "Welche Klassifikatoren gibt es?",
          "nextAnswerId": 1
      },
      {
          "questionId": 1,
          "content": "Erzähl mir einen Witz!",
          "nextAnswerId": 2
      },
      {
          "questionId": 2,
          "content": "Wo bin ich hier?",
          "nextAnswerId": 4
      },
      {
          "questionId": 3,
          "content": "Was ist ein Random Forest?",
          "nextAnswerId": 3
      },
      {
          "questionId": 4,
          "content": "Was ist ein Neuronales Netz?",
          "nextAnswerId": 3
      },
      {
          "questionId": 5,
          "content": "Was ist eine Support Vector Machines?",
          "nextAnswerId": 3
      },
      {
          "questionId": 6,
          "content": "Was ist Clustering?",
          "nextAnswerId": 3
      },
      {
          "questionId": 7,
          "content": "Welche Clusteringverfahren gibt es alles?",
          "nextAnswerId": 0
      }
  ],

  "answers": [
      {
          "answerId": 0, 
          "content": "Wie kann ich dir helfen?",
          "questionIdOptions": [0, 1, 2]
      },
      {
          "answerId": 1,
          "content": "Es gibt viele Klassifikatoren, einige Beispiele sind Random Forests, Neuronale Netze, Support Vector Machines oder auch Clusteringverfahren.",
          "questionIdOptions": [3, 4, 5, 6]
      },
      {
          "answerId": 2,
          "content": "Was sind acht Hobbits? Ein Hobbyte!",
          "questionIdOptions": [0]
      },
      {
          "answerId": 3,
          "content": "Das weiß ich auch noch nicht...",
          "questionIdOptions": [0]
      },
      {
          "answerId": 4,
          "content": "Das hier ist Blueberry. Eine Lernplattform für DataScience :)",
          "questionIdOptions": [0]
      }
  ]

}
`

