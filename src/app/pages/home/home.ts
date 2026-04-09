// New one here — ChangeDetectorRef. Angular doesn't always automatically know when data has changed and needs to re-render the UI. 
// ChangeDetectorRef lets you manually tell Angular "hey, something changed, go update the screen."
// Had to refresh pages such as profile to load in data. 

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PlayerService } from '../../services/playerservice';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { Track } from '../../services/media.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  followedTracks: Track[] = [];
  genreMix: Track[] = [];
  suggestedArtists: any[] = [];
  isLoggedIn = false;


  //   player is public because the HTML directly calls player.currentTrack(), player.setQueue() etc.
  // auth is private — only used internally to check login state and get auth headers
  // http is private — only used internally to make API calls
  // cdr is private — only used internally to trigger UI updates

  constructor(
    public player: PlayerService,
    private auth: AuthService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) { }

  // Subscribes to the login state. When the user is logged in 
  // (status is true), it calls loadAll() to fetch all the data. If they're not logged in, nothing gets loaded.
  ngOnInit() {
    this.auth.loggedIn$.subscribe(status => {
      this.isLoggedIn = status;
      if (status) this.loadAll();
    });
  }

  //This makes three separate API calls at the same time — one for each section of the home page.
  // All three HTTP calls happen at the same time — Angular doesn't wait for the first one to finish before 
  // starting the second. 
  // They all fire off simultaneously and each one updates its own array when it comes back.
  
  
  loadAll() {
    // http.get<Track[]> — the <Track[]> tells TypeScript "I expect this API to return an array of Track objects." 
    // This is just for type safety, it doesn't actually validate the data.
    this.http.get<Track[]>(
      'http://localhost:3000/api/media/followed',
      // this.auth.getAuthHeaders() — sends the user's login token so the 
      // backend knows who is making the request and can return THEIR followed artists' tracks specifically
      this.auth.getAuthHeaders()
    ).subscribe({
      next: (tracks) => {
        // The .map() loops over every track and builds the full cover image URL from just the filename, 
        // same ...t spread pattern 
        this.followedTracks = tracks.map(t => ({
          ...t,
          coverUrl: t.cover_image ? `http://localhost:3000/uploads/images/${t.cover_image}` : undefined
        }));
        // this.cdr.markForCheck() — tells Angular to re-render after the data arrives
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Followed tracks error:', err)
    });


    // The backend figures out what genres the logged in user likes based on their own uploads, then returns 
    // tracks from other users that match those genres. 
    // Personalized to that specific user.
    this.http.get<Track[]>(
      'http://localhost:3000/api/media/genre-mix',
      this.auth.getAuthHeaders()
    ).subscribe({
      next: (tracks) => {
        this.genreMix = tracks.map(t => ({
          ...t,
          coverUrl: t.cover_image ? `http://localhost:3000/uploads/images/${t.cover_image}` : undefined
        }));
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Genre mix error:', err)
    });

    // Notice this uses any[] instead of Track[] — that's because artists have a different shape of 
    // data than tracks (username, avatar, track_count etc.) and there's no specific 
    // TypeScript interface defined for artists, so any is used as a catch-all.
    this.http.get<any[]>(
      'http://localhost:3000/api/auth/suggested-artists',
      this.auth.getAuthHeaders()
    ).subscribe({
      next: (artists) => {
        this.suggestedArtists = artists.map(a => ({
          ...a,
          avatar: a.avatar ? `http://localhost:3000/uploads/images/${a.avatar}` : null
        }));
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Suggested artists error:', err)
    });
  }
}
// Returns null if no avatar instead of undefined like tracks do — 
// both mean "no value" but null is more explicit here since avatars are expected to exist for artists.