import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AuthService, UserProfile } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.html',
  styleUrls: ['./profile.css'],
  standalone: true,
  imports: [FormsModule, CommonModule]
})
export class ProfileComponent implements OnInit {

  user: UserProfile = {
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    city: '',
    country: '',
    phone: '',
    bio: '',
    avatar: null,
    show_email: false
  };

  constructor(private authService: AuthService, private cdr: ChangeDetectorRef, private http: HttpClient) { }

  avatarPreview: string | null = null;

  ngOnInit(): void {
    console.log('ProfileComponent ngOnInit, fetching profile');
    this.authService.getProfile().subscribe({
      next: profile => {
        console.log('Profile data received', profile);
          console.log('Profile data:', profile);
        this.user = profile;
        this.cdr.markForCheck(); // notify Angular change detector
      },
      error: err => console.error('Failed to load profile', err)
    });
  }

  saveProfile(formValue: Partial<UserProfile>) {
    this.authService.updateProfile(formValue).subscribe({
      next: () => alert('Profile updated!'),
      error: err => console.error(err)
    });
  }

  changePassword(currentPassword: string, newPassword: string) {
    this.authService.updatePassword({ currentPassword, newPassword }).subscribe({
      next: () => alert('Password updated!'),
      error: err => console.error(err)
    });
  }

  deleteAccount() {
    if (!confirm('Are you sure?')) return;
    this.authService.deleteProfile().subscribe({
      next: () => alert('Account deleted'),
      error: err => console.error(err)
    });
  }

  onAvatarChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarPreview = reader.result as string;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);

    // Upload to backend
    const formData = new FormData();
    formData.append('avatar', file);

    this.http.patch(
      'http://localhost:3000/api/auth/avatar',
      formData,
      this.authService.getAuthHeaders()
    ).subscribe({
      next: (res: any) => {
        this.user.avatar = res.avatar;
        this.avatarPreview = null;
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Avatar upload error:', err)
    });
  }
}