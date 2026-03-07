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
  followTab: 'followers' | 'following' = 'followers';
  followers: any[] = [];
  following: any[] = [];

  ngOnInit(): void {
    this.authService.getProfile().subscribe({
      next: profile => { this.user = profile; this.cdr.markForCheck(); },
      error: err => console.error('Failed to load profile', err)
    });

    // Load following first, then followers, so we can mark isFollowing
    this.http.get<any[]>(
      'http://localhost:3000/api/follows/following',
      this.authService.getAuthHeaders()
    ).subscribe({
      next: (following) => {
        this.following = following;
        const followingIds = new Set(following.map(f => f.id));

        this.http.get<any[]>(
          'http://localhost:3000/api/follows/followers',
          this.authService.getAuthHeaders()
        ).subscribe({
          next: (followers) => {
            this.followers = followers.map(f => ({
              ...f,
              isFollowing: followingIds.has(f.id)
            }));
            this.cdr.markForCheck();
          },
          error: (err) => console.error('Followers error:', err)
        });

        this.cdr.markForCheck();
      },
      error: (err) => console.error('Following error:', err)
    });
  }

  toggleFollowBack(follower: any) {
    if (follower.isFollowing) {
      this.http.delete(
        `http://localhost:3000/api/follows/unfollow/${follower.id}`,
        this.authService.getAuthHeaders()
      ).subscribe({
        next: () => {
          follower.isFollowing = false;
          this.following = this.following.filter(f => f.id !== follower.id);
          this.cdr.markForCheck();
        },
        error: (err) => console.error('Unfollow error:', err)
      });
    } else {
      this.http.post(
        `http://localhost:3000/api/follows/follow/${follower.id}`,
        {},
        this.authService.getAuthHeaders()
      ).subscribe({
        next: () => {
          follower.isFollowing = true;
          this.following = [...this.following, follower];
          this.cdr.markForCheck();
        },
        error: (err) => console.error('Follow back error:', err)
      });
    }
  }

  unfollow(user: any) {
    this.http.delete(
      `http://localhost:3000/api/follows/unfollow/${user.id}`,
      this.authService.getAuthHeaders()
    ).subscribe({
      next: () => {
        this.following = this.following.filter(f => f.id !== user.id);
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Unfollow error:', err)
    });
  }

  saveProfile(formValue: Partial<UserProfile>) {
    if (!formValue.username?.trim()) {
      alert('Username is required.');
      return;
    }
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