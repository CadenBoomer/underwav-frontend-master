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
  // Form fields bound to inputs via [(ngModel)]. isPublic defaults 
  // to true so tracks are public by default. uploading is used to disable the button and show "Uploading..." while the 
  // request is in progress.
  title = '';
  description = '';
  lyrics = '';
  isPublic = true;
  uploading = false;

  // Same genre pattern as the dashboard edit modal — genres is all available genres from the backend, 
  // selectedGenres is what the user has picked, currentGenre is whatever is currently selected in the dropdown before 
  // adding it.
  genres: any[] = [];
  selectedGenres: any[] = [];
  currentGenre: any = null;

  //   selectedFile — the actual audio file
  // selectedCover — the cover image file
  // coverPreview — the base64 preview string. 
  // Notice the type is string | ArrayBuffer | null — FileReader.result can return either a string or an 
  // ArrayBuffer depending on how you read it, so TypeScript requires both types here
  selectedFile: File | null = null;
  selectedCover: File | null = null;
  coverPreview: string | ArrayBuffer | null = null;

  message = '';

  constructor(private http: HttpClient, private auth: AuthService) { }


  // Just loads all genres when the page loads so the dropdown is populated. Simple one liner since no image URL building 
  // needed.
  ngOnInit() {
    this.http.get('http://localhost:3000/api/genres').subscribe({
      next: (res: any) => this.genres = res,
      error: (err) => console.error('Failed to fetch genres', err),
    });
  }

  // Grabs the first selected audio file and stores it. Simple — no preview needed for audio files.
  onFileChange(event: any) {
    this.selectedFile = event.target.files[0];
  }

  //   When the user picks a new cover image:
  // files?.[0] gets the first selected file, ? for safety in case no file was picked
  // FileReader is a browser API that reads the file
  // readAsDataURL converts the image file into a base64 string (a long text representation of the image)
  // Once done, reader.onload fires and sets editCoverPreview to that string so the preview image in the modal updates immediately 
  // without uploading yet
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

  // What is coverPreview?
  // It's just a temporary URL that lets the browser display the image the user picked before it gets uploaded. 
  // So when you pick a cover image, it shows up in the <img> tag immediately without having to send it to the server first.


  // An ArrayBuffer is a raw binary representation of a file — just the pure bytes with no encoding. It's used when you 
  // want to process or manipulate the file data directly in code rather than display it.
  // FileReader can read files in two ways:
  // readAsDataURL() → returns a string (base64) — good for displaying images
  // readAsArrayBuffer() → returns an ArrayBuffer (raw bytes) — good for processing files



  // When a genre is selected from the dropdown it calls this. .some() checks if the genre is 
  // already in the selected list — prevents duplicates. Then resets editCurrentGenre back to null.
  addGenre() {
    if (!this.currentGenre) return;
    if (!this.selectedGenres.some(g => g.id === this.currentGenre.id)) {
      this.selectedGenres.push(this.currentGenre);
    }
    this.currentGenre = null;
  }

  // splice(index, 1) removes one item at the given index from the array.
  //   splice(index, 1) takes two arguments:
  // First number — where to start in the array
  // Second number — how many items to remove
  // So splice(index, 1) means "start at this position and remove 1 item" — which deletes the genre you clicked.
  // If you wrote splice(index, 0) it would mean "start at this position and remove 0 items" — so nothing would get deleted at all, 
  removeGenre(index: number) {
    this.selectedGenres.splice(index, 1);
  }



  uploadSong(fileInput: HTMLInputElement, coverInput: HTMLInputElement, genreSelect: HTMLSelectElement) {
    if (!this.title.trim()) { this.message = 'Please enter a track title.'; return; }
    if (!this.selectedFile) { this.message = 'Please select an audio file.'; return; }
    if (this.selectedGenres.length === 0) { this.message = 'Please select at least one genre.'; return; }
    this.uploading = true;

    // FormData is used instead of a regular JSON object because you might be sending a file (the cover image).
    //  Regular JSON can't carry files. Each field is appended individually. JSON.stringify converts the genres array to a 
    // string since FormData can only send strings. The cover is only appended if a new one was actually selected.
    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('title', this.title);
    formData.append('description', this.description);
    formData.append('lyrics', this.lyrics);
    formData.append('is_public', this.isPublic ? '1' : '0');
    formData.append('genreIds', JSON.stringify(this.selectedGenres.map(g => g.id)));
    if (this.selectedCover) formData.append('cover', this.selectedCover);

    // POST this time since you're creating a new record
    this.http.post('http://localhost:3000/api/media/uploads', formData, this.auth.getAuthHeaders())
      .subscribe({
        next: () => {
          this.uploading = false;
          this.message = 'Upload successful!';
          this.resetForm(fileInput, coverInput, genreSelect);
        },
        error: (err) => {
          this.uploading = false;
          console.error('Upload failed', err);
        },
      });
  }

  // Resets all the TypeScript properties back to their defaults. The important bit is fileInput.value = '' and 
  // coverInput.value = '' — you can't reset file inputs through Angular binding, you have to directly clear the 
  // DOM element's value. That's why the HTML element references are passed in as parameters. 
  // genreSelect.selectedIndex = 0 resets the dropdown back to the "Add a genre..." placeholder.
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


// this.title = '';
// Because [(ngModel)] keeps the input and the property in sync, clearing the property clears the input.
// But file inputs are different — browsers intentionally don't let JavaScript control file inputs through normal 
// binding for security reasons. You can't just do:
// typescriptthis.selectedFile = null; // this does NOT clear the actual input on screen
// The file input on screen would still show the old filename even though your property is null.
// So the only way to actually clear a file input is to directly access the HTML element itself and set its value to 
// empty:
// typescriptfileInput.value = '';
// That's why the HTML element references #fileInput and #coverInput are passed into resetForm() as parameters — so you 
// can reach into the actual DOM elements and clear them directly, something Angular binding alone can't do.