export interface StudySession {
  id: string;
  courseId: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  note?: string;
}
