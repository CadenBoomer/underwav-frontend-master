import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AuthService } from './auth.service';

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