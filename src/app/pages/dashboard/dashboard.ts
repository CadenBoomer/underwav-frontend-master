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

  //   uploads — the array of the user's uploaded tracks
  // activeIndex — which track is currently showing in the carousel. Starts at 0 (first track)
  // currentPage, totalPages, totalTracks — for pagination, since you don't load all tracks at once

  uploads: Track[] = [];
  activeIndex = 0;
  currentPage = 1;
  totalPages = 1;
  totalTracks = 0;

  // Edit modal state

  //   editOpen — controls whether the modal is visible
  // saving — true while the save request is in progress, used to disable the save button and show "Saving..."
  // editCoverFile — the actual image file if the user picks a new cover
  // editCoverPreview — a temporary URL to preview the new cover before saving
  // editCurrentGenre — whichever genre is currently selected in the dropdown before adding it
  // editSelectedGenres — the list of genres already added to the track
  // allGenres — every available genre from the backend for the dropdown
  // lyricsExpanded — controls whether lyrics are shown or collapsed
  editOpen = false;
  saving = false;
  editCoverFile: File | null = null;
  editCoverPreview: string | null = null;
  editCurrentGenre: Genre | null = null;
  editSelectedGenres: Genre[] = [];
  allGenres: Genre[] = [];
  lyricsExpanded = false;


  // An inline object that holds the edit form values. Notice is_public is a number (1 or 0) not a boolean 
  // — that's because the database stores it as an integer.
  editForm: {
    id: number;
    title: string;
    description: string;
    lyrics: string;
    is_public: number;
  } = { id: 0, title: '', description: '', lyrics: '', is_public: 1 };


  // showComments — toggles the comments section
  // comments — array of comment objects
  // newComment — bound to the comment input field

  showComments = false;
  comments: any[] = [];
  newComment = '';

  editMessage = '';

  constructor(
    private mediaService: MediaService,
    public player: PlayerService,
    private http: HttpClient,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) { }

  // No auth check needed here since the dashboard only loads for logged in users 
  // — the router handles that. Just loads uploads and genres immediately.
  ngOnInit(): void {
    this.loadUploads();
    this.loadGenres();


  }

  // Fetches all genres for the edit modal dropdown. Same simple pattern as the discover page.
  loadGenres() {
    this.http.get<Genre[]>('http://localhost:3000/api/genres').subscribe({
      next: (genres) => { this.allGenres = genres; this.cdr.markForCheck(); },
      error: (err) => console.error('Failed to load genres:', err)
    });
  }

  // page: number = 1 means the page parameter defaults to 1 if you don't pass anything. 
  // This time it uses mediaService instead of http directly — the service wraps the HTTP call and also
  //  handles pagination, returning tracks, totalPages, page, and total all in one response object.
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

  // A getter — it looks like a property but it's actually a function. 
  // Whenever anything in the template uses currentTrack, it automatically returns whichever 
  // track is at activeIndex in the uploads array. So as activeIndex changes, currentTrack always 
  // returns the right track without you having to manually update it.
  get currentTrack(): Track {
    return this.uploads[this.activeIndex];
  }

  // Jumps directly to a specific track. Also resets comments and lyrics so you don't see the previous track's data.
  goToSlide(index: number) {
    this.activeIndex = index;
    this.showComments = false;
    this.comments = [];
    this.lyricsExpanded = false;
  }

  // Goes to the previous track. The ternary handles wrapping — 
  // if you're at the first track and hit prev, it jumps to the last track instead of going to -1.
  prev() {
    this.activeIndex = this.activeIndex > 0 ? this.activeIndex - 1 : this.uploads.length - 1;
    this.showComments = false;
    this.comments = [];
    this.lyricsExpanded = false;
  }

  // Same idea in reverse — if you're at the last track and hit next, it wraps back to 0.
  next() {
    this.activeIndex = this.activeIndex < this.uploads.length - 1 ? this.activeIndex + 1 : 0;
    this.showComments = false;
    this.comments = [];
    this.lyricsExpanded = false;
  }

  // Page navigation — only loads the next/previous page if one actually exists.
  nextPage() { if (this.currentPage < this.totalPages) this.loadUploads(this.currentPage + 1); }
  prevPage() { if (this.currentPage > 1) this.loadUploads(this.currentPage - 1); }


  // Edit modal
  // Populates the edit form with the track's current data so you're editing existing values not starting blank. ?? 1 is the 
  // nullish coalescing operator — if is_public is null or undefined, default to 1 (public). 
  // The track.genres.map(g => ({ ...g })) creates a copy of the genres array so editing them doesn't affect the original track 
  // data until you save.
  openEdit(track: Track) {
    this.editForm = {
      id: track.id,
      title: track.title || '',
      description: track.description || '',
      lyrics: track.lyrics || '',
      // The nullish coalescing operator (??) is a logical operator that returns its right-hand side operand when the left-hand side 
      // operand is null or undefined, and otherwise returns its left-hand side operand. 
      is_public: track.is_public ?? 1
    };
    this.editCoverPreview = null;
    this.editCoverFile = null;
    this.editCurrentGenre = null;
    this.editSelectedGenres = track.genres ? track.genres.map(g => ({ ...g })) : [];
    this.editOpen = true;
  }

  // Just closes the modal.
  closeEdit() {
    this.editOpen = false;
  }

  //   When the user picks a new cover image:
  // files?.[0] gets the first selected file, ? for safety in case no file was picked
  // FileReader is a browser API that reads the file
  // readAsDataURL converts the image file into a base64 string (a long text representation of the image)
  // Once done, reader.onload fires and sets editCoverPreview to that string so the preview image in the modal updates immediately 
  // without uploading yet
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

  // When a genre is selected from the dropdown it calls this. .some() checks if the genre is 
  // already in the selected list — prevents duplicates. Then resets editCurrentGenre back to null.
  addEditGenre() {
    if (!this.editCurrentGenre) return;
    if (!this.editSelectedGenres.some(g => g.id === this.editCurrentGenre!.id)) {
      this.editSelectedGenres.push(this.editCurrentGenre);
    }
    this.editCurrentGenre = null;
  }

  // splice(index, 1) removes one item at the given index from the array.
  //   splice(index, 1) takes two arguments:
  // First number — where to start in the array
  // Second number — how many items to remove
  // So splice(index, 1) means "start at this position and remove 1 item" — which deletes the genre you clicked.
  // If you wrote splice(index, 0) it would mean "start at this position and remove 0 items" — so nothing would get deleted at all, 
  // the genre would stay there.
  removeEditGenre(index: number) {
    this.editSelectedGenres.splice(index, 1);
  }

  // FormData is used instead of a regular JSON object because you might be sending a file (the cover image).
  //  Regular JSON can't carry files. Each field is appended individually. JSON.stringify converts the genres array to a 
  // string since FormData can only send strings. The cover is only appended if a new one was actually selected.

  saveEdit() {
    if (!this.editForm.title.trim()) { this.editMessage = 'Title is required.'; return; }
    if (this.editSelectedGenres.length === 0) { this.editMessage = 'Please select at least one genre.'; return; }
    this.editMessage = '';
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

    // PATCH instead of POST — PATCH means "update part of an existing record" rather than creating a new one. 
    // After saving, it reloads the uploads to show the updated data, then uses setTimeout of 300ms to restore activeIndex 
    // after the reload so the carousel stays on the same track.
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

  // confirm() is a browser built-in that shows a popup asking the user to confirm. 
  // If they click cancel it returns false and the return stops the delete from happening. Then sends a DELETE request to the backend.
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

  // Flips showComments. Only loads comments when opening, not when closing.
  toggleComments() {
    this.showComments = !this.showComments;
    if (this.showComments) this.loadComments();
    this.cdr.markForCheck();
  }


  //   Two HTTP calls here — first gets the comments, then checks which ones the current user has already liked.

  // Initially sets isLiked: false on all comments
  // Then sends all the comment IDs to the like-status endpoint
  // Gets back a list of IDs the user has liked
  // new Set(statusRes.likedIds) creates a Set (like an array but faster for lookups) of liked IDs
  // .has(c.id) checks if each comment's ID is in that set and sets isLiked accordingly
  loadComments() {
    this.http.get<any>(
      `http://localhost:3000/api/comments/${this.currentTrack.id}`
    ).subscribe({
      next: (res) => {
        const comments = res.comments.map((c: any) => ({ ...c, isLiked: false }));
        this.comments = comments;

        if (comments.length > 0) {
          const commentIds = comments.map((c: any) => c.id);
          this.http.post(
            'http://localhost:3000/api/comments/like-status',
            { commentIds },
            this.auth.getAuthHeaders()
          ).subscribe({
            next: (statusRes: any) => {
              const likedIds = new Set(statusRes.likedIds);
              //Used a set (has) instead of array (includes) because its faster for lookups.
              this.comments = this.comments.map(c => ({ ...c, isLiked: likedIds.has(c.id) }));
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

  // .trim() removes whitespace from both ends — so you can't post an empty or spaces-only comment. 
  // Clears the input immediately before the request finishes so it feels responsive. 
  // Manually increments comment_count so the stat updates instantly without waiting for a full reload.
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

  // .filter() removes the deleted comment from the array without reloading all comments. 
  // Math.max(..., 0) makes sure the count never goes below 0.
  deleteComment(comment: any) {
    if (!confirm('Delete this comment?')) return;

    this.http.delete(
      `http://localhost:3000/api/comments/${this.currentTrack.id}/${comment.id}`,
      this.auth.getAuthHeaders()
    ).subscribe({
      next: () => {
        this.comments = this.comments.filter(c => c.id !== comment.id);
        // if somehow the comment count in the database is already at 0 or out of sync, 
        // subtracting 1 could make it go negative like -1. Math.max(..., 0) just guarantees the displayed count 
        // never shows a negative number, it floors it at 0. Not something that should normally happen but it's
        //  defensive coding just in case.
        this.currentTrack.comment_count = Math.max((this.currentTrack.comment_count || 1) - 1, 0);
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Delete comment error:', err)
    });
  }

  // Checks current like state and does the opposite. If already liked it sends a DELETE (unlike), 
  //  not liked it sends a POST (like). Either way the response comes back with the updated likesCount from the 
  // backend and updates the comment directly.
  toggleCommentLike(comment: any) {
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
}