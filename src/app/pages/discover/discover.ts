import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MediaService, Track } from '../../services/media.service';
import { PlayerService } from '../../services/playerservice';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';

interface Genre {
  id: number;
  name: string;
}

@Component({
  selector: 'app-discover',
  imports: [CommonModule, RouterLink],
  templateUrl: './discover.html',
  styleUrl: './discover.css',
})
export class Discover implements OnInit {
  trendingTracks: Track[] = [];
  mostViewed: Track[] = [];
  recentTracks: Track[] = [];
  genres: Genre[] = [];
  genreTracks: Track[] = [];
  selectedGenre: Genre | null = null;
  isLoggedIn = false;
  suggestedArtists: any[] = [];

  constructor(
    private mediaService: MediaService,
    public player: PlayerService,
    private auth: AuthService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.auth.loggedIn$.subscribe(status => this.isLoggedIn = status);
    this.loadAll();
  }

  loadAll() {
    this.http.get<Track[]>('http://localhost:3000/api/media/public/trending-week').subscribe({
      next: (tracks) => {
        this.trendingTracks = tracks.map(t => ({
          ...t,
          coverUrl: t.cover_image ? `http://localhost:3000/uploads/images/${t.cover_image}` : undefined
        }));
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Trending error:', err)
    });

    this.http.get<Track[]>('http://localhost:3000/api/media/public/most-viewed').subscribe({
      next: (tracks) => {
        this.mostViewed = tracks.map(t => ({
          ...t,
          coverUrl: t.cover_image ? `http://localhost:3000/uploads/images/${t.cover_image}` : undefined
        }));
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Most viewed error:', err)
    });

    this.http.get<Track[]>('http://localhost:3000/api/media/public/recent').subscribe({
      next: (tracks) => {
        this.recentTracks = tracks.map(t => ({
          ...t,
          coverUrl: t.cover_image ? `http://localhost:3000/uploads/images/${t.cover_image}` : undefined
        }));
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Recent error:', err)
    });

    this.http.get<Genre[]>('http://localhost:3000/api/genres').subscribe({
      next: (genres) => { this.genres = genres; this.cdr.markForCheck(); },
      error: (err) => console.error('Genres error:', err)
    });
  }

  selectGenre(genre: Genre) {
    if (this.selectedGenre?.id === genre.id) {
      this.selectedGenre = null;
      this.genreTracks = [];
      return;
    }
    this.selectedGenre = genre;
    this.http.get<Track[]>(`http://localhost:3000/api/media/public/genre/${genre.id}`).subscribe({
      next: (tracks) => {
        this.genreTracks = tracks.map(t => ({
          ...t,
          coverUrl: t.cover_image
            ? `http://localhost:3000/uploads/images/${t.cover_image}`
            : undefined
        }));
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Genre tracks error:', err)
    });
  }
}
