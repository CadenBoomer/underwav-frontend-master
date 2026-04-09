import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';

// Every field is optional with ? — this is the same Partial idea you saw in saveProfile(). 
// Since this interface is exported, it's what the profile component imports and uses as the type for the user object.
export interface UserProfile {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  city?: string;
  country?: string;
  phone?: string;
  bio?: string;
  avatar?: string | null;
  show_email?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // Base URL for all auth endpoints. Stored once here so if you ever change the backend URL you only update it in one place.

  private apiUrl = 'http://localhost:3000/api/auth'; // change if needed

  //   This is the most important part of the service. BehaviorSubject is an RxJS type that:
  // Holds a current value
  // Emits that value to any new subscribers immediately
  // Emits a new value to all subscribers whenever it changes
  // !!localStorage.getItem('token') — the double !! converts the result to a boolean. If a token exists it 
  // returns a non-null string which !! turns into true. If no token it returns null which !! turns into false. 
  // So it initializes the logged in state based on whether a token already exists in local storage — this means if 
  // you refresh the page you stay logged in.
  // loggedIn$ exposes the subject as a plain observable — the $ is just a naming convention for observables. Making 
  // it an observable instead of exposing the BehaviorSubject directly prevents other parts of the app from calling 
  // .next() on it directly — only this service can change the login state.
  private loggedIn = new BehaviorSubject<boolean>(!!localStorage.getItem('token'));
  loggedIn$ = this.loggedIn.asObservable();

  constructor(private http: HttpClient, private router: Router) { }

  // Login
  //   tap() is a new RxJS operator — it lets you run side effects without changing the data flowing through. So it:
  // Saves the token to localStorage so it persists across page refreshes
  // Calls this.loggedIn.next(true) which pushes true to all subscribers of loggedIn$ — this is what makes the header instantly 
  // update to show the logged in nav links
  // The actual response still flows through unchanged to the component that called login(). tap just intercepts it to do the 
  // side effects.
  login(data: any) {
    return this.http.post(`${this.apiUrl}/login`, data).pipe(
      tap((res: any) => {
        const token = res.token;
        if (token) {
          localStorage.setItem('token', token);
          this.loggedIn.next(true); // notify header
        }
      })
    );
  }

  // Signup
  // Simple — just passes the data to the backend. No token handling here since your 
  // app requires email verification before logging in.
  signup(data: any) {
    return this.http.post(`${this.apiUrl}/signup`, data);
  }

  //   Removes the token from localStorage
  // Pushes false to all loggedIn$ subscribers — header instantly hides the logged in links
  // Navigates to home
  logout() {
    localStorage.removeItem('token');
    this.loggedIn.next(false); // reactive header
    this.router.navigate(['/']); // redirect to home
  }

  // A simple synchronous check — just returns true or false based on whether a token exists.
  //  Used in route guards to protect pages that require login.
  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  // Builds the auth header object that gets passed to protected API calls. Bearer ${token} is the standard format for 
  // JWT authentication — the backend reads this header to verify who is making the request. 
  // This is what you've been passing as the third argument to all your HTTP calls throughout the app.
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  // Profile CRUD
  // Simple wrappers around HTTP calls — each one just calls the corresponding backend endpoint with auth headers. 
  // Written on one line since they're straightforward. 
  // Components call these methods instead of making HTTP calls directly, which keeps the auth logic centralized here.
  getProfile() { return this.http.get<UserProfile>(`${this.apiUrl}/profile`, this.getAuthHeaders()); }
  updateProfile(data: any) { return this.http.patch(`${this.apiUrl}/profile`, data, this.getAuthHeaders()); }
  deleteProfile() { return this.http.delete(`${this.apiUrl}/profile`, this.getAuthHeaders()); }

  // Password
  //   updatePassword — requires auth since you need to be logged in to change your password
  // forgotPassword — no auth headers since you're not logged in when you forget your password
  // resetPassword — the token here is a password reset token from the email link, not the auth token. It's embedded in the URL so the backend can verify the reset request is valid
  // Worth noting — forgotPassword and resetPassword are defined here but looking back through your components, there's no forgot password or reset password page in what you've sent. They're built in the service but the frontend pages for them may not exist yet
  updatePassword(data: any) { return this.http.patch(`${this.apiUrl}/update-password`, data, this.getAuthHeaders()); }
  forgotPassword(email: string) { return this.http.post(`${this.apiUrl}/forgot-password`, { email }); }
  resetPassword(token: string, newPassword: string) { return this.http.post(`${this.apiUrl}/reset-password/${token}`, { newPassword }); }
}