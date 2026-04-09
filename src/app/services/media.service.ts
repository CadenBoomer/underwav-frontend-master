import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AuthService } from './auth.service';


// This is the central Track interface that gets exported and used across all your components.
//  Only id, title, and filename are required — everything else is optional with ?. 
// Notice it's exported (export interface) so other files can import it. This is why you see import { Track } 
// from '../../services/media.service' in almost every component.
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

// Defines what the backend returns when fetching paginated tracks — the 
// array of tracks plus pagination metadata. Used in getRecentlyUploaded() and the dashboard.
export interface PaginatedTracks {
  tracks: Track[];
  total: number;
  page: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class MediaService {
  private apiBase = 'http://localhost:3000/api';

  constructor(private http: HttpClient, private auth: AuthService) { }


//   .pipe() and map(). Instead of subscribing and processing the data in a callback, this processes it in the service 
// before it even reaches the component.
// .pipe() — lets you chain RxJS operators onto an observable
// map() — transforms the data as it flows through. Here it spreads the response with ...res and rebuilds the tracks 
// array with cover URLs already built
// So by the time the component receives the data, cover URLs are already set — the component doesn't need to do the 
// mapping itself. This is cleaner than what the discover and home components do directly in their HTTP calls.

  getRecentlyUploaded(page: number = 1): Observable<PaginatedTracks> {
    return this.http.get<PaginatedTracks>(
      `${this.apiBase}/media?page=${page}`,
      this.auth.getAuthHeaders()
    ).pipe(
      map(res => ({
        ...res,
        tracks: res.tracks.map(track => ({
          ...track,
          coverUrl: track.cover_image
            ? `http://localhost:3000/uploads/images/${track.cover_image}`
            : undefined
        }))
      }))
    );
  }

  // All follow the same .pipe(map(...)) pattern — fetch data, build cover URLs in the service, 
  // return the transformed observable. The public ones have no auth headers since they don't require login.
  getLikedTracks(): Observable<Track[]> {
    return this.http.get<Track[]>(`${this.apiBase}/profile/likes`, this.auth.getAuthHeaders())
      .pipe(
        map((tracks: Track[]) =>
          tracks.map(track => ({
            ...track,
            coverUrl: track.cover_image
              ? `http://localhost:3000/uploads/images/${track.cover_image}`
              : null
          }))
        )
      );
  }

  getGenres(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/genres`, this.auth.getAuthHeaders());
  }

  // No auth headers needed for these
  getRecentPublic(): Observable<Track[]> {
    return this.http.get<Track[]>(`${this.apiBase}/media/public/recent`).pipe(
      map(tracks => tracks.map(track => ({
        ...track,
        coverUrl: track.cover_image
          ? `http://localhost:3000/uploads/images/${track.cover_image}`
          : undefined
      })))
    );
  }

  getTrendingThisWeek(): Observable<Track[]> {
    return this.http.get<Track[]>(`${this.apiBase}/media/public/trending-week`).pipe(
      map(tracks => tracks.map(track => ({
        ...track,
        coverUrl: track.cover_image
          ? `http://localhost:3000/uploads/images/${track.cover_image}`
          : undefined
      })))
    );
  }

  getMostViewed(): Observable<Track[]> {
    return this.http.get<Track[]>(`${this.apiBase}/media/public/most-viewed`).pipe(
      map(tracks => tracks.map(track => ({
        ...track,
        coverUrl: track.cover_image
          ? `http://localhost:3000/uploads/images/${track.cover_image}`
          : undefined
      })))
    );
  }
}