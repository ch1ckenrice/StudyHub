import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { StudyTimer } from '../../shared/components/study-timer/study-timer/study-timer';
import { StudyHubDataService } from '../../core/services/studyhub-data.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-app-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, StudyTimer],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss',
})
export class AppLayout {
  private readonly studyHubData = inject(StudyHubDataService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly studiedHours = this.studyHubData.weeklyStudiedHours;
  protected readonly weeklyGoalHours = this.studyHubData.weeklyGoalHours;
  protected readonly weeklyProgress = this.studyHubData.weeklyProgress;
  protected readonly weeklyStudyTimeLabel = this.studyHubData.weeklyStudyTimeLabel;
  protected readonly isProfileLoading = this.studyHubData.isProfileLoading;
  protected readonly isSidebarOpen = signal(false);

  protected async signOut() {
    this.closeSidebar();
    const errorMessage = await this.authService.signOut();

    if (!errorMessage) {
      await this.router.navigateByUrl('/login');
    }
  }

  protected toggleSidebar(): void {
    this.isSidebarOpen.update((isOpen) => !isOpen);
  }

  protected closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }

  constructor() {
    void this.studyHubData.loadProfile();
    void this.initializeData();
  }

  private async initializeData() {
    await this.studyHubData.loadCourses();
    await this.studyHubData.loadTopics();
    await this.studyHubData.loadTasks();
    await this.studyHubData.loadNotes();
    await this.studyHubData.loadStudySessions();
    await this.studyHubData.loadResources();
  }
}
