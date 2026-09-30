import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { StudyHubDataService } from '../../core/services/studyhub-data.service';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Note } from '../../core/models/note.model';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';

@Component({
  selector: 'app-notes',
  imports: [ReactiveFormsModule, RelativeTimePipe],
  templateUrl: './notes.html',
  styleUrl: './notes.scss',
})
export class Notes {
  private readonly studyHubData = inject(StudyHubDataService);

  protected readonly notes = this.studyHubData.notes;
  protected readonly isNoteLoading = this.studyHubData.isNoteLoading;

  protected readonly totalNotes = computed(() => {
    return this.notes().length;
  });

  protected readonly uniqueCourses = computed(() => {
    return new Set(this.notes().map((note) => note.course)).size;
  });

  protected readonly mostActiveCourse = computed(() => {
    const noteByCourse = new Map<string, number>();

    for (const note of this.notes()) {
      const currentCount = noteByCourse.get(note.course) ?? 0;

      noteByCourse.set(note.course, currentCount + 1);
    }

    const [courseName, noteCount] = [...noteByCourse.entries()].sort(
      ([, firstCount], [, secondCount]) => secondCount - firstCount,
    )[0] ?? ['No notes yet', 0];

    return {
      courseName,
      noteCount,
    };
  });

  protected readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly courses = this.studyHubData.courses;
  protected readonly isNoteFormOpen = signal(false);
  protected readonly selectedCourseId = signal<string | null>(null);
  protected readonly noteSaveError = signal<string | null>(null);
  protected readonly noteActionError = signal<string | null>(null);
  protected readonly isSaving = signal(false);
  protected readonly deletingNoteId = signal<string | null>(null);

  protected readonly filteredNotes = computed(() => {
    const selectedCourseId = this.selectedCourseId();
    if (!selectedCourseId) {
      return this.notes();
    }
    return this.notes().filter((note) => note.courseId === selectedCourseId);
  });

  protected selectCourse(courseId: string | null) {
    this.selectedCourseId.set(courseId);
  }

  protected readonly editingNoteId = signal<string | null>(null);
  protected readonly openNoteMenuId = signal<string | null>(null);

  protected readonly noteForm = this.formBuilder.group({
    title: this.formBuilder.control('', Validators.required),
    courseId: this.formBuilder.control('', Validators.required),
    content: this.formBuilder.control('', [Validators.required, Validators.minLength(10)]),
    tags: this.formBuilder.control(''),
  });

  protected openNoteForm(): void {
    this.editingNoteId.set(null);
    this.noteSaveError.set(null);
    this.noteForm.reset({
      title: '',
      courseId: '',
      content: '',
      tags: '',
    });
    this.isNoteFormOpen.set(true);
  }

  protected openEditNoteForm(note: Note): void {
    this.editingNoteId.set(note.id);
    this.noteForm.reset({
      title: note.title,
      courseId: note.courseId,
      content: note.content,
      tags: note.tags.join(', '),
    });
    this.isNoteFormOpen.set(true);
    this.openNoteMenuId.set(null);
  }

  protected closeNoteForm(): void {
    this.isNoteFormOpen.set(false);
    this.editingNoteId.set(null);
    this.noteSaveError.set(null);
    this.noteForm.reset({
      title: '',
      courseId: '',
      content: '',
      tags: '',
    });
  }

  protected async saveNote() {
    if (this.isSaving()) {
      return;
    }

    if (this.noteForm.invalid) {
      this.noteForm.markAllAsTouched();
      return;
    }

    const formValue = this.noteForm.getRawValue();
    const tags = formValue.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const editingNoteId = this.editingNoteId();
    this.noteSaveError.set(null);
    this.isSaving.set(true);

    try {
      if (editingNoteId) {
        const errorMessage = await this.studyHubData.updateNote(editingNoteId, {
          title: formValue.title,
          content: formValue.content,
          tags,
        });
        if (errorMessage) {
          this.noteSaveError.set(errorMessage);
          return;
        }
        this.closeNoteForm();
        return;
      }

      const selectedCourse = this.courses().find((course) => course.id === formValue.courseId);

      if (!selectedCourse) {
        return;
      }

      const errorMessage = await this.studyHubData.addNote({
        title: formValue.title,
        courseId: selectedCourse.id,
        course: selectedCourse.title,
        content: formValue.content,
        tags,
      });
      if (errorMessage) {
        this.noteSaveError.set(errorMessage);
        return;
      }
      this.closeNoteForm();
    } finally {
      this.isSaving.set(false);
    }
  }

  protected toggleNoteMenu(noteId: string) {
    this.openNoteMenuId.update((currentNoteId) => (currentNoteId === noteId ? null : noteId));
  }

  protected async removeNote(noteId: string) {
    if (this.deletingNoteId()) {
      return;
    }

    this.noteActionError.set(null);

    this.deletingNoteId.set(noteId);

    try {
      const errorMessage = await this.studyHubData.deleteNote(noteId);
      if (errorMessage) {
        this.noteActionError.set(errorMessage);
        return;
      }
      this.openNoteMenuId.set(null);
    } finally {
      this.deletingNoteId.set(null);
    }
  }

  @HostListener('document:click', ['$event'])
  protected closeNoteMenuOnOutsideClick(event: MouseEvent): void {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    if (!target.closest('.note-card__actions')) {
      this.openNoteMenuId.set(null);
    }
  }
}
