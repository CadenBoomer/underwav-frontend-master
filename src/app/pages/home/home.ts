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

  constructor(
    public player: PlayerService,
    private auth: AuthService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.auth.loggedIn$.subscribe(status => {
      this.isLoggedIn = status;
      if (status) this.loadAll();
    });
  }

  loadAll() {
    // Tracks from followed users
    this.http.get<Track[]>(
      'http://localhost:3000/api/media/followed',
      this.auth.getAuthHeaders()
    ).subscribe({
      next: (tracks) => { this.followedTracks = tracks; this.cdr.markForCheck(); },
      error: (err) => console.error('Followed tracks error:', err)
    });

    // Genre mix based on user's own uploads
    this.http.get<Track[]>(
      'http://localhost:3000/api/media/genre-mix',
      this.auth.getAuthHeaders()
    ).subscribe({
      next: (tracks) => { this.genreMix = tracks; this.cdr.markForCheck(); },
      error: (err) => console.error('Genre mix error:', err)
    });

    this.http.get<any[]>(
      'http://localhost:3000/api/auth/suggested-artists',
      this.auth.getAuthHeaders()
    ).subscribe({
      next: (artists) => { this.suggestedArtists = artists; this.cdr.markForCheck(); },
      error: (err) => console.error('Suggested artists error:', err)
    });
  }

  }