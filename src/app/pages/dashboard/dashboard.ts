import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MediaService, Track } from '../../services/media.service';
import { PlayerService } from '../../services/playerservice';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

interface Genre {
  id: number;
  name: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  uploads: Track[] = [];
  activeIndex = 0;
  currentPage = 1;
  totalPages = 1;
  totalTracks = 0;

  // Edit modal state
  editOpen = false;
  saving = false;
  editCoverFile: File | null = null;
  editCoverPreview: string | null = null;
  editCurrentGenre: Genre | null = null;
  editSelectedGenres: Genre[] = [];
  allGenres: Genre[] = [];

  editForm: {
    id: number;
    title: string;
    description: string;
    lyrics: string;
    is_public: number;
  } = { id: 0, title: '', description: '', lyrics: '', is_public: 1 };

  showComments = false;
  comments: any[] = [];
  newComment = '';

  constructor(
    private mediaService: MediaService,
    public player: PlayerService,
    private http: HttpClient,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadUploads();
    this.loadGenres();
  }

  loadGenres() {
    this.http.get<Genre[]>('http://localhost:3000/api/genres').subscribe({
      next: (genres) => { this.allGenres = genres; this.cdr.markForCheck(); },
      error: (err) => console.error('Failed to load genres:', err)
    });
  }

  loadUploads(page: number = 1) {
    this.mediaService.getRecentlyUploaded(page).subscribe({
      next: (res) => {
        this.uploads = res.tracks;
        this.totalPages = res.totalPages;
        this.currentPage = res.page;
        this.totalTracks = res.total;
        this.activeIndex = 0;
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Failed to load uploads:', err)
    });
  }

  get currentTrack(): Track {
    return this.uploads[this.activeIndex];
  }

  goToSlide(index: number) {
    this.activeIndex = index;
    this.showComments = false;
    this.comments = [];
  }

  prev() {
    this.activeIndex = this.activeIndex > 0 ? this.activeIndex - 1 : this.uploads.length - 1;
    this.showComments = false;
    this.comments = [];
  }
  next() {
    this.activeIndex = this.activeIndex < this.uploads.length - 1 ? this.activeIndex + 1 : 0;
    this.showComments = false;
    this.comments = [];
  }
  nextPage() { if (this.currentPage < this.totalPages) this.loadUploads(this.currentPage + 1); }
  prevPage() { if (this.currentPage > 1) this.loadUploads(this.currentPage - 1); }

  // Edit modal
  openEdit(track: Track) {
    this.editForm = {
      id: track.id,
      title: track.title || '',
      description: track.description || '',
      lyrics: track.lyrics || '',
      is_public: track.is_public ?? 1
    };
    this.editCoverPreview = null;
    this.editCoverFile = null;
    this.editCurrentGenre = null;
    this.editSelectedGenres = track.genres ? track.genres.map(g => ({ ...g })) : [];
    this.editOpen = true;
  }

  closeEdit() {
    this.editOpen = false;
  }

  onEditCoverChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.editCoverFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.editCoverPreview = reader.result as string;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  addEditGenre() {
    if (!this.editCurrentGenre) return;
    if (!this.editSelectedGenres.some(g => g.id === this.editCurrentGenre!.id)) {
      this.editSelectedGenres.push(this.editCurrentGenre);
    }
    this.editCurrentGenre = null;
  }

  removeEditGenre(index: number) {
    this.editSelectedGenres.splice(index, 1);
  }

  saveEdit() {
    this.saving = true;
    const formData = new FormData();
    formData.append('title', this.editForm.title);
    formData.append('description', this.editForm.description);
    formData.append('lyrics', this.editForm.lyrics);
    formData.append('is_public', this.editForm.is_public.toString());
    formData.append('genreIds', JSON.stringify(this.editSelectedGenres.map(g => g.id)));

    if (this.editCoverFile) {
      formData.append('cover', this.editCoverFile);
    }

    this.http.patch(
      `http://localhost:3000/api/media/${this.editForm.id}`,
      formData,
      this.auth.getAuthHeaders()
    ).subscribe({
      next: () => {
        this.saving = false;
        this.editOpen = false;
        // reload at current index so carousel stays on same track
        const savedIndex = this.activeIndex;
        this.loadUploads(this.currentPage);
        // restore index after load
        setTimeout(() => {
          this.activeIndex = savedIndex;
          this.cdr.markForCheck();
        }, 300);
      },
      error: (err) => {
        this.saving = false;
        console.error('Edit failed:', err);
      }
    });
  }
  deleteTrack() {
    if (!confirm(`Are you sure you want to delete "${this.editForm.title}"? This cannot be undone.`)) return;

    this.http.delete(
      `http://localhost:3000/api/media/${this.editForm.id}`,
      this.auth.getAuthHeaders()
    ).subscribe({
      next: () => {
        this.editOpen = false;
        this.activeIndex = 0;
        this.loadUploads(this.currentPage);
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Delete failed:', err)
    });
  }

  toggleComments() {
    this.showComments = !this.showComments;
    if (this.showComments) this.loadComments();
    this.cdr.markForCheck();
  }

  loadComments() {
    this.http.get<any>(
      `http://localhost:3000/api/comments/${this.currentTrack.id}`
    ).subscribe({
      next: (res) => {
        this.comments = res.comments;
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Comments error:', err)
    });
  }

  submitComment() {
    if (!this.newComment.trim()) return;
    const content = this.newComment.trim();
    this.newComment = '';

    this.http.post(
      `http://localhost:3000/api/comments/${this.currentTrack.id}`,
      { content },
      this.auth.getAuthHeaders()
    ).subscribe({
      next: () => {
        this.currentTrack.comment_count = (this.currentTrack.comment_count || 0) + 1;
        this.loadComments();
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Comment error:', err)
    });
  }

  deleteComment(comment: any) {
    if (!confirm('Delete this comment?')) return;

    this.http.delete(
      `http://localhost:3000/api/comments/${this.currentTrack.id}/${comment.id}`,
      this.auth.getAuthHeaders()
    ).subscribe({
      next: () => {
        this.comments = this.comments.filter(c => c.id !== comment.id);
        this.currentTrack.comment_count = Math.max((this.currentTrack.comment_count || 1) - 1, 0);
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Delete comment error:', err)
    });
  }

  toggleCommentLike(comment: any) {
  if (comment.isLiked) {
    this.http.delete(
      `http://localhost:3000/api/comments/${comment.id}/like`,
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
      `http://localhost:3000/api/comments/${comment.id}/like`,
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
}