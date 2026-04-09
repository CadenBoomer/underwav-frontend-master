// signal is new Angular syntax — a signal is a reactive value, meaning when it changes, anything in the 
// template that uses it automatically updates. 
// It's Angular's modern alternative to regular variables for things that need to trigger UI updates.



import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerService } from '../../services/playerservice';     //Your music player service — handles all the actual audio logic (playing, pausing, skipping, volume, etc). The component just calls methods on it.
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './player.html',
  styleUrls: ['./player.css'],
})
export class PlayerComponent {

  // A signal that tracks whether the expanded panel is open or closed. Starts as false (closed).
  // In the template you call it like a function — expanded() — to read its value.
  expanded = signal(false);


  // public instead of private — that's intentional. 
  // Because the HTML template directly calls things like player.currentTrack(), player.isPlaying() etc., 
  // the service needs to be public so the template can access it.
  constructor(public player: PlayerService) { }


  //   First checks if there's actually a track playing — if not, it does nothing (no point expanding an empty panel)
  // this.expanded.update(v => !v) — flips the signal. If it was false it becomes true, if it was true it becomes false
  toggleExpand() {
    if (!this.player.currentTrack()) return;
    this.expanded.update(v => !v);
  }

  //For song progress bar
  //   event.target is the range input element that was dragged
  // as HTMLInputElement — TypeScript doesn't automatically know what type event.target is, so you tell it explicitly
  // parseFloat(input.value) — converts the string value from the input into a decimal number (e.g. "45.3" → 45.3)
  // Passes that number to player.seek() which jumps the audio to that position in seconds
  onSeek(event: Event) {
    const input = event.target as HTMLInputElement;
    this.player.seek(parseFloat(input.value));
  }


  // Same idea as onSeek but for the volume slider. parseInt(..., 10) converts to a whole number 
  // (volume doesn't need decimals). The 10 is the radix — it just means parse as base-10 (normal numbers), not binary or hex.
  onVolume(event: Event) {
    const input = event.target as HTMLInputElement;
    this.player.setVolume(parseInt(input.value, 10));
  }
}