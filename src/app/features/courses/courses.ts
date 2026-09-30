import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Course } from '../../core/models/course.model';
import { StudyHubDataService } from '../../core/services/studyhub-data.service';
import { ReactiveFormsModule, NonNullableFormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-courses',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './courses.html',
  styleUrl: './courses.scss',
})
export class Courses {
  private readonly studyHubData = inject(StudyHubDataService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly courses = this.studyHubData.courses;
  protected readonly activeCourses = this.studyHubData.activeCoursesCount;
  protected readonly isCourseLoading = this.studyHubData.isCourseLoading;

  protected getProgress(course: Course): number {
    if (!course.totalTopics) {
      return 0;
    }

    return Math.round((course.completedTopics / course.totalTopics) * 100);
  }

  protected readonly isCourseFormOpen = signal(false);
  protected readonly saveErrorMessage = signal<string | null>(null);
  protected readonly editingCourseId = signal<string | null>(null);
  protected readonly openCourseMenuId = signal<string | null>(null);
  protected readonly courseActionError = signal<string | null>(null);
  protected readonly isSaving = signal(false);
  protected readonly deletingCourseId = signal<string | null>(null);

  protected readonly courseForm = this.formBuilder.group({
    title: ['', Validators.required],
    status: this.formBuilder.control<'active' | 'paused' | 'completed'>('active'),
    color: this.formBuilder.control<'green' | 'amber' | 'rose'>('green'),
  });

  protected openCreateForm(): void {
    this.isCourseFormOpen.set(true);
    this.saveErrorMessage.set(null);
    this.courseActionError.set(null);
    this.editingCourseId.set(null);
    this.openCourseMenuId.set(null);
  }

  protected openEditCourseForm(course: Course) {
    this.editingCourseId.set(course.id);
    this.saveErrorMessage.set(null);
    this.courseForm.reset({
      title: course.title,
      status: course.status,
      color: course.color,
    });
    this.isCourseFormOpen.set(true);
    this.openCourseMenuId.set(null);
  }

  protected closeCreateForm(): void {
    this.isCourseFormOpen.set(false);
    this.saveErrorMessage.set(null);
    this.editingCourseId.set(null);
    this.courseForm.reset({
      title: '',
      status: 'active',
      color: 'green',
    });
  }

  protected async saveCourse(): Promise<void> {
    if (this.isSaving()) {
      return;
    }

    if (this.courseForm.invalid) {
      this.courseForm.markAllAsTouched();
      return;
    }
    const editingCourseId = this.editingCourseId();
    const formValue = this.courseForm.getRawValue();

    this.saveErrorMessage.set(null);
    this.isSaving.set(true);

    try {
      if (editingCourseId) {
        const errorMessage = await this.studyHubData.updateCourse(editingCourseId, formValue);

        if (errorMessage) {
          this.saveErrorMessage.set(errorMessage);
          return;
        }
        this.closeCreateForm();
        return;
      }

      const errorMessage = await this.studyHubData.addCourse(this.courseForm.getRawValue());

      if (errorMessage) {
        this.saveErrorMessage.set(errorMessage);
        return;
      }
      this.closeCreateForm();
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async removeCourse(course: Course): Promise<void> {
    if (this.deletingCourseId()) {
      return;
    }

    this.courseActionError.set(null);

    const confirmRemoving = confirm(`Are you sure you want Delete ${course.title} ?`);

    if (!confirmRemoving) {
      this.openCourseMenuId.set(null);
      return;
    }

    this.deletingCourseId.set(course.id);

    try {
      const errorMessage = await this.studyHubData.deleteCourse(course.id);
      if (errorMessage) {
        this.courseActionError.set(errorMessage);
        return;
      }
      this.openCourseMenuId.set(null);
    } finally {
      this.deletingCourseId.set(null);
    }
  }

  protected toggleCourseMenu(courseId: string) {
    this.openCourseMenuId.update((currentCourseId) =>
      currentCourseId === courseId ? null : courseId,
    );
  }
  @HostListener('document:click', ['$event'])
  protected closeCourseMenuOnOutsideClick(event: MouseEvent) {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    if (!target.closest('.course-card__actions')) {
      this.openCourseMenuId.set(null);
    }
  }
}
