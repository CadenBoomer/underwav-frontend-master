import { Component } from '@angular/core';
import { Input } from '@angular/core';

@Component({
  selector: 'app-track-card',
  standalone: true,
  imports: [],
  templateUrl: './track-card.html',
  styleUrl: './track-card.css',
})
export class TrackCard {
  @Input() track: any; // for passing data from Feed later
}
