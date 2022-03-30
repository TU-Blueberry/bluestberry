import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'toGlossaryName'
})

// remove .md ending from glossary files, transform first letter of name to uppercase
export class GlossaryPipe implements PipeTransform {
    transform(name: string): string {
        const str = name.split(".md");
        str.pop();
        const converted = str.join("").toLowerCase();
        return converted.charAt(0).toUpperCase() + converted.slice(1);
    }
}