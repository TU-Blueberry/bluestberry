import { Component, OnInit } from '@angular/core';

interface Icons {
  path: string, 
  name: string, 
  url: string
}

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
// TODO: Kann man ggf. mit file-icons component zusammenlegen
export class AboutComponent implements OnInit {
  icons: Icons[] = [
    { path: 'dictionary', name: 'Freepik', url: 'https://www.freepik.com'},
    { path: 'experiment', name: 'Prosymbols', url: 'https://www.flaticon.com/authors/prosymbols'},
    { path: 'industrial-robot', name: 'Freepik', url: 'https://www.freepik.com'},
    { path: 'lightbulb', name: 'Good Ware', url: 'https://www.flaticon.com/authors/good-ware'},
    { path: 'picture', name: 'Good Ware', url: 'https://www.flaticon.com/authors/good-ware'},
    { path: 'plaintext', name: 'Freepik', url: 'https://www.freepik.com'},
    { path: 'table', name: 'Flat Icons', url: 'https://www.flaticon.com/authors/flat-icons'},
    { path: 'unknown_file', name: 'berkahicon', url: 'https://www.flaticon.com/authors/berkahicon'},
    { path: 'mortarboard', name: 'blended-learning', url: 'https://www.flaticon.com/free-icons/blended-learning'},
    { path: 'line-chart', name: 'Freepik', url: 'https://www.flaticon.com/free-icons/chart'}
  ]

  constructor() { }

  ngOnInit(): void {
  }
}
