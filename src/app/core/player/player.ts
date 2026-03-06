import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerService } from '../../services/playerservice';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player.html',
  styleUrls: ['./player.css'],
})
export class PlayerComponent {
  constructor(public player: PlayerService) {}

  onSeek(event: Event) {
    const input = event.target as HTMLInputElement;
    this.player.seek(parseFloat(input.value));
  }

  onVolume(event: Event) {
    const input = event.target as HTMLInputElement;
    this.player.setVolume(parseInt(input.value, 10));
  }
}