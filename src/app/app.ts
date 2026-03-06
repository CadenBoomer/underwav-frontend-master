import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from "./core/header/header";
import { PlayerComponent } from './core/player/player';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Header, PlayerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})

//templateUrl: Points to an external HTML file (app.html)
// Angular loads that file as the component’s template
// Everything you put in app.html is what renders on the page

export class App {
  protected readonly title = signal('underwav');
}





