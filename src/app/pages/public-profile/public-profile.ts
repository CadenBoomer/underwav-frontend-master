import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { PlayerService } from '../../services/playerservice';
import { Track } from '../../services/media.service';
import { RouterLink } from '@angular/router';

interface PublicUser {
  id: number;
  username: string;
  avatar: string | null;
  bio: string;
  city: string;
  country: string;
  created_at: string;
}

interface Comment {
  id: number;
  content: string;
  username: string;
  created_at: string;
  likes_count: number;
  isLiked?: boolean;
  canDelete?: boolean;
}

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

  ngOnInit() {
    this.auth.loggedIn$.subscribe(status => {
      this.isLoggedIn = status;
      if (status) {
        // Get current user id for delete button check
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
  loadAll() {
    this.http.get<PublicUser>(`http://localhost:3000/api/auth/users/${this.profileId}`)
      .subscribe({
        next: (user) => { this.user = user; this.cdr.markForCheck(); },
        error: (err) => console.error('Profile error:', err)
      });

    // Check if viewing own profile
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

    this.http.get<Track[]>(`http://localhost:3000/api/media/public/user/${this.profileId}`)
      .subscribe({
        next: (tracks) => {
          this.tracks = tracks.map(t => ({
            ...t,
            isLiked: false,
            showComments: false,
            comments: [],
            newComment: '',
            coverUrl: t.cover_image
              ? `http://localhost:3000/uploads/images/${t.cover_image}`
              : undefined
          }));
          if (this.isLoggedIn) this.loadLikedStatus();
          this.cdr.markForCheck();
        },
        error: (err) => console.error('Tracks error:', err)

      });

    this.http.get<any[]>(`http://localhost:3000/api/follows/followers/${this.profileId}`)
      .subscribe({
        next: (followers) => { this.followers = followers; this.cdr.markForCheck(); },
        error: (err) => console.error('Followers error:', err)
      });

    this.http.get<any[]>(`http://localhost:3000/api/follows/following/${this.profileId}`)
      .subscribe({
        next: (following) => { this.following = following; this.cdr.markForCheck(); },
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

  toggleComments(track: LikeableTrack) {
    track.showComments = !track.showComments;
    if (track.showComments && (!track.comments || track.comments.length === 0)) {
      this.loadComments(track);
    }
    this.cdr.markForCheck();
  }

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

          // Load liked status if logged in
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
    track.newComment = ''; // clear immediately to prevent double submit

    this.http.post(
      `http://localhost:3000/api/comments/${track.id}`,
      { content },
      this.auth.getAuthHeaders()
    ).subscribe({
      next: () => {
        track.comment_count = (track.comment_count || 0) + 1;
        this.loadComments(track); // reload once
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

  setTab(tab: 'tracks' | 'liked' | 'followers' | 'following') {
    this.activeTab = tab;
  }
}