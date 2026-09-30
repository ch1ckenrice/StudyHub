import { computed, inject, Injectable, signal } from '@angular/core';
import { StudyHubDataService } from './studyhub-data.service';

interface SavedTimerState {
  selectedCourseId: string | null;
  elapsedSeconds: number;
  sessionStartedAt: string;
  sessionCourseId: string;
  timerStatus: 'running' | 'paused';
}

@Injectable({
  providedIn: 'root',
})
export class StudyTimerService {
  private timerIntervalId: ReturnType<typeof setInterval> | null = null;
  private readonly studyHubData = inject(StudyHubDataService);

  readonly selectedCourseId = signal<string | null>(null);
  readonly elapsedSeconds = signal(0);
  readonly sessionStartedAt = signal<string | null>(null);
  readonly sessionCourseId = signal<string | null>(null);
  readonly timerStatus = signal<'idle' | 'running' | 'paused'>('idle');
  readonly saveError = signal<string | null>(null);

  private readonly storageKey = 'studyhub-active-timer';

  constructor() {
    this.restoreTimer();
  }

  readonly timerValue = computed(() => {
    const totalSeconds = this.elapsedSeconds();
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds].map((value) => value.toString().padStart(2, '0')).join(':');
  });

  setSelectedCourse(courseId: string) {
    if (this.timerStatus() !== 'idle') {
      return;
    }
    this.selectedCourseId.set(courseId || null);
  }

  startTimer() {
    const selectedCourseId = this.selectedCourseId();

    if (!selectedCourseId || this.timerStatus() === 'running') {
      return;
    }
    if (!this.sessionStartedAt()) {
      this.sessionStartedAt.set(new Date().toISOString());
      this.sessionCourseId.set(selectedCourseId);
    }
    this.saveError.set(null);
    this.timerStatus.set('running');

    this.persistTimer();
    this.startTimerInterval();
  }

  pauseTimer() {
    if (this.timerStatus() !== 'running') {
      return;
    }
    this.clearTimerInterval();
    this.timerStatus.set('paused');
    this.persistTimer();
  }

  async stopTimer() {
    const courseId = this.sessionCourseId();
    const startedAt = this.sessionStartedAt();
    const elapsedSeconds = this.elapsedSeconds();

    this.clearTimerInterval();
    this.saveError.set(null);

    if (courseId && startedAt && elapsedSeconds > 0) {
      const errorMessage = await this.studyHubData.addStudySession({
        courseId,
        startedAt,
        endedAt: new Date().toISOString(),
        durationMinutes: Math.max(1, Math.round(elapsedSeconds / 60)),
      });
      if (errorMessage) {
        this.saveError.set(errorMessage);
        this.timerStatus.set('paused');
        this.persistTimer();
        return;
      }
    }

    this.elapsedSeconds.set(0);
    this.sessionStartedAt.set(null);
    this.sessionCourseId.set(null);
    this.timerStatus.set('idle');
    this.persistTimer();
  }

  private startTimerInterval() {
    this.clearTimerInterval();

    this.timerIntervalId = setInterval(() => {
      this.elapsedSeconds.update((seconds) => seconds + 1);
      this.persistTimer();
    }, 1000);
  }

  private persistTimer() {
    const timerStatus = this.timerStatus();

    if (timerStatus === 'idle') {
      localStorage.removeItem(this.storageKey);
      return;
    }

    const sessionStartedAt = this.sessionStartedAt();
    const sessionCourseId = this.sessionCourseId();
    if (!sessionStartedAt || !sessionCourseId) {
      return;
    }

    const savedTimer: SavedTimerState = {
      selectedCourseId: this.selectedCourseId(),
      elapsedSeconds: this.elapsedSeconds(),
      sessionStartedAt,
      sessionCourseId,
      timerStatus,
    };

    localStorage.setItem(this.storageKey, JSON.stringify(savedTimer));
  }

  private restoreTimer() {
    const savedTimerValue = localStorage.getItem(this.storageKey);

    if (!savedTimerValue) {
      return;
    }
    try {
      const savedTimer = JSON.parse(savedTimerValue) as SavedTimerState;

      if (
        !savedTimer.sessionStartedAt ||
        !savedTimer.sessionCourseId ||
        (savedTimer.timerStatus !== 'running' && savedTimer.timerStatus !== 'paused')
      ) {
        localStorage.removeItem(this.storageKey);
        return;
      }

      this.selectedCourseId.set(savedTimer.selectedCourseId);
      this.elapsedSeconds.set(savedTimer.elapsedSeconds);
      this.sessionStartedAt.set(savedTimer.sessionStartedAt);
      this.sessionCourseId.set(savedTimer.sessionCourseId);
      this.timerStatus.set(savedTimer.timerStatus);

      if (savedTimer.timerStatus === 'running') {
        this.startTimerInterval();
      }
    } catch {
      localStorage.removeItem(this.storageKey);
    }
  }
  private clearTimerInterval() {
    if (this.timerIntervalId === null) {
      return;
    }

    clearInterval(this.timerIntervalId);
    this.timerIntervalId = null;
  }
}
