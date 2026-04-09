import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';


@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  // Very simple component — no OnInit, no HTTP client directly, just two properties and one method.
  // Two way bound to the input fields via [(ngModel)].
  email = '';
  password = '';
  message = '';
  showForgot = false;

  constructor(private authService: AuthService, private router: Router, private http: HttpClient) { }


  login() {
    // Basic validation — if either field is empty, show an alert and stop. The return prevents the rest of the function from running.
    if (!this.email || !this.password) {
      this.message = 'Fill in all fields';
      return;
    }

    // Passes the email and password to AuthService.login() which handles the actual HTTP call. On success navigates to dashboard.
    //  On error shows an alert with the server's error message, falling back to 'Server error' if no message came back. 
    // The ?. on err.error?.message is optional chaining again — in case err.error is null.
    this.authService.login({ email: this.email, password: this.password })
      .subscribe({
        next: () => {
          this.router.navigate(['/dashboard']); //Navigate to dashboard after login
        },
        error: (err) => {
          this.message = 'Login failed: ' + err.error?.message || 'Server error';
        }
      });
  }

  forgotPassword() {
    if (!this.email) {
      this.message = 'Please enter your email';
      return;
    }
    this.http.post('http://localhost:3000/api/auth/forgot-password', { email: this.email })
      .subscribe({
        next: () => {
          this.message = 'Reset link sent! Check your email.';
        },
        error: () => {
          this.message = 'Something went wrong. Try again.';
        }
      });
  }
}

