import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signup',
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
  standalone: true
})
export class Signup {
  username = '';
  email = '';
  password = '';
  message = '';

  constructor(private auth: AuthService, private router: Router) { }

  signup() {
    this.auth.signup({
      username: this.username,
      email: this.email,
      password: this.password
    }).subscribe({
      next: (res: any) => {
        alert(res.message || 'Account created. Check your email to verify.');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        alert(err.error.message || 'Signup failed');
      }
    });
  }
}
