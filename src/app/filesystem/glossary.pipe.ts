import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'toGlossaryName'
})

export class GlossaryPipe implements PipeTransform {
    transform(name: string): string {
        const str = name.split(".md");
        str.pop();
        const converted = str.join("");
        return converted.charAt(0).toUpperCase() + converted.slice(1);
    }
}