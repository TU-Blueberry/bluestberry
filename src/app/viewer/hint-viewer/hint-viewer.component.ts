import { Component, OnInit } from '@angular/core'
import { load } from 'js-yaml'
import {KatexOptions} from "ngx-markdown";
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';
import { FilesystemService } from 'src/app/filesystem/filesystem.service';
import { FilesystemEventService } from 'src/app/filesystem/events/filesystem-event.service';
import { FileType } from 'src/app/shared/files/filetypes.enum';
import { ConfigService } from 'src/app/shared/config/config.service';
import { defer, Observable, of } from 'rxjs';
import { filter, map, mergeAll, switchMap } from 'rxjs/operators';
import { ExperienceStateModel, ExperienceState } from 'src/app/experience/experience.state';
import { Store } from '@ngxs/store';

@Component({
  selector: 'app-hint-viewer',
  templateUrl: './hint-viewer.component.html',
  styleUrls: ['./hint-viewer.component.scss'],
})

export class HintViewerComponent implements OnInit {
  questions_storage_: Array<Question> = []
  answer_storage_: Array<Answer> = []

  dialogue_history_: Array<DialogueContent> = []
  dialogue_options_: Array<Question> = []

  error_answer: Answer = new Answer(-1, "Ich konnte leider keine Antwort finden.", []);

  katexOptions: KatexOptions = {
    // displayMode: true,
    throwOnError: false,
    errorColor: '#cc0000',
  }

  base_path: string = '';
  glossaryEntryPoint: string = '';

  imagePathToSafeUrl = new Map<string, SafeUrl>();


  constructor(private domSanitizer: DomSanitizer, private conf: ConfigService, private store: Store,
  private fsService: FilesystemService, private fsEventService: FilesystemEventService) {}

  ngOnInit() {
    this.conf.getHintRootAndGlossaryEntryPointOfCurrentExperience().pipe(
      switchMap(paths => this.fsService.getFileAsBinary(paths.hintRoot).pipe(
          switchMap(data => {
            this.glossaryEntryPoint = paths.glossaryEntryPoint;
            this.base_path = paths.hintRoot.split("/").slice(0,-1).join("/");
            var rootFileString = new TextDecoder().decode(data);
            console.log("Hints file " + paths.hintRoot + " loaded");
            this.loadFile(rootFileString);

            return this.generateSafeUrls();
          }))
      )
    ).subscribe(() => {}, err => console.error(err), () => this.initDialogue());
  }

