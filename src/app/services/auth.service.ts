import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';


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

  private apiUrl = 'http://localhost:3000/api/auth'; // change if needed
  private loggedIn = new BehaviorSubject<boolean>(!!localStorage.getItem('token'));
  loggedIn$ = this.loggedIn.asObservable();

  constructor(private http: HttpClient, private router: Router) { }

  // Login
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
  signup(data: any) {
    return this.http.post(`${this.apiUrl}/signup`, data);
  }

  logout() {
    localStorage.removeItem('token');
    this.loggedIn.next(false); // reactive header
    this.router.navigate(['/']); // redirect to home
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  // Profile CRUD
  getProfile() {return this.http.get<UserProfile>(`${this.apiUrl}/profile`, this.getAuthHeaders());}
  updateProfile(data: any) { return this.http.patch(`${this.apiUrl}/profile`, data, this.getAuthHeaders()); }
  deleteProfile() { return this.http.delete(`${this.apiUrl}/profile`, this.getAuthHeaders()); }

  // Password
  updatePassword(data: any) { return this.http.patch(`${this.apiUrl}/update-password`, data, this.getAuthHeaders()); }
  forgotPassword(email: string) { return this.http.post(`${this.apiUrl}/forgot-password`, { email }); }
  resetPassword(token: string, newPassword: string) { return this.http.post(`${this.apiUrl}/reset-password/${token}`, { newPassword }); }
}