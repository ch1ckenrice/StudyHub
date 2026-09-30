import { Component, computed, inject, signal, HostListener } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StudyHubDataService } from '../../../../core/services/studyhub-data.service';
import { Course, CourseResource, Topic } from '../../../../core/models/course.model';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Task, TaskPriority } from '../../../../core/models/task.model';
import { RelativeTimePipe } from '../../../../shared/pipes/relative-time.pipe';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-course-details',
  imports: [RouterLink, ReactiveFormsModule, RelativeTimePipe, DatePipe],
  templateUrl: './course-details.html',
  styleUrl: './course-details.scss',
})
export class CourseDetails {
  private readonly route = inject(ActivatedRoute);
  private readonly studyHubData = inject(StudyHubDataService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly course = computed(() => {
    const courseId = this.route.snapshot.paramMap.get('id');

    return this.studyHubData.courses().find((course) => course.id === courseId);
  });
  protected readonly topics = computed(() => {
    const courseId = this.course()?.id;

    return this.studyHubData.courseTopics().filter((topic) => topic.courseId === courseId);
  });
  protected readonly tasks = computed(() => {
    const courseId = this.course()?.id;

    return this.studyHubData.tasks().filter((task) => task.courseId === courseId);
  });
  protected readonly notes = computed(() => {
    const courseId = this.course()?.id;

    return this.studyHubData.notes().filter((note) => note.courseId === courseId);
  });
  protected readonly resources = computed(() => {
    const courseId = this.course()?.id;

    return this.studyHubData.courseResources().filter((topic) => topic.courseId === courseId);
  });

  protected readonly isTopicFormOpen = signal(false);
  protected readonly editingTopicId = signal<string | null>(null);
  protected readonly openTopicMenuId = signal<string | null>(null);
  protected readonly topicSaveError = signal<string | null>(null);
  protected readonly isTopicSaving = signal(false);
  protected readonly courseTaskSaveError = signal<string | null>(null);
  protected readonly isCourseTaskSaving = signal(false);
  protected readonly topicActionError = signal<string | null>(null);
  protected readonly courseTaskActionError = signal<string | null>(null);
  protected readonly deletingTopicId = signal<string | null>(null);
  protected readonly deletingCourseTaskId = signal<string | null>(null);
  protected readonly isResourceFormOpen = signal(false);
  protected readonly resourceSaveError = signal<string | null>(null);
  protected readonly isResourceSaving = signal(false);
  protected readonly resourceActionError = signal<string | null>(null);
  protected readonly deletingResourceId = signal<string | null>(null);
  protected readonly openResourceMenuId = signal<string | null>(null);
  protected readonly isResourceLoading = this.studyHubData.isResourceLoading;
  protected readonly selectedPdfFile = signal<File | null>(null);

  protected readonly topicForm = this.formBuilder.group({
    title: ['', Validators.required],
  });

  protected openTopicForm() {
    this.editingTopicId.set(null);
    this.topicSaveError.set(null);
    this.topicForm.reset({
      title: '',
    });
    this.isTopicFormOpen.set(true);
  }

  protected openEditTopicForm(topic: Topic) {
    this.editingTopicId.set(topic.id);
    this.topicForm.reset({
      title: topic.title,
    });
    this.isTopicFormOpen.set(true);
    this.openTopicMenuId.set(null);
  }

  protected closeTopicForm(): void {
    this.isTopicFormOpen.set(false);
    this.editingTopicId.set(null);
    this.topicSaveError.set(null);
    this.topicForm.reset({
      title: '',
    });
  }

  protected async saveTopic() {
    if (this.isTopicSaving()) {
      return;
    }

    if (this.topicForm.invalid) {
      this.topicForm.markAllAsTouched();
      return;
    }

    this.topicSaveError.set(null);

    const formValue = this.topicForm.getRawValue();
    const editingTopicId = this.editingTopicId();
    this.isTopicSaving.set(true);

    try {
      if (editingTopicId) {
        const errorMessage = await this.studyHubData.updateTopic(editingTopicId, formValue);
        if (errorMessage) {
          this.topicSaveError.set(errorMessage);
          return;
        }
        this.closeTopicForm();
        return;
      }
      const currentCourse = this.course();

      if (!currentCourse) {
        return;
      }

      const errorMessage = await this.studyHubData.addTopic({
        ...formValue,
        courseId: currentCourse.id,
        status: 'todo',
      });

      if (errorMessage) {
        this.topicSaveError.set(errorMessage);
        return;
      }
      this.closeTopicForm();
    } finally {
      this.isTopicSaving.set(false);
    }
  }

  protected toggleTopicMenu(topicId: string) {
    this.openTopicMenuId.update((currentTopicId) => (currentTopicId === topicId ? null : topicId));
  }

  @HostListener('document:click', ['$event'])
  protected closeTopicMenuOnOutsideClick(event: MouseEvent) {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }
    if (!target.closest('.topic-row__actions, .task-row__actions, .resource-row__actions')) {
      this.openTopicMenuId.set(null);
      this.openTaskMenuId.set(null);
      this.openResourceMenuId.set(null);
    }
  }

