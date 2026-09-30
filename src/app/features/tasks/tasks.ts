import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { StudyHubDataService } from '../../core/services/studyhub-data.service';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Task, TaskPriority } from '../../core/models/task.model';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-tasks',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './tasks.html',
  styleUrl: './tasks.scss',
})
export class Tasks {
  private readonly studyHubData = inject(StudyHubDataService);

  protected readonly tasks = this.studyHubData.tasks;

  protected readonly openTasksCount = this.studyHubData.openTasksCount;

  protected readonly todoTasks = computed(() => {
    return this.tasks().filter((task) => task.status === 'todo');
  });

  protected readonly inProgressTasks = computed(() => {
    return this.tasks().filter((task) => task.status === 'in-progress');
  });

  protected readonly doneTasks = computed(() => {
    return this.tasks().filter((task) => task.status === 'done');
  });

  protected readonly isTaskLoading = this.studyHubData.isTaskLoading;

  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly courses = this.studyHubData.courses;
  protected readonly isTaskFormOpen = signal(false);

  protected readonly openTaskMenuId = signal<string | null>(null);
  protected readonly editingTaskId = signal<string | null>(null);
  protected readonly taskSaveError = signal<string | null>(null);
  protected readonly taskActionError = signal<string | null>(null);
  protected readonly isSaving = signal(false);
  protected readonly deletingTaskId = signal<string | null>(null);

  protected readonly taskForm = this.formBuilder.group({
    title: this.formBuilder.control('', Validators.required),
    courseId: this.formBuilder.control('', Validators.required),
    dueDate: this.formBuilder.control('', Validators.required),
    priority: this.formBuilder.control<TaskPriority>('medium'),
  });

  protected openTaskForm() {
    this.editingTaskId.set(null);
    this.taskSaveError.set(null);
    this.taskForm.reset({
      title: '',
      courseId: '',
      dueDate: '',
      priority: 'medium',
    });
    this.isTaskFormOpen.set(true);
  }
  protected openEditTaskForm(task: Task) {
    this.editingTaskId.set(task.id);
    this.taskForm.reset({
      courseId: task.courseId,
      title: task.title,
      dueDate: task.dueDate,
      priority: task.priority,
    });
    this.isTaskFormOpen.set(true);
    this.openTaskMenuId.set(null);
  }
  protected closeTaskForm(): void {
    this.isTaskFormOpen.set(false);
    this.editingTaskId.set(null);
    this.taskSaveError.set(null);
    this.taskForm.reset({
      title: '',
      courseId: '',
      dueDate: '',
      priority: 'medium',
    });
  }

  protected async saveTask(): Promise<void> {
    if (this.isSaving()) {
      return;
    }

    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }
    const formValue = this.taskForm.getRawValue();
    const editingTaskId = this.editingTaskId();

    this.taskSaveError.set(null);
    this.isSaving.set(true);

    try {
      if (editingTaskId) {
        const errorMessage = await this.studyHubData.updateTask(editingTaskId, {
          title: formValue.title,
          dueDate: formValue.dueDate,
          priority: formValue.priority,
        });
        if (errorMessage) {
          this.taskSaveError.set(errorMessage);
          return;
        }
        this.closeTaskForm();
        return;
      }

      const selectedCourse = this.courses().find((course) => course.id === formValue.courseId);

      if (!selectedCourse) {
        return;
      }

      const errorMessage = await this.studyHubData.addTask({
        ...formValue,
        course: selectedCourse.title,
        status: 'todo',
      });

      if (errorMessage) {
        this.taskSaveError.set(errorMessage);
        return;
      }
      this.closeTaskForm();
    } finally {
      this.isSaving.set(false);
    }
  }

  protected toggleTaskMenu(taskId: string) {
    this.openTaskMenuId.update((currentTaskId) => (currentTaskId === taskId ? null : taskId));
  }

  protected async changeTaskStatus(taskId: string, status: Task['status']) {
    this.taskActionError.set(null);
    const errorMessage = await this.studyHubData.updateTaskStatus(taskId, status);
    if (errorMessage) {
      this.taskActionError.set(errorMessage);
      return;
    }
    this.openTaskMenuId.set(null);
  }

  protected async removeTask(taskId: string) {
    if (this.deletingTaskId()) {
      return;
    }

    this.taskActionError.set(null);

    this.deletingTaskId.set(taskId);

    try {
      const errorMessage = await this.studyHubData.deleteTask(taskId);
      if (errorMessage) {
        this.taskActionError.set(errorMessage);
        return;
      }
      this.openTaskMenuId.set(null);
    } finally {
      this.deletingTaskId.set(null);
    }
  }

  @HostListener('document:click', ['$event'])
  protected closeTaskMenuOnOutsideClick(event: MouseEvent) {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    if (!target.closest('.task-card__actions')) {
      this.openTaskMenuId.set(null);
    }
  }
}
