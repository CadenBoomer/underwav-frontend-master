import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './upload.html',
  styleUrls: ['./upload.css'],
})
export class Upload implements OnInit {
  title = '';
  description = '';
  lyrics = '';
  isPublic = true;
  uploading = false;

  genres: any[] = [];
  selectedGenres: any[] = [];
  currentGenre: any = null;

  selectedFile: File | null = null;
  selectedCover: File | null = null;
  coverPreview: string | ArrayBuffer | null = null;

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit() {
    this.http.get('http://localhost:3000/api/genres').subscribe({
      next: (res: any) => this.genres = res,
      error: (err) => console.error('Failed to fetch genres', err),
    });
  }

  onFileChange(event: any) {
    this.selectedFile = event.target.files[0];
  }

  onCoverChange(event: any) {
    const file = event.target.files[0];
    this.selectedCover = file;
    if (file) {
      const reader = new FileReader();
      reader.onload = () => this.coverPreview = reader.result;
      reader.readAsDataURL(file);
    } else {
      this.coverPreview = null;
    }
  }

  addGenre() {
    if (!this.currentGenre) return;
    if (!this.selectedGenres.some(g => g.id === this.currentGenre.id)) {
      this.selectedGenres.push(this.currentGenre);
    }
    this.currentGenre = null;
  }

  removeGenre(index: number) {
    this.selectedGenres.splice(index, 1);
  }

  uploadSong(fileInput: HTMLInputElement, coverInput: HTMLInputElement, genreSelect: HTMLSelectElement) {
    if (!this.selectedFile) return alert('Select a file');
    if (this.selectedGenres.length === 0) return alert('Select at least one genre');

    this.uploading = true;

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('title', this.title);
    formData.append('description', this.description);
    formData.append('lyrics', this.lyrics);
    formData.append('is_public', this.isPublic ? '1' : '0');
    formData.append('genreIds', JSON.stringify(this.selectedGenres.map(g => g.id)));
    if (this.selectedCover) formData.append('cover', this.selectedCover);

    this.http.post('http://localhost:3000/api/media/uploads', formData, this.auth.getAuthHeaders())
      .subscribe({
        next: () => {
          this.uploading = false;
          alert('Upload successful!');
          this.resetForm(fileInput, coverInput, genreSelect);
        },
        error: (err) => {
          this.uploading = false;
          console.error('Upload failed', err);
        },
      });
  }

  resetForm(fileInput: HTMLInputElement, coverInput: HTMLInputElement, genreSelect: HTMLSelectElement) {
    this.title = '';
    this.description = '';
    this.lyrics = '';
    this.selectedGenres = [];
    this.currentGenre = null;
    this.isPublic = true;
    this.selectedFile = null;
    this.selectedCover = null;
    this.coverPreview = null;
    fileInput.value = '';
    coverInput.value = '';
    if (genreSelect) genreSelect.selectedIndex = 0;
  }
}