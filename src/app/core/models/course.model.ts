export interface Course {
  id: string;
  title: string;
  status: 'active' | 'paused' | 'completed';
  completedTopics: number;
  totalTopics: number;
  openTasks: number;
  color: 'green' | 'amber' | 'rose';
}

export interface SubjectProgress {
  name: string;
  completedTopics: number;
  totalTopics: number;
  color: 'green' | 'amber' | 'rose';
}

export interface Topic {
  id: string;
  courseId: string;
  title: string;
  status: 'todo' | 'in-progress' | 'done';
}

export interface CourseResource {
  id: string;
  courseId: string;
  title: string;
  type: 'link' | 'pdf';
  source: string;
  createdAt: string;
}
