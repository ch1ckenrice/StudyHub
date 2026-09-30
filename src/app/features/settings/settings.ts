import { Component, inject, signal } from '@angular/core';
import { StudyHubDataService } from '../../core/services/studyhub-data.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Profile } from '../../core/models/profile.model';

@Component({
  selector: 'app-settings',
  imports: [ReactiveFormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings {
  protected readonly studyHubData = inject(StudyHubDataService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly isEditing = signal(false);
  protected readonly saveErrorMessage = signal<string | null>(null);
  protected readonly isProfileSaving = signal(false);
  protected readonly avatarError = signal<string | null>(null);
  protected readonly isAvatarUploading = signal(false);

  protected readonly isProfileLoading = this.studyHubData.isProfileLoading;

  protected readonly profile = this.studyHubData.profile;

  protected readonly profileForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    learningGoal: ['', [Validators.required, Validators.minLength(5)]],
    weeklyGoalHours: [1, [Validators.required, Validators.min(1), Validators.max(80)]],
  });

  protected startEditing(): void {
    const profile = this.profile();

    if (!profile) {
      return;
    }
    this.profileForm.reset(profile);
    this.isEditing.set(true);
    this.saveErrorMessage.set(null);
  }

  protected cancelEditing(): void {
    const profile = this.profile();

    if (!profile) {
      return;
    }
    this.profileForm.reset(profile);
    this.isEditing.set(false);
    this.saveErrorMessage.set(null);
  }

  protected async saveProfile(): Promise<void> {
    if (this.isProfileSaving()) {
      return;
    }

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.saveErrorMessage.set(null);
    this.isProfileSaving.set(true);

    try {
      const errorMessage = await this.studyHubData.updateProfile(this.profileForm.getRawValue());

      if (errorMessage) {
        this.saveErrorMessage.set(errorMessage);
        return;
      }

      this.isEditing.set(false);
    } finally {
      this.isProfileSaving.set(false);
    }
  }

  protected async onAvatarSelected(event: Event): Promise<void> {
    const avatarInput = event.target as HTMLInputElement;
    const file = avatarInput.files?.[0];
    try {
      if (!file) {
        return;
      }
      this.avatarError.set(null);

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

      if (!allowedTypes.includes(file.type)) {
        this.avatarError.set('Choose a JPG, PNG, or WebP image.');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        this.avatarError.set('Choose an image smaller than 5 MB.');
        return;
      }

      this.isAvatarUploading.set(true);
      const errorMessage = await this.studyHubData.uploadAvatar(file);
      if (errorMessage) {
        this.avatarError.set(errorMessage);
      }
    } finally {
      this.isAvatarUploading.set(false);
      avatarInput.value = '';
    }
  }
}
