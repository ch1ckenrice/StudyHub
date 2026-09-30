import { Component, computed, inject } from '@angular/core';
import { StudyHubDataService } from '../../core/services/studyhub-data.service';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, RelativeTimePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export default class Dashboard {
  private readonly studyHubData = inject(StudyHubDataService);

  protected readonly courses = this.studyHubData.courses;
  protected readonly tasks = this.studyHubData.tasks;
  protected readonly activeCourses = this.studyHubData.activeCoursesCount;

  protected readonly weeklyGoalHours = this.studyHubData.weeklyGoalHours;
  protected readonly studiedHours = this.studyHubData.weeklyStudiedHours;
  protected readonly weeklyProgress = this.studyHubData.weeklyProgress;
  protected readonly isProfileLoading = this.studyHubData.isProfileLoading;

  protected readonly isTaskLoading = this.studyHubData.isTaskLoading;
  protected readonly isCourseLoading = this.studyHubData.isCourseLoading;
  protected readonly isTopicLoading = this.studyHubData.isTopicLoading;
  protected readonly isStudySessionLoading = this.studyHubData.isStudySessionLoading;

  protected readonly weeklyStudyTimeLabel = this.studyHubData.weeklyStudyTimeLabel;

  protected formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (!hours) {
      return `${minutes} min`;
    }

    return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  protected readonly upcomingTasks = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);

    return this.tasks()
      .filter((task) => task.status !== 'done')
      .filter((task) => {
        const deadlineTime = new Date(task.dueDate).getTime();
        return deadlineTime >= today.getTime() && deadlineTime <= weekEnd.getTime();
      })
      .sort((firstTask, secondTask) => {
        const firstDeadline = new Date(firstTask.dueDate).getTime();
        const secondDeadline = new Date(secondTask.dueDate).getTime();
        return firstDeadline - secondDeadline;
      });
  });

  protected readonly dueSoon = computed(() => {
    return this.upcomingTasks().length;
  });

  protected readonly dashboardTasks = computed(() => {
    return this.upcomingTasks().slice(0, 4);
  });

  protected readonly todayFocus = computed(() => {
    return this.dashboardTasks().map((task) => task.title);
  });

  protected readonly subjects = computed(() => {
    return this.courses()
      .filter((course) => course.status === 'active')
      .map((course) => ({
        name: course.title,
        completedTopics: course.completedTopics,
        totalTopics: course.totalTopics,
        color: course.color,
        progress: course.totalTopics
          ? Math.round((course.completedTopics / course.totalTopics) * 100)
          : 0,
      }));
  });

  protected readonly averageSubjectProgress = computed(() => {
    const subjects = this.subjects();

    if (!subjects.length) {
      return 0;
    }

    const total = subjects.reduce((sum, subject) => {
      return sum + subject.progress;
    }, 0);

    return Math.round(total / subjects.length);
  });

  protected readonly recentSessionsWithCourse = computed(() => {
    const sessions = this.studyHubData.studySessions().slice(0, 3);
    const courses = this.studyHubData.courses();

    return sessions.map((session) => {
      const currentCourse = courses.find((course) => course.id === session.courseId);

      return {
        ...session,
        courseTitle: currentCourse?.title ?? 'Deleted course',
      };
    });
  });
}
