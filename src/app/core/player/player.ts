import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerService } from '../../services/playerservice';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './player.html',
  styleUrls: ['./player.css'],
})
export class PlayerComponent {
  expanded = signal(false);

  constructor(public player: PlayerService) {}

  toggleExpand() {
    if (!this.player.currentTrack()) return;
    this.expanded.update(v => !v);
  }

  onSeek(event: Event) {
    const input = event.target as HTMLInputElement;
    this.player.seek(parseFloat(input.value));
  }

  onVolume(event: Event) {
    const input = event.target as HTMLInputElement;
    this.player.setVolume(parseInt(input.value, 10));
  }
}