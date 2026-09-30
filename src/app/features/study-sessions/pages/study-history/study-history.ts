import { Component, computed, inject, signal } from '@angular/core';
import { StudyHubDataService } from '../../../../core/services/studyhub-data.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-study-history',
  imports: [DatePipe],
  templateUrl: './study-history.html',
  styleUrl: './study-history.scss',
})
export class StudyHistory {
  private readonly studyHubData = inject(StudyHubDataService);

  protected formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (!hours) {
      return `${minutes} min`;
    }

    return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  protected readonly isStudySessionsLoading = this.studyHubData.isStudySessionLoading;

  protected readonly deleteError = signal<string | null>(null);
  protected readonly deletingSessionId = signal<string | null>(null);

  protected readonly sessionsWithCourse = computed(() => {
    const sessions = this.studyHubData.studySessions();
    const courses = this.studyHubData.courses();

    return sessions.map((session) => {
      const currentCourse = courses.find((course) => course.id === session.courseId);

      return {
        ...session,
        courseTitle: currentCourse?.title ?? 'Deleted course',
      };
    });
  });

  protected async removeSession(sessionId: string): Promise<void> {
    if (this.deletingSessionId()) {
      return;
    }

    const confirmRemovingSession = confirm('Are you sure you want to delete this session?');

    if (!confirmRemovingSession) {
      return;
    }
    this.deleteError.set(null);
    this.deletingSessionId.set(sessionId);

    try {
      const errorMessage = await this.studyHubData.deleteStudySession(sessionId);
      if (errorMessage) {
        this.deleteError.set(errorMessage);
        return;
      }
    } finally {
      this.deletingSessionId.set(null);
    }
  }
}
