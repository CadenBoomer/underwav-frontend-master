import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Track } from '../../services/media.service';
import { PlayerService } from '../../services/playerservice';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';


// This is a locally defined TypeScript interface — just for this file. It defines what a genre object looks like. 
// Simple — just an id number and a name string. 
// This is why you can write genre.id and genre.name confidently throughout the component.

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


// implements OnInit is just TypeScript's way of saying "this class promises to have an ngOnInit() method."
// You're telling TypeScript "I guarantee this class will have an ngOnInit() function." If you forgot to actually 
// write the ngOnInit() method, TypeScript would throw an error to remind you.
// In practice it doesn't change how the code runs — Angular will call ngOnInit() 
// automatically when the component loads whether you have implements OnInit or not. 
// It's more of a safety net so TypeScript can catch mistakes early.
// You'll notice the player component doesn't have implements OnInit because it doesn't use ngOnInit() at all.
export class Discover implements OnInit {

  //  genres holds all the available genre pills
  // genreTracks holds tracks for whichever genre is currently selected
  // selectedGenre: Genre | null = null — the | null means this can either be a Genre object OR null. Starts 
  // as null meaning no genre is selected yet
  // suggestedArtists is declared but not actually used in this component — likely leftover from an earlier version

  trendingTracks: Track[] = [];
  mostViewed: Track[] = [];
  recentTracks: Track[] = [];
  genres: Genre[] = [];
  genreTracks: Track[] = [];
  selectedGenre: Genre | null = null;
  isLoggedIn = false;


  //   player is public because the HTML directly calls player.setQueue()
  // auth is private — only used to check login status
  // http is private — only used internally for API calls
  // cdr is private — only used internally to trigger UI updates

  constructor(
    public player: PlayerService,
    private auth: AuthService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) { }

  // Two differences from the home component here. First, it calls loadAll() immediately regardless of login status
  //  — because the discover page is public, anyone can see it. 
  // Second, the subscribe is written on one line as a shorthand since it's just setting one variable.
  ngOnInit() {
    this.auth.loggedIn$.subscribe(status => this.isLoggedIn = status);
    this.loadAll();
  }

  // Four API calls all firing at the same time 
  // — same pattern as home but hitting public endpoints this time, so no auth headers needed.

  //   Notice the URL has /public/ in it — these endpoints don't require a login token so anyone 
  // visiting the discover page gets the data.
  // All three track calls follow the exact same pattern you've seen before — fetch, map over results to 
  // build cover URLs with ...t, then cdr.markForCheck().
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


  // First it checks if you clicked the genre that's already selected. The ?. is optional chaining — 
  // if selectedGenre is null it won't crash, it just returns undefined which won't equal genre.id. 
  // If you DID click the same genre again, it deselects it by setting selectedGenre back to null 
  // and clearing genreTracks, then returns early so the rest of the function doesn't run.
  selectGenre(genre: Genre) {
    if (this.selectedGenre?.id === genre.id) {
      this.selectedGenre = null;
      this.genreTracks = [];
      return;
    }

    // If it's a NEW genre being selected, set it as selected and fetch its tracks. 
    // The genre id is embedded directly in the URL using a template literal so the backend knows
    //  which genre's tracks to return.
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
