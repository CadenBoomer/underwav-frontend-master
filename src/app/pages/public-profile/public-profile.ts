import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { PlayerService } from '../../services/playerservice';
import { Track } from '../../services/media.service';
import { RouterLink } from '@angular/router';

// Defines what a public user profile looks like. The ? on some fields means they're optional — 
// the backend might not always return them. string | null means they can be a string or explicitly null.
interface PublicUser {
  id: number;
  username: string;
  avatar: string | null;
  bio: string;
  city: string;
  country: string;
  created_at: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
}

// Defines a comment object. isLiked and canDelete are optional because they're added on 
// the frontend after the data comes back — they don't come from the backend directly.
interface Comment {
  id: number;
  content: string;
  username: string;
  created_at: string;
  likes_count: number;
  isLiked?: boolean;
  canDelete?: boolean;
}

// extends Track means it has everything a regular Track has PLUS these extra optional fields.
// This is TypeScript inheritance — you're building on top of an existing interface rather than rewriting it.
// The extra fields are all frontend-only state that doesn't come from the backend.
interface LikeableTrack extends Track {
  isLiked?: boolean;
  showComments?: boolean;
  comments?: Comment[];
  newComment?: string;
}

@Component({
  selector: 'app-public-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './public-profile.html',
  styleUrl: './public-profile.css',
})
export class PublicProfile implements OnInit {
  // user starts as null — the HTML uses *ngIf="user" to wait until it's loaded
  // isOwnProfile — used to hide the follow button when viewing your own profile
  // activeTab is the same union type pattern as the profile component
  // profileId — the ID from the URL params of whose profile you're viewing
  // currentUserId — the logged in user's own ID, used to check if you can delete comments
  user: PublicUser | null = null;
  tracks: LikeableTrack[] = [];
  followers: any[] = [];
  following: any[] = [];
  likedTracks: Track[] = [];
  isFollowing = false;
  isLoggedIn = false;
  isOwnProfile = false;
  activeTab: 'tracks' | 'liked' | 'followers' | 'following' = 'tracks';
  profileId: number = 0;
  currentUserId: number = 0;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private auth: AuthService,
    public player: PlayerService,
    private cdr: ChangeDetectorRef
  ) { }

  // Two subscriptions here. First gets the logged in user's ID so you know who YOU are. Second uses ActivatedRoute 
  // — this.route.params is an observable of the URL parameters. When the URL is /profile/42, params['id'] is '42' as a 
  // string, so parseInt converts it to the number 42. Then loadAll() is called every time the URL param changes — 
  // so navigating from one profile to another re-runs everything automatically.
  ngOnInit() {
    this.auth.loggedIn$.subscribe(status => {
      this.isLoggedIn = status;
      if (status) {
        this.auth.getProfile().subscribe({
          next: (profile: any) => { this.currentUserId = profile.id; },
          error: () => { }
        });
      }
    });

    this.route.params.subscribe(params => {
      this.profileId = parseInt(params['id']);
      this.loadAll();
    });
  }

  // Load tracks inside user subscribe so this.user.username is guaranteed
  // Tracks are loaded nested inside the user call — same reasoning as profile component's nested
  // followers call. You need this.user.username to be available when building the tracks array so you can 
  // set username: this.user?.username on each track.
  loadAll() {
    this.http.get<PublicUser>(`http://localhost:3000/api/auth/users/${this.profileId}`)
      .subscribe({
        next: (user) => {
          this.user = {
            ...user,
            avatar: user.avatar
              ? user.avatar.startsWith('http')
                ? user.avatar
                : `http://localhost:3000/uploads/images/${user.avatar}`
              : null
          };

          // Load tracks INSIDE user subscribe
          this.http.get<Track[]>(`http://localhost:3000/api/media/public/user/${this.profileId}`)
            .subscribe({
              next: (tracks) => {
                this.tracks = tracks.map(t => ({
                  ...t,
                  isLiked: false,
                  showComments: false,
                  comments: [],
                  newComment: '',
                  username: this.user?.username,
                  coverUrl: t.cover_image
                    ? `http://localhost:3000/uploads/images/${t.cover_image}`
                    : undefined
                }));
                // Inside the tracks subscribe — only loads liked status if the user is logged in, since liking requires auth.
                this.auth.loggedIn$.subscribe(status => {
                  if (status) this.loadLikedStatus();
                });
                this.cdr.markForCheck();
              },
              error: (err) => console.error('Tracks error:', err)
            });

          this.cdr.markForCheck();
        },
        error: (err) => console.error('Profile error:', err)
      });

    // Check if viewing own profile
    // Checks if the profile you're viewing is your own by comparing profile.id 
    // (your ID) to this.profileId (the URL ID). If they match, isOwnProfile is true and the follow button hides.
    if (this.isLoggedIn) {
      this.auth.getProfile().subscribe({
        next: (profile: any) => {
          this.currentUserId = profile.id;
          this.isOwnProfile = profile.id === this.profileId;
          this.cdr.markForCheck();
        },
        error: () => { }
      });
    }

    this.http.get<any[]>(`http://localhost:3000/api/follows/followers/${this.profileId}`)
      .subscribe({
        next: (followers) => {
          this.followers = followers.map(f => ({
            ...f,
            avatar: f.avatar
              ? f.avatar.startsWith('http') ? f.avatar : `http://localhost:3000/uploads/images/${f.avatar}`
              : null
          }));
          this.cdr.markForCheck();
        },
        error: (err) => console.error('Followers error:', err)
      });

    this.http.get<any[]>(`http://localhost:3000/api/follows/following/${this.profileId}`)
      .subscribe({
        next: (following) => {
          this.following = following.map(f => ({
            ...f,
            avatar: f.avatar
              ? f.avatar.startsWith('http') ? f.avatar : `http://localhost:3000/uploads/images/${f.avatar}`
              : null
          }));
          this.cdr.markForCheck();
        },
        error: (err) => console.error('Following error:', err)
      });

    if (this.isLoggedIn) {
      this.http.get<any>(
        `http://localhost:3000/api/auth/users/${this.profileId}/following-status`,
        this.auth.getAuthHeaders()
      ).subscribe({
        next: (res) => { this.isFollowing = res.isFollowing; this.cdr.markForCheck(); },
        error: (err) => console.error('Following status error:', err)
      });
    }

    if (this.isLoggedIn) {
      this.http.get<any[]>(
        'http://localhost:3000/api/follows/following',
        this.auth.getAuthHeaders()
      ).subscribe({
        next: (myFollowing) => {
          const followingIds = new Set(myFollowing.map(f => f.id));
          this.followers = this.followers.map(f => ({ ...f, isFollowing: followingIds.has(f.id) }));
          this.following = this.following.map(f => ({ ...f, isFollowing: followingIds.has(f.id) }));
          this.cdr.markForCheck();
        },
        error: () => { }
      });
    }
  }

  // Same Set pattern you've seen for comments and followers — gets all tracks the logged in 
  // user has liked, builds a Set of their IDs, then maps over the displayed tracks to set isLiked on each one.
  loadLikedStatus() {
    this.http.get<any[]>(
      'http://localhost:3000/api/media/profile/likes',
      this.auth.getAuthHeaders()
    ).subscribe({
      next: (likedTracks) => {
        const likedIds = new Set(likedTracks.map(t => t.id));
        this.tracks = this.tracks.map(t => ({ ...t, isLiked: likedIds.has(t.id) }));
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Liked status error:', err)
    });
  }

  // Guards against non-logged in users first. Same DELETE/POST pattern as 
  // comment likes and follow/unfollow — checks current state and does the opposite.
  toggleLike(track: LikeableTrack) {
    if (!this.isLoggedIn) return;

    if (track.isLiked) {
      this.http.delete(
        `http://localhost:3000/api/media/${track.id}/like`,
        this.auth.getAuthHeaders()
      ).subscribe({
        next: (res: any) => {
          track.isLiked = false;
          track.likes_count = res.likesCount;
          this.cdr.markForCheck();
        },
        error: (err) => console.error('Unlike error:', err)
      });
    } else {
      this.http.post(
        `http://localhost:3000/api/media/${track.id}/like`,
        {},
        this.auth.getAuthHeaders()
      ).subscribe({
        next: (res: any) => {
          track.isLiked = true;
          track.likes_count = res.likesCount;
          this.cdr.markForCheck();
        },
        error: (err) => console.error('Like error:', err)
      });
    }
  }

  // Flips showComments on the specific track. Only loads comments if opening AND 
  // comments haven't been loaded yet — so it doesn't reload every time you toggle.
  // The state lives on the track object itself since each track has its own independent comments section.
  toggleComments(track: LikeableTrack) {
    track.showComments = !track.showComments;
    if (track.showComments && (!track.comments || track.comments.length === 0)) {
      this.loadComments(track);
    }
    this.cdr.markForCheck();
  }

  // New here — canDelete: c.user_id === this.currentUserId sets whether the current user can delete each comment.
  // If the comment's user_id matches YOUR id, canDelete is true. 
  // This is used in the HTML to show/hide the delete button per comment.
  // Rest is the same liked status pattern as the dashboard.
  loadComments(track: LikeableTrack) {
    this.http.get<any>(`http://localhost:3000/api/comments/${track.id}`)
      .subscribe({
        next: (res) => {
          const comments = res.comments.map((c: any) => ({
            ...c,
            isLiked: false,
            canDelete: c.user_id === this.currentUserId
          }));
          track.comments = comments;

          if (this.isLoggedIn && comments.length > 0) {
            const commentIds = comments.map((c: any) => c.id);
            this.http.post(
              'http://localhost:3000/api/comments/like-status',
              { commentIds },
              this.auth.getAuthHeaders()
            ).subscribe({
              next: (statusRes: any) => {
                const likedIds = new Set(statusRes.likedIds);
                track.comments = track.comments!.map(c => ({
                  ...c,
                  isLiked: likedIds.has(c.id)
                }));
                this.cdr.markForCheck();
              },
              error: () => { }
            });
          }

          this.cdr.markForCheck();
        },
        error: (err) => console.error('Comments error:', err)
      });
  }

  submitComment(track: LikeableTrack) {
    if (!track.newComment?.trim() || !this.isLoggedIn) return;

    const content = track.newComment.trim();
    track.newComment = '';

    this.http.post(
      `http://localhost:3000/api/comments/${track.id}`,
      { content },
      this.auth.getAuthHeaders()
    ).subscribe({
      next: () => {
        track.comment_count = (track.comment_count || 0) + 1;
        this.loadComments(track);
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Comment error:', err)
    });
  }

  deleteComment(track: LikeableTrack, comment: Comment) {
    if (!confirm('Delete this comment?')) return;

    this.http.delete(
      `http://localhost:3000/api/comments/${track.id}/${comment.id}`,
      this.auth.getAuthHeaders()
    ).subscribe({
      next: () => {
        track.comments = track.comments?.filter(c => c.id !== comment.id);
        track.comment_count = Math.max((track.comment_count || 1) - 1, 0);
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Delete comment error:', err)
    });
  }

  toggleCommentLike(comment: Comment) {
    if (!this.isLoggedIn) return;

    if (comment.isLiked) {
      this.http.delete(
        `http://localhost:3000/api/comments/comment/${comment.id}/like`,
        this.auth.getAuthHeaders()
      ).subscribe({
        next: (res: any) => {
          comment.isLiked = false;
          comment.likes_count = res.likesCount;
          this.cdr.markForCheck();
        },
        error: (err) => console.error('Unlike comment error:', err)
      });
    } else {
      this.http.post(
        `http://localhost:3000/api/comments/comment/${comment.id}/like`,
        {},
        this.auth.getAuthHeaders()
      ).subscribe({
        next: (res: any) => {
          comment.isLiked = true;
          comment.likes_count = res.likesCount;
          this.cdr.markForCheck();
        },
        error: (err) => console.error('Like comment error:', err)
      });
    }
  }

  toggleFollow() {
    if (!this.isLoggedIn) return;

    if (this.isFollowing) {
      this.http.delete(
        `http://localhost:3000/api/follows/unfollow/${this.profileId}`,
        this.auth.getAuthHeaders()
      ).subscribe({
        next: () => {
          this.isFollowing = false;
          this.followers = this.followers.filter(f => f.id !== this.profileId);
          this.cdr.markForCheck();
        },
        error: (err) => console.error('Unfollow error:', err)
      });
    } else {
      this.http.post(
        `http://localhost:3000/api/follows/follow/${this.profileId}`,
        {},
        this.auth.getAuthHeaders()
      ).subscribe({
        next: () => {
          this.isFollowing = true;
          this.cdr.markForCheck();
        },
        error: (err) => console.error('Follow error:', err)
      });
    }
  }

  toggleUserFollow(user: any) {
    if (!this.isLoggedIn) return;

    if (user.isFollowing) {
      this.http.delete(
        `http://localhost:3000/api/follows/unfollow/${user.id}`,
        this.auth.getAuthHeaders()
      ).subscribe({
        next: () => {
          user.isFollowing = false;
          this.cdr.markForCheck();
        },
        error: (err) => console.error('Unfollow error:', err)
      });
    } else {
      this.http.post(
        `http://localhost:3000/api/follows/follow/${user.id}`,
        {},
        this.auth.getAuthHeaders()
      ).subscribe({
        next: () => {
          user.isFollowing = true;
          this.cdr.markForCheck();
        },
        error: (err) => console.error('Follow error:', err)
      });
    }
  }

  // Simple — just sets the active tab. The union type means 
  // TypeScript will error if you pass anything other than those four strings.
  setTab(tab: 'tracks' | 'liked' | 'followers' | 'following') {
    this.activeTab = tab;
  }
}