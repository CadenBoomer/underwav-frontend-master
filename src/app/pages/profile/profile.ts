import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AuthService, UserProfile } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';


// UserProfile is a TypeScript interface exported from your AuthService that defines what a user profile object
//  looks like. All the fields like username, email, bio etc. are defined there.

@Component({
  selector: 'app-profile',
  templateUrl: './profile.html',
  styleUrls: ['./profile.css'],
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink]
})
export class ProfileComponent implements OnInit {

  // Initialized with empty defaults so the template doesn't crash before the API call comes back.
  //  Without defaults, trying to display user.username before the data loads would throw an error.

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

  // Same FileReader preview pattern as upload and dashboard — temporary base64 string to show the new avatar before it's saved.
  avatarPreview: string | null = null;
  // This is a union type — it can only ever be one of those two specific strings, nothing else. 
  // Starts on the followers tab. TypeScript would throw an error if you tried to set it to anything other than 
  // 'followers' or 'following'.
  followTab: 'followers' | 'following' = 'followers';
  followers: any[] = [];
  following: any[] = [];

  message = '';

  constructor(private authService: AuthService, private cdr: ChangeDetectorRef, private http: HttpClient) { }

  // Loads the user's profile. The avatar URL building is the same pattern you've seen — 
  // checks if it already starts with http (external URL) or needs the local path prepended.
  ngOnInit(): void {
    this.authService.getProfile().subscribe({
      next: profile => {
        this.user = {
          ...profile,
          avatar: profile.avatar
            ? profile.avatar.startsWith('http')
              ? profile.avatar
              : `http://localhost:3000/uploads/images/${profile.avatar}`
            : null
        };
        this.cdr.markForCheck();
      },
      error: err => console.error('Failed to load profile', err)
    });


    // The followers call is nested inside the following call. This is intentional — 
    // you need to load following first to build the followingIds Set, then when followers load you can 
    // check followingIds.has(f.id) to set isFollowing on each follower. This tells you which of your followers you're 
    // already following back. Same Set pattern as the comment likes in the dashboard.
    this.http.get<any[]>(
      'http://localhost:3000/api/follows/following',
      this.authService.getAuthHeaders()
    ).subscribe({
      next: (following) => {
        this.following = following.map(f => ({
          ...f,
          avatar: f.avatar
            ? f.avatar.startsWith('http') ? f.avatar : `http://localhost:3000/uploads/images/${f.avatar}`
            : null
        }));
        const followingIds = new Set(following.map(f => f.id));

        this.http.get<any[]>(
          'http://localhost:3000/api/follows/followers',
          this.authService.getAuthHeaders()
        ).subscribe({
          next: (followers) => {
            this.followers = followers.map(f => ({
              ...f,
              isFollowing: followingIds.has(f.id),
              avatar: f.avatar
                ? f.avatar.startsWith('http') ? f.avatar : `http://localhost:3000/uploads/images/${f.avatar}`
                : null
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


  // Same like/unlike pattern as comment likes. If already following, sends DELETE and removes from 
  // following array using .filter(). If not following, sends POST and adds to following array using the spread 
  // operator [...this.following, follower] — this creates a new array with all existing following plus the new one.
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

  // Used in the Following tab — just removes the user from your following list with a DELETE request and .filter().
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

  // Partial<UserProfile> means not all fields are required — any subset of UserProfile fields is valid. 
  // The ?.trim() on username uses optional chaining since it's a partial type and might not exist. 
  // Delegates the actual HTTP call to authService.updateProfile(). Two more alerts to replace here.
  saveProfile(formValue: Partial<UserProfile>) {
    if (!formValue.username?.trim()) {
      this.message = 'Username is required.';
      return;
    }
    this.authService.updateProfile(formValue).subscribe({
      next: () => { this.message = 'Profile updated successfully!'; this.cdr.markForCheck(); },
      error: err => { this.message = 'Failed to update profile.'; console.error(err); }
    });
  }

  // Simple — just passes both passwords to the auth service. Another alert to replace.

  changePassword(currentPassword: string, newPassword: string) {
    this.authService.updatePassword({ currentPassword, newPassword }).subscribe({
      next: () => { this.message = 'Password updated successfully!'; this.cdr.markForCheck(); },
      error: err => {
        this.message = err.error?.message || 'Failed to update password.';
        this.cdr.markForCheck();
      }
    });
  }

  // Same confirm() pattern as deleteTrack() in the dashboard. Worth noting — 
  // after deletion it just shows an alert but doesn't navigate anywhere. 
  // In a complete app you'd want to log the user out and redirect them after deletion.
  deleteAccount() {
    if (!confirm('Are you sure?')) return;
    this.authService.deleteProfile().subscribe({
      next: () => { this.message = 'Account deleted.'; this.cdr.markForCheck(); },
      error: err => { this.message = 'Failed to delete account.'; console.error(err); }
    });
  }

  //   Two things happen simultaneously here:
  // FileReader reads the file and sets avatarPreview immediately so the user sees the new photo right away
  // FormData sends the file to the backend via PATCH
  // Once the backend responds with the saved avatar URL, it updates user.avatar with the real URL and clears
  //  avatarPreview since it's no longer needed. http.patch<{ avatar: string }> — 
  // the type in angle brackets tells TypeScript the response will be an object with just an avatar string field.

  onAvatarChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.avatarPreview = reader.result as string;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('avatar', file);

    this.http.patch<{ avatar: string }>(
      'http://localhost:3000/api/auth/avatar',
      formData,
      this.authService.getAuthHeaders()
    ).subscribe({
      next: (res) => {
        this.user.avatar = res.avatar;
        this.avatarPreview = null;
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Avatar upload error:', err)
    });
  }
}