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

// Four simple properties — the first three are bound to the form 
// inputs via [(ngModel)], message is for displaying any feedback to the user.
export class Signup {
  username = '';
  email = '';
  password = '';
  message = '';

  // Both private — auth handles the signup API call, router navigates to login after success.
  //  Neither is needed directly in the HTML so both are private.
  constructor(private auth: AuthService, private router: Router) { }

  //  Calls auth.signup() passing the three form values as an object. On success it shows an alert 
  // with the server's message and navigates to login. On error it shows whatever error message came back from the server, 
  // falling back to 'Signup failed' if there's no specific message.
  // Notice there's no ngOnInit here — this component doesn't need to load any data when it starts, it 
  // just waits for the user to fill in the form and click the button.
  signup() {
    this.auth.signup({
      username: this.username,
      email: this.email,
      password: this.password
    }).subscribe({
      next: (res: any) => {
        this.message = res.message || 'Account created. Check your email to verify.';
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.message = err.error?.message || 'Signup failed';
      }
    });
  }
}