  protected async changeTopicStatus(topicId: string, status: Topic['status']) {
    this.topicActionError.set(null);
    const errorMessage = await this.studyHubData.updateTopicStatus(topicId, status);
    if (errorMessage) {
      this.topicActionError.set(errorMessage);
      return;
    }
    this.openTopicMenuId.set(null);
  }
  protected async removeTopic(topicId: string) {
    if (this.deletingTopicId()) {
      return;
    }

    this.topicActionError.set(null);
    this.deletingTopicId.set(topicId);

    try {
      const errorMessage = await this.studyHubData.deleteTopic(topicId);
      if (errorMessage) {
        this.topicActionError.set(errorMessage);
        return;
      }
      this.openTopicMenuId.set(null);
    } finally {
      this.deletingTopicId.set(null);
    }
  }

  protected getProgress(course: Course): number {
    if (!course.totalTopics) {
      return 0;
    }
    return Math.round((course.completedTopics / course.totalTopics) * 100);
  }

  protected readonly isTaskFormOpen = signal(false);
  protected readonly editingTaskId = signal<string | null>(null);
  protected readonly openTaskMenuId = signal<string | null>(null);

  protected readonly taskForm = this.formBuilder.group({
    title: this.formBuilder.control('', Validators.required),
    dueDate: this.formBuilder.control('', Validators.required),
    priority: this.formBuilder.control<TaskPriority>('medium'),
  });
  protected openTaskForm() {
    this.editingTaskId.set(null);
    this.courseTaskSaveError.set(null);
    this.taskForm.reset({
      title: '',
      dueDate: '',
      priority: 'medium',
    });
    this.isTaskFormOpen.set(true);
  }

  protected openEditTaskForm(task: Task) {
    this.editingTaskId.set(task.id);
    this.taskForm.reset({
      title: task.title,
      dueDate: task.dueDate,
      priority: task.priority,
    });
    this.isTaskFormOpen.set(true);
    this.openTaskMenuId.set(null);
  }
  protected closeTaskForm() {
    this.isTaskFormOpen.set(false);
    this.editingTaskId.set(null);
    this.courseTaskSaveError.set(null);
    this.taskForm.reset({
      title: '',
      dueDate: '',
      priority: 'medium',
    });
  }

  protected async saveTask() {
    if (this.isCourseTaskSaving()) {
      return;
    }

    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }
    const formValue = this.taskForm.getRawValue();
    const editingTaskId = this.editingTaskId();
    this.courseTaskSaveError.set(null);
    this.isCourseTaskSaving.set(true);