  loadFile(yamlString: string): void {  
  
    var loadedYaml = load(yamlString) as Array<Object>

    for (let item_id in loadedYaml) {
      var outerItem = loadedYaml[item_id] as any
      var name = Object.keys(outerItem)[0]
      var item = outerItem[name]

      if(name == "files") {
        for(let subfile_id in item) {
          const subfileName = item[subfile_id]
          const subfilePath = [this.base_path, subfileName].join("/");

          this.fsService.getFileAsString(subfilePath).subscribe(subfileContent => {
            console.log("Hints subfile " + subfilePath + " loaded");
            this.loadFile(subfileContent);
          });
        }
        continue
      }

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

  initDialogue(): void {
    const starting_answer = this.answer_storage_.find(
      (a) => a.getAnswerId() == 0
    )

    if (starting_answer == undefined) {
      console.log('no starting answer found')
      return
    }

    if(starting_answer.getQuestionIdOptions().length == 0) {
      console.log('starting answer must have question options!');
      return
    }

    for(var default_option of starting_answer.getQuestionIdOptions()) {
      this.error_answer.addQuestionIdOption(default_option);
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

    var answer = this.answer_storage_.find(
      (a) => a.getAnswerId() == selected_question!.getNextAnswerId()
    )

    if (answer == undefined) {
      console.log(
        'next answer with id ' +
          selected_question!.getNextAnswerId() +
          ' not found'
      )

      answer = this.error_answer;
    }

    this.dialogue_history_.push(answer!)
    console.log(answer!.getTextDividers())

    const new_options = this.getQuestionOptions(answer!)
    for (var o of new_options) {
      this.dialogue_options_.push(o)
    }
  }

  simpleUndo(): void {

    if (this.dialogue_history_.length < 2) {
      return
    }

    this.dialogue_options_ = [] // clear current options
    this.dialogue_history_.pop()
    this.dialogue_history_.pop()

    const last_answer = this.dialogue_history_[
      this.dialogue_history_.length - 1
    ] as Answer
    const new_options = this.getQuestionOptions(last_answer)
    for (var o of new_options) {
      this.dialogue_options_.push(o)
    }
  }

  multiUndo(): void {
    this.simpleUndo();
    this.simpleUndo();
    this.simpleUndo();
  }

  reset(): void {
    this.dialogue_options_ = []
    this.dialogue_history_ = []
    this.initDialogue();
  }


  getQuestionOptions(answer: Answer): Array<Question> {
    return this.questions_storage_.filter((q) =>
      answer.getQuestionIdOptions().includes(q.getQuestionId())
    )
  }

  // TODO: Differ between local and global glossary files
  openGlossary(glossaryFileName: string): void {
    const path = `${this.glossaryEntryPoint}/${glossaryFileName}.md`;
    console.log("opening glossary at " + path)

    this.fsService.getFileAsBinary(path).subscribe(node => {
      this.fsEventService.onOpenFile.emit({path: path, byUser: true, fileContent: node, type: FileType.MARKDOWN});
    });
  }


  private generateSafeUrls(): Observable<never> {
    const imagesPath = `${this.base_path}/img`;

    return this.fsService.scanAll(imagesPath, 2, true).pipe(
      map(([subfolders, files]) => files),
      map(files => files.filter(file => this.isImage(file.name))),
      switchMap(nodes => nodes.map(node => this.loadFileAndCreateSafeUrl(`${this.base_path}/img`, node.name))),
      mergeAll()
    );
  }

  private isImage(name: string): boolean {
    return (name.toLowerCase().endsWith("png") || name.toLowerCase().endsWith("jpeg") || name.toLowerCase().endsWith("jpg"));
  }

  private loadFileAndCreateSafeUrl(path: string, name: string) {
    return this.fsService.getFileAsBinary(`${path}/${name}`).pipe(
      switchMap(binary => defer(() => {
        const safeUrl = this.domSanitizer.bypassSecurityTrustUrl(
          URL.createObjectURL(
            new Blob([binary.buffer], {type: 'image/png'})
          )
        );
        this.imagePathToSafeUrl.set(name, safeUrl);
      }))
    )
  }
}


enum TextDividerTypes {
  HREF = 'HREF',
  MARKDOWN = 'MARKDOWN',
  IMAGE = 'IMAGE',
  INLINE_CODE = 'INLINE_CODE',
  BLOCK_CODE = 'BLOCK_CODE',
  GLOSSARY = 'GLOSSARY',
  NONE = 'NONE',
}

abstract class DialogueContent {

  protected text_slices: Array<string> = [];
  protected text_dividers: Array<[string, string | undefined, TextDividerTypes]> = [];
  protected question: boolean = false // false -> answer

  private re_divider = /((markdown)|(link)|(codeinline)|(code)|(img)|(glossary))<(.| |[\r\n])*?\/>/g

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

    var matches: Array<string> = []
    this.text_slices = [];

    var match;
    var last_regex_end_index = 0;
    while((match = this.re_divider.exec(original_content)) != null) {

      var text = original_content.slice(last_regex_end_index, match.index);
      this.text_slices.push(text);
      last_regex_end_index = match.index + match[0].length;
      matches.push(match[0]);
    }

    var end_text = original_content.slice(last_regex_end_index, original_content.length);
    this.text_slices.push(end_text);

    if(matches != null && matches.length > 0) {
      for(let match of matches) {

        var actual_content: string = "";
        var divider_type: TextDividerTypes = TextDividerTypes.NONE;

        var optional: string | undefined = undefined;

        if(match.startsWith("link")) {

          actual_content = match.slice(5, -2).trim();
          if(!actual_content.startsWith("http://") && !actual_content.startsWith("https://")) {
            actual_content = "https://" + actual_content;
          }

          var content_split = actual_content.split('|')
          if(content_split.length > 1) {
            actual_content = content_split[0].trim();
            optional = content_split[1].trim();
          }

          divider_type = TextDividerTypes.HREF;

        } else if(match.startsWith("markdown")) {

          actual_content = match.slice(9, -2).trim();
          divider_type = TextDividerTypes.MARKDOWN;

        } else if(match.startsWith("codeinline")) {

          actual_content = match.slice(11, -2).trim();
          divider_type = TextDividerTypes.INLINE_CODE;

        } else if(match.startsWith("code")) {

          actual_content = match.slice(5, -2).trim();
          if(actual_content.startsWith("\n")) {
            actual_content = actual_content.slice(1);
          }
          actual_content = "```python\n" + actual_content + "\n```"
          divider_type = TextDividerTypes.BLOCK_CODE;

        } else if(match.startsWith("img")) {
          actual_content = match.slice(4, -2).trim();
          divider_type = TextDividerTypes.IMAGE;

        } else if(match.startsWith("glossary")) {

          actual_content = match.slice(9, -2).trim();
          divider_type = TextDividerTypes.GLOSSARY;

          var content_split = actual_content.split('|')
          if(content_split.length > 1) {
            actual_content = content_split[0].trim();
            optional = content_split[1].trim();
          }
        }

        this.text_dividers.push([actual_content, optional, divider_type]);
      }
    }
  }

  getTextSlice(index: number): string {
    if(index < this.text_slices.length) {
      return this.text_slices[index];
    }
    return "error";
  }

  getTextDivider(index: number): [string, string | undefined, TextDividerTypes] {
    if(index < this.text_dividers.length) {
      console.log(this.text_dividers[index])
      return this.text_dividers[index];
    }
    return ["error", undefined, TextDividerTypes.NONE];
  }

  getTextDividers(): Array<[string, string | undefined, TextDividerTypes]> {
    return this.text_dividers;
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
