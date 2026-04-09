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
  isLoggedIn: boolean = false;          //Tracks whether the user is logged in. Starts as false
  searchQuery: string = '';         // Bound to the search input via [(ngModel)]. Whatever the user types lives here.

  searchTracks: Track[] = [];       //Arrays that hold the search results returned from the backend. The HTML loops over these to render the dropdown.
  searchArtists: any[] = [];
  showResults: boolean = false;     //Controls whether the search dropdown is visible.

  private searchSubject = new Subject<string>();   //A private RxJS Subject — think of it as a pipe. Every time the user types, you push the query into this pipe, and the pipe handles debouncing before calling the API.



  //Angular's dependency injection — 
  // Angular automatically provides these services. Now you can use this.router, this.auth etc.
  constructor(
    private router: Router,
    private auth: AuthService,
    private http: HttpClient,
    private player: PlayerService
  ) { }

  //This runs once, right after the component loads.
  ngOnInit() {

    // Subscribes to your AuthService's loggedIn$ observable. 
    // Whenever login state changes anywhere in the app, this updates isLoggedIn automatically, which instantly shows/hides the right nav links.
    this.auth.loggedIn$.subscribe(status => {
      this.isLoggedIn = status;
    });

    //Sets up the smart search pipeline:
    // User types → onSearch() pushes to searchSubject
    // debounceTime(300) — waits until they pause for 300ms
    // distinctUntilChanged() — ignores if query didn't actually change
    // If the query is less than 2 characters, clear results and stop
    // Otherwise, call runSearch(query)

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


  //Called on every keystroke ((input)="onSearch()"). 
  // Just pushes the current searchQuery into the subject pipe — the pipe handles all the debouncing logic.

  onSearch() {
    this.searchSubject.next(this.searchQuery);
  }


  //Makes a GET request to your backend search endpoint. 
  // encodeURIComponent safely encodes special characters in the query (e.g. spaces become %20).

  runSearch(query: string) {
    this.http.get<any>(`http://localhost:3000/api/search?q=${encodeURIComponent(query)}`)
      .subscribe({

  //On success, maps over the returned tracks. The ...t spreads all existing track properties, 
    // then adds/overrides coverUrl by building the full image URL from just the filename the backend returns. If there's no cover image, it's undefined.
        next: (res) => {
          this.searchTracks = res.tracks.map((t: any) => ({
            ...t, //Spread operator. "For each track t from the backend, copy ALL of its existing fields into a new object, and then also add a coverUrl field."
            coverUrl: t.cover_image
              ? `http://localhost:3000/uploads/images/${t.cover_image}`
              : undefined
          }));

          //Same idea for artists. The extra check — a.avatar.startsWith('http') — 
          // handles cases where the avatar might already be a full URL (like a Google profile picture) vs. just a filename stored locally.
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


// This function takes two arguments — the track that was clicked, and its index (position number) in the search results list.
// this.player.setQueue(this.searchTracks, index) — instead of just playing the one track you clicked, it loads the entire search results list as a playlist queue, and starts playing from whichever position you clicked. So if you clicked the 3rd result, index is 2 (arrays start at 0), and the player starts there but you can still skip forward/back through the other results.
// this.showResults = false — closes the dropdown.
// this.searchQuery = '' — wipes the search box back to empty.
  playTrack(track: Track, index: number) {
    this.player.setQueue(this.searchTracks, index);
    this.showResults = false;
    this.searchQuery = '';
  }

  //When an artist is clicked, navigates to their profile page, then cleans up the search UI.
  goToProfile(userId: number) {
    this.router.navigate(['/profile', userId]);
    this.showResults = false;
    this.searchQuery = '';
  }

// called when the search input loses focus (you click away from it).
// The problem it solves: when you click a search result, two things happen almost simultaneously —
// The input loses focus → hideResults() fires
// Your click on the result registers
// If you just did this.showResults = false instantly, the dropdown would disappear before your click on the result had a chance to register, so nothing would happen — the track would never play.
// The setTimeout(..., 150) adds a 150ms delay before hiding, which gives your click just enough time to go through first. That's also why the results use (mousedown) instead of (click) in the HTML — mousedown fires slightly earlier than click, which also helps make sure the action registers before the blur closes everything.

// Essentially leaves enough time for the track to play instead of dropwdown closing too quick from search bar.
  hideResults() {
    setTimeout(() => this.showResults = false, 150);
  }


  //Delegates to AuthService to handle the actual logout logic.
  logout() {
    this.auth.logout();
  }


  //Just a debug helper — logs which nav link was clicked to the browser console.
  linkClicked(path: string) {
    console.log('header link click:', path);
  }
}