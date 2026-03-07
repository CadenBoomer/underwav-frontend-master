import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Track {
  id: number;
  user_id?: number;
  title: string;
  filename: string;
  artist?: string;
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

  currentTrack = signal<Track | null>(null);
  isPlaying = signal(false);
  volume = signal(100);
  currentTime = signal(0);
  duration = signal(0);
  isShuffled = signal(false);
  repeatMode = signal<'none' | 'one' | 'all'>('none');

  // Queue for skip forward/back
  private queue: Track[] = [];
  private queueIndex = signal(0);

  constructor() {
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

  toggleRepeat() {
    const modes: Array<'none' | 'one' | 'all'> = ['none', 'one', 'all'];
    const next = (modes.indexOf(this.repeatMode()) + 1) % modes.length;
    this.repeatMode.set(modes[next]);
  }

  private handleTrackEnd() {
    if (this.repeatMode() === 'one') {
      this.audio.currentTime = 0;
      this.audio.play();
    } else {
      this.skipNext();
    }
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

}