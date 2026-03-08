import { Component, OnInit } from '@angular/core';    //OnInit (an interface that lets you run code when the component first loads).
import { RouterLink, Router, RouterLinkActive } from "@angular/router";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';       //Enables [(ngModel)] — the two-way data binding on the search input so that whatever the user types is instantly reflected in searchQuery.
import { AuthService } from '../../services/auth.service';      //Your custom service that handles login/logout state and tells the header whether the user is logged in.
import { HttpClient } from '@angular/common/http';    //Angular's built-in HTTP client — used here to call your backend search API.
import { PlayerService } from '../../services/playerservice';     //Your custom music player service — used to start playing a track when it's clicked in search results.
import { Track } from '../../services/media.service';     //The Track TypeScript interface/type — defines what a track object looks like (title, artist, coverUrl, etc).
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';


// RouterLink — makes routerLink="..." work in the HTML (clickable nav links)
// Router — lets you navigate programmatically in TypeScript (e.g. this.router.navigate(...))
// RouterLinkActive — automatically adds an active CSS class to a link when you're on that route


// RxJS tools for handling the search input smartly:

// Subject — like an event emitter you control manually
// debounceTime(300) — waits 300ms after the user stops typing before firing the search (prevents spamming the API on every keystroke)
// distinctUntilChanged — only fires if the query actually changed (so typing "a" then "a" again doesn't re-run the search)


@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, CommonModule, RouterLinkActive, FormsModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit {
  isLoggedIn: boolean = false;          //isLoggedIn: boolean = false;
  searchQuery: string = '';
  searchTracks: Track[] = [];
  searchArtists: any[] = [];
  showResults: boolean = false;

  private searchSubject = new Subject<string>();

  constructor(
    private router: Router,
    private auth: AuthService,
    private http: HttpClient,
    private player: PlayerService
  ) { }

  ngOnInit() {
    this.auth.loggedIn$.subscribe(status => {
      this.isLoggedIn = status;
    });

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      if (query.trim().length < 2) {
        this.searchTracks = [];
        this.searchArtists = [];
        return;
      }
      this.runSearch(query);
    });
  }

  onSearch() {
    this.searchSubject.next(this.searchQuery);
  }

  runSearch(query: string) {
    this.http.get<any>(`http://localhost:3000/api/search?q=${encodeURIComponent(query)}`)
      .subscribe({
        next: (res) => {
          this.searchTracks = res.tracks.map((t: any) => ({
            ...t,
            coverUrl: t.cover_image
              ? `http://localhost:3000/uploads/images/${t.cover_image}`
              : undefined
          }));
          this.searchArtists = res.artists.map((a: any) => ({
            ...a,
            avatar: a.avatar
              ? a.avatar.startsWith('http') ? a.avatar : `http://localhost:3000/uploads/images/${a.avatar}`
              : null
          }));
        },
        error: (err) => console.error('Search error:', err)
      });
  }

  playTrack(track: Track, index: number) {
    this.player.setQueue(this.searchTracks, index);
    this.showResults = false;
    this.searchQuery = '';
  }

  goToProfile(userId: number) {
    this.router.navigate(['/profile', userId]);
    this.showResults = false;
    this.searchQuery = '';
  }

  hideResults() {
    setTimeout(() => this.showResults = false, 150);
  }

  logout() {
    this.auth.logout();
  }

  linkClicked(path: string) {
    console.log('header link click:', path);
  }
}