import { Component, OnInit } from '@angular/core'
import { load } from 'js-yaml'

@Component({
  selector: 'app-hint-viewer',
  templateUrl: './hint-viewer.component.html',
  styleUrls: ['./hint-viewer.component.scss'],
})
export class HintViewerComponent {
  questions_storage_: Array<Question> = []
  answer_storage_: Array<Answer> = []

  dialogue_history_: Array<DialogueContent> = []
  dialogue_options_: Array<Question> = []

  is_open_ = false

  constructor() {
    this.loadQuestionAnswers()
    this.initDialogue()
  }

  loadQuestionAnswers(): void {
    var loadedYaml = load(string_from_yaml) as Array<Object>

    for (let item_id in loadedYaml) {
      var outerItem = loadedYaml[item_id] as any
      var name = Object.keys(outerItem)[0]
      var item = outerItem[name]

      if (item.hasOwnProperty('content')) {
        const content = item['content'] as string

        if (item.hasOwnProperty('answer_id')) {
          const answer_id = item['answer_id'] as number

          if (item.hasOwnProperty('question_options')) {
            // valid answer

            const question_options = item['question_options'] as Array<number>

            this.answer_storage_.push(
              new Answer(answer_id, content, question_options)
            )
          } else {
            console.log(
              'Error parsing hint-yaml. Answer has no question options.'
            )
          }
        } else if (item.hasOwnProperty('question_id')) {
          const question_id = item['question_id'] as number

          if (item.hasOwnProperty('following_answer_id')) {
            // valid question

            const following_answer_id = item['following_answer_id'] as number
            this.questions_storage_.push(
              new Question(question_id, content, following_answer_id)
            )
          } else {
            console.log(
              'Error parsing hint-yaml. Question has no following answer.'
            )
          }
        } else {
          console.log(
            'Error parsing hint-yaml. Item is not question nor answer.'
          )
        }
      } else {
        console.log('Error parsing hint-yaml. Item has no content.')
      }
    }

  }

  toggleHints(): void {
    this.is_open_ = !this.is_open_
  }

  initDialogue(): void {
    const starting_answer = this.answer_storage_.find(
      (a) => a.getAnswerId() == 0
    )

    if (starting_answer == undefined) {
      console.log('no starting answer found')
      return
    }

    this.dialogue_history_.push(starting_answer!)
    const options = this.getQuestionOptions(starting_answer!)

    for (var o of options) {
      this.dialogue_options_.push(o)
    }
  }

  optionSelected(selected_id: number): void {
    // get selected question object
    const selected_question = this.dialogue_options_.find(
      (q) => q.getQuestionId() == selected_id
    )

    // add question to history
    this.dialogue_history_.push(selected_question!)
    this.dialogue_options_ = []

    const answer = this.answer_storage_.find(
      (a) => a.getAnswerId() == selected_question!.getNextAnswerId()
    )

    if (answer == undefined) {
      console.log(
        'next answer with id ' +
          selected_question!.getNextAnswerId() +
          ' not found'
      )
      return
    }

    this.dialogue_history_.push(answer!)

    const new_options = this.getQuestionOptions(answer!)
    for (var o of new_options) {
      this.dialogue_options_.push(o)
    }
  }

  undo(): void {
    if (this.dialogue_history_.length < 2) {
      return
    }

    this.dialogue_options_ = [] // clear current options
    this.dialogue_history_.pop() // remove last answer
    this.dialogue_history_.pop() // remove last question

    const last_answer = this.dialogue_history_[
      this.dialogue_history_.length - 1
    ] as Answer
    const new_options = this.getQuestionOptions(last_answer)
    for (var o of new_options) {
      this.dialogue_options_.push(o)
    }
  }

  getQuestionOptions(answer: Answer): Array<Question> {
    return this.questions_storage_.filter((q) =>
      answer.getQuestionIdOptions().includes(q.getQuestionId())
    )
  }
}

abstract class DialogueContent {

  protected text_slices: Array<string> = [];
  protected href_dividers: Array<string> = [];

  protected question: boolean = false // false -> answer

  private re_link = /link<.*?>/g

  constructor(content: string = '') {
    this.parseContent(content);

  }

  getDivClass(): string {
    if (this.question) {
      return 'hint-question'
    } else {
      return 'hint-answer'
    }
  }

  parseContent(original_content: string): void {

    this.text_slices = original_content.split(this.re_link);

    let matches = original_content.match(this.re_link);
    console.log(original_content);
    if(matches != null) {
      for(let match of matches) {

        var actual_link = match.slice(5, -2);
        if(!actual_link.startsWith("http://") || !actual_link.startsWith("https://")) {
          actual_link = "https://" + actual_link;
        }
        this.href_dividers.push(actual_link);
      }
    }

  }
  
  getTextSlice(index: number): string {
    if(index < this.text_slices.length) {
      return this.text_slices[index];
    } 
    return "error";
  }

  getHrefDivider(index: number): string {
    if(index < this.href_dividers.length) {
      return this.href_dividers[index];
    } 
    return "error";
  }

  getHrefDividers(): Array<string> {
    return this.href_dividers;
  }

}

class Answer extends DialogueContent {
  private answerId: number

  private questionIdOptions: Array<number> = []

  constructor(
    answerId: number,
    content: string,
    questionIdOptions: Array<number>
  ) {
    super(content)
    this.answerId = answerId
    this.question = false
    this.questionIdOptions = questionIdOptions
  }

  getAnswerId(): number {
    return this.answerId
  }

  addQuestionIdOption(id: number): void {
    this.questionIdOptions.push(id)
  }

  getQuestionIdOptions(): Array<number> {
    return this.questionIdOptions
  }
}

class Question extends DialogueContent {
  private questionId: number

  private nextAnswerId: number = -1

  constructor(question_id: number, content: string, nextAnswerId: number) {
    super(content)
    this.questionId = question_id
    this.question = true
    this.nextAnswerId = nextAnswerId
  }

  getQuestionId(): number {
    return this.questionId
  }

  setNextAnswerId(id: number): void {
    this.nextAnswerId = id
  }

  getNextAnswerId(): number {
    return this.nextAnswerId
  }
}

const string_from_yaml = `

- item01:
    answer_id: 0 # start
    question_options: [0]
    content: Willkommen. Welche Fragen hast du?

- item02:
    question_id: 0
    following_answer_id: 1
    content: Was ist ein Klassifikator?
        
- item03:
    answer_id: 1 
    question_options: [1]
    content: |
        Ein Klassifikator ist ein Verfahren zur Einteilung von Objekten oder Situationen in verschiedene Klassen. Hier in diesem Beispiel wird der Klassifikator eingesetzt, um gute Blaubeeren von schlechten Blaubeeren zu unterscheiden, das heißt die Einteilung der Blaubeeren in die Klassen „gut“ und „schlecht“.
        
- item04:
    question_id: 1
    following_answer_id: 2
    content: Welche Klassifikatoren gibt es?

- item05:
    answer_id: 2 
    question_options: [2]
    content: |
        Es gibt viele Klassifikatoren, einige Beispiele sind Random Forests, Neuronale Netze, Support Vector Machines oder auch Clusteringverfahren. 

- item06:
    question_id: 2
    following_answer_id: 3
    content: Ich möchte mehr darüber erfahren.
    
- item07:
    answer_id: 3
    question_options: []
    content: |
        Dann sieh dir gerne diese Seiten an: link<www.google.de/> oder link<www.google.com/>
        

`
