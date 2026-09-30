export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: string;
  courseId: string;
  title: string;
  course: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
}
