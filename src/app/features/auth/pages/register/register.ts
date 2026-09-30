import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  protected readonly formBuilder = inject(FormBuilder);
  protected readonly authService = inject(AuthService);
  protected readonly router = inject(Router);

  protected isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly registerForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected async submit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const { name, email, password } = this.registerForm.getRawValue();

    try {
      const result = await this.authService.signUp(name, email, password);

      if (result.errorMessage) {
        this.errorMessage.set(result.errorMessage);
        return;
      }

      if (result.requiresEmailConfirmation) {
        this.successMessage.set('Check your email to confirm your StudyHub account.');
        return;
      }

      await this.router.navigateByUrl('/app/dashboard');
    } catch {
      this.errorMessage.set('Something went wrong. Check your connection and try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