    try {
      if (editingTaskId) {
        const errorMessage = await this.studyHubData.updateTask(editingTaskId, formValue);

        if (errorMessage) {
          this.courseTaskSaveError.set(errorMessage);
          return;
        }
        this.closeTaskForm();
        return;
      }
      const currentCourse = this.course();

      if (!currentCourse) {
        return;
      }

      const errorMessage = await this.studyHubData.addTask({
        ...formValue,
        courseId: currentCourse.id,
        course: currentCourse.title,
        status: 'todo',
      });
      if (errorMessage) {
        this.courseTaskSaveError.set(errorMessage);
        return;
      }
      this.closeTaskForm();
    } finally {
      this.isCourseTaskSaving.set(false);
    }
  }

  protected toggleTaskMenu(taskId: string) {
    this.openTaskMenuId.update((currentTaskId) => (currentTaskId === taskId ? null : taskId));
  }
  protected async changeTaskStatus(taskId: string, status: Task['status']) {
    this.courseTaskActionError.set(null);
    const errorMessage = await this.studyHubData.updateTaskStatus(taskId, status);
    if (errorMessage) {
      this.courseTaskActionError.set(errorMessage);
      return;
    }
    this.openTaskMenuId.set(null);
  }
  protected async removeTask(taskId: string) {
    if (this.deletingCourseTaskId()) {
      return;
    }

    this.courseTaskActionError.set(null);
    this.deletingCourseTaskId.set(taskId);

    try {
      const errorMessage = await this.studyHubData.deleteTask(taskId);
      if (errorMessage) {
        this.courseTaskActionError.set(errorMessage);
        return;
      }
      this.openTaskMenuId.set(null);
    } finally {
      this.deletingCourseTaskId.set(null);
    }
  }

  protected readonly resourceForm = this.formBuilder.group({
    type: this.formBuilder.control<'link' | 'pdf'>('link'),
    title: this.formBuilder.control('', Validators.required),
    source: this.formBuilder.control('', [
      Validators.required,
      Validators.pattern(/^https?:\/\/.+/),
    ]),
  });

  protected openResourceForm() {
    this.resourceForm.reset({
      type: 'link',
      title: '',
      source: '',
    });

    this.selectedPdfFile.set(null);
    this.resourceSaveError.set(null);
    this.setResourceSourceValidators('link');
    this.isResourceFormOpen.set(true);
  }

  protected closeResourceForm() {
    this.isResourceFormOpen.set(false);
    this.resourceForm.reset({
      type: 'link',
      title: '',
      source: '',
    });
    this.selectedPdfFile.set(null);
    this.resourceSaveError.set(null);
    this.setResourceSourceValidators('link');
  }

  protected changeResourceType(type: 'link' | 'pdf') {
    this.resourceForm.controls.type.setValue(type);
    this.selectedPdfFile.set(null);
    this.resourceSaveError.set(null);
    this.setResourceSourceValidators(type);
  }

  private setResourceSourceValidators(type: 'link' | 'pdf') {
    const sourceControl = this.resourceForm.controls.source;
    if (type === 'link') {
      sourceControl.setValidators([Validators.required, Validators.pattern(/^https?:\/\/.+/)]);
    } else {
      sourceControl.clearValidators();
    }
    sourceControl.updateValueAndValidity();
  }
  protected toggleResourceMenu(resourceId: string): void {
    this.resourceActionError.set(null);

    this.openResourceMenuId.update((currentResourceId) =>
      currentResourceId === resourceId ? null : resourceId,
    );
  }

  protected async removeResource(resource: CourseResource) {
    if (this.deletingResourceId()) {
      return;
    }

    this.resourceActionError.set(null);
    this.deletingResourceId.set(resource.id);

    try {
      const errorMessage = await this.studyHubData.deleteResource(resource);

      if (errorMessage) {
        this.resourceActionError.set(errorMessage);
        return;
      }

      this.openResourceMenuId.set(null);
    } finally {
      this.deletingResourceId.set(null);
    }
  }

  protected selectPdfFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.selectedPdfFile.set(null);
    this.resourceSaveError.set(null);

    if (!file) {
      return;
    }

    if (file.type !== 'application/pdf') {
      this.resourceSaveError.set('Choose a PDF file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.resourceSaveError.set('Choose a file smaller than 10 MB.');
      return;
    }

    this.selectedPdfFile.set(file);
  }

  protected async saveResource(): Promise<void> {
    if (this.isResourceSaving()) {
      return;
    }

    if (this.resourceForm.invalid) {
      this.resourceForm.markAllAsTouched();
      return;
    }

    const currentCourse = this.course();

    if (!currentCourse) {
      return;
    }
    const formValue = this.resourceForm.getRawValue();
    this.resourceSaveError.set(null);

    if (formValue.type === 'pdf') {
      const file = this.selectedPdfFile();

      if (!file) {
        this.resourceSaveError.set('Please choose a PDF file.');
        return;
      }
    }

    this.isResourceSaving.set(true);

    try {
      const errorMessage =
        formValue.type === 'pdf'
          ? await this.studyHubData.addPdfResource(
              currentCourse.id,
              formValue.title,
              this.selectedPdfFile()!,
            )
          : await this.studyHubData.addResource({
              courseId: currentCourse.id,
              title: formValue.title,
              type: 'link',
              source: formValue.source,
            });

      if (errorMessage) {
        this.resourceSaveError.set(errorMessage);
        return;
      }

      this.closeResourceForm();
    } finally {
      this.isResourceSaving.set(false);
    }
  }

  protected async openPdfResource(resource: CourseResource): Promise<void> {
    this.resourceActionError.set(null);

    const pdfTab = window.open('', '_blank');

    if (pdfTab) {
      pdfTab.opener = null;
    }

    const { url, errorMessage } = await this.studyHubData.createPdfSignedUrl(resource.source);

    if (errorMessage || !url) {
      pdfTab?.close();
      this.resourceActionError.set(errorMessage ?? 'PDF could not be opened.');
      return;
    }

    if (pdfTab) {
      pdfTab.location.href = url;
      return;
    }

    window.location.assign(url);
  }
}
