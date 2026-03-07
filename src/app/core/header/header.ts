import { Component, OnInit } from '@angular/core';
import { RouterLink, Router, RouterLinkActive } from "@angular/router";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { PlayerService } from '../../services/playerservice';
import { Track } from '../../services/media.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, CommonModule, RouterLinkActive, FormsModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit {
  isLoggedIn: boolean = false;
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