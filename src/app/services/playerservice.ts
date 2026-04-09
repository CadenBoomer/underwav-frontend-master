import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// You'll notice PlayerService defines its own Track interface that's almost identical to the one in MediaService. 
// This is a minor inconsistency — ideally you'd just import from media.service in one place. Not a bug, just slightly 
// redundant.

export interface Track {
  id: number;
  user_id?: number;
  title: string;
  filename: string;
  artist?: string;
  username?: string;
  coverUrl?: string | null;
  cover_image?: string | null;
  description?: string;  // add
  lyrics?: string;        // add
  genre_id?: number;
  views?: number;
  comment_count?: number;
  likes_count?: number;
  is_public?: number;
  genres?: { id: number; name: string }[];
}

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private audio = new Audio();

  // All the player state is stored as signals. You've seen these used in the player component HTML 
  // — player.isPlaying(), player.volume() etc. Signals automatically update the UI when their value changes, 
  // which is why the play button and progress bar always stay in sync with what's actually playing.

  currentTrack = signal<Track | null>(null);
  isPlaying = signal(false);
  volume = signal(100);
  currentTime = signal(0);
  duration = signal(0);
  isShuffled = signal(false);
  repeatMode = signal<'none' | 'one' | 'all'>('none');

  // Queue for skip forward/back
  // queue is a regular private array — it doesn't need to be a signal since the HTML never directly displays it. 
  // queueIndex is a signal because it affects which track is shown as current.
  private queue: Track[] = [];
  private queueIndex = signal(0);

  constructor() {
    //  Sets up event listeners on the native Audio object. These are browser events — not Angular events:
    // timeupdate — fires constantly as the track plays, updates currentTime signal so the progress bar moves
    // loadedmetadata — fires once the audio file loads enough to know its duration, sets duration signal
    // ended — fires when track finishes, calls handleTrackEnd()
    // play / pause — keep isPlaying signal in sync with actual audio state
    this.audio.volume = 1;

    this.audio.addEventListener('timeupdate', () => {
      this.currentTime.set(this.audio.currentTime);
    });

    this.audio.addEventListener('loadedmetadata', () => {
      this.duration.set(this.audio.duration);
    });

    this.audio.addEventListener('ended', () => {
      this.handleTrackEnd();
    });

    this.audio.addEventListener('play', () => this.isPlaying.set(true));
    this.audio.addEventListener('pause', () => this.isPlaying.set(false));
  }


//   First checks if the clicked track is already the current one — if so just toggles play/pause instead of restarting it.
// Then builds resolvedTrack with a guaranteed coverUrl — same || fallback pattern you've seen everywhere.
// The auth token check is important — if the user is logged in, it streams via the authenticated endpoint with the token 
// in the URL. If not logged in, it uses the public stream endpoint. localStorage.getItem('token') reads the saved login 
// token from the browser's local storage.
// this.audio.load() prepares the new source, then .play() starts it. The .catch() handles cases where the browser blocks 
// autoplay.

  playTrack(track: Track) {
    // Toggle play if same track
    if (this.currentTrack()?.id === track.id) {
      this.togglePlay();
      return;
    }

    // Always resolve coverUrl before setting signal
    const resolvedTrack: Track = {
      ...track,
      coverUrl: track.coverUrl
        || (track.cover_image
          ? `http://localhost:3000/uploads/images/${track.cover_image}`
          : undefined)
    };

    this.currentTrack.set(resolvedTrack);
    const token = localStorage.getItem('token');
    this.audio.src = token
      ? `http://localhost:3000/api/media/${resolvedTrack.id}/stream?token=${token}`
      : `http://localhost:3000/api/media/${resolvedTrack.id}/stream/public`;
    this.audio.load();
    this.audio.play().catch(err => console.warn('Playback error:', err));
  }

  // Stores the full list as the queue, sets the starting position, and plays the track at that index.
  //  This is what every component calls when you click a track — it's the main entry point for playback.
  setQueue(tracks: Track[], startIndex = 0) {
    this.queue = tracks;
    this.queueIndex.set(startIndex);
    this.playTrack(tracks[startIndex]);
  }

  togglePlay() {
    if (this.audio.paused) {
      this.audio.play().catch(err => console.warn('Playback error:', err));
    } else {
      this.audio.pause();
    }
  }

//   Three cases:
// Shuffle is on → pick a random index
// Reached the end of the queue → if repeat all, wrap to 0, otherwise stay on last track
// Normal → just increment index

  skipNext() {
    if (!this.queue.length) return;
    let next = this.queueIndex() + 1;
    if (this.isShuffled()) {
      next = Math.floor(Math.random() * this.queue.length);
    } else if (next >= this.queue.length) {
      next = this.repeatMode() === 'all' ? 0 : this.queue.length - 1;
    }
    this.queueIndex.set(next);
    this.playTrack(this.queue[next]);
  }

  // The 3 second check is a nice UX detail — if you're more than 3 seconds into a track and hit prev, 
  // it restarts the current track instead of going to the previous one. Same behaviour as Spotify. If you're within 
  // the first 3 seconds it actually goes back.
  skipPrev() {
    if (!this.queue.length) return;
    // If more than 3s in, restart current track
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }
    let prev = this.queueIndex() - 1;
    if (prev < 0) prev = this.repeatMode() === 'all' ? this.queue.length - 1 : 0;
    this.queueIndex.set(prev);
    this.playTrack(this.queue[prev]);
  }

  seek(seconds: number) {
    this.audio.currentTime = seconds;
  }

  setVolume(value: number) {
    this.volume.set(value);
    this.audio.volume = value / 100;
  }

  toggleShuffle() {
    this.isShuffled.update(v => !v);
  }

  // Cycles through the three modes in order. indexOf finds the current mode's position in the array, adds 1, 
  // and % modes.length wraps back to 0 after the last mode. So it goes none → one → all → none → ...
  toggleRepeat() {
    const modes: Array<'none' | 'one' | 'all'> = ['none', 'one', 'all'];
    const next = (modes.indexOf(this.repeatMode()) + 1) % modes.length;
    this.repeatMode.set(modes[next]);
  }

  // private because it's only called internally from the ended event listener. 
  // If repeat one is on, restarts the same track. Otherwise skips to next which handles all/none repeat logic itself.
  private handleTrackEnd() {
    if (this.repeatMode() === 'one') {
      this.audio.currentTime = 0;
      this.audio.play();
    } else {
      this.skipNext();
    }
  }

  // Converts raw seconds into a readable time string. Math.floor(seconds / 60) gets the minutes. 
  // seconds % 60 gets the remaining seconds, .toString().padStart(2, '0') adds a leading zero so 5 becomes 
  // '05'. So 185 seconds becomes '3:05'. isNaN check handles the case where duration hasn't loaded yet.
  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

}