import { Component, computed, inject } from '@angular/core';
import { StudyHubDataService } from '../../../../core/services/studyhub-data.service';
import { StudyTimerService } from '../../../../core/services/study-timer.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-study-timer',
  imports: [FormsModule],
  templateUrl: './study-timer.html',
  styleUrl: './study-timer.scss',
})
export class StudyTimer {
  private readonly studyHubData = inject(StudyHubDataService);
  protected readonly studyTimer = inject(StudyTimerService);

  protected readonly ActiveCourses = computed(() => {
    return this.studyHubData.courses().filter((course) => course.status === 'active');
  });

  protected selectCourse(event: Event) {
    const courseId = (event.currentTarget as HTMLSelectElement).value;
    this.studyTimer.setSelectedCourse(courseId);
  }
}
