import { computed, Injectable, signal, inject } from '@angular/core';
import { Course, Topic, CourseResource } from '../models/course.model';
import { Task } from '../models/task.model';
import { Note } from '../models/note.model';
import { StudySession } from '../models/study-session.model';
import { Profile } from '../models/profile.model';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
type ProfileChanges = Pick<Profile, 'name' | 'learningGoal' | 'weeklyGoalHours'>;
type CourseChanges = Pick<Course, 'title' | 'status' | 'color'>;
interface ProfileRow {
  name: string;
  email: string;
  learning_goal: string;
  weekly_goal_hours: number;
  avatar_url: string | null;
}
interface CourseRow {
  id: string;
  title: string;
  status: 'active' | 'paused' | 'completed';
  color: 'green' | 'amber' | 'rose';
}

interface TopicRow {
  id: string;
  course_id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'done';
}
interface TaskRow {
  id: string;
  course_id: string;
  title: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in-progress' | 'done';
}
interface NoteRow {
  id: string;
  course_id: string;
  title: string;
  content: string;
  tags: string[];
  updated_at: string;
}
interface StudySessionRow {
  id: string;
  course_id: string;
  started_at: string;
  ended_at: string;
  duration_minutes: number;
  note: string | null;
}
interface ResourceRow {
  id: string;
  course_id: string;
  title: string;
  resource_type: CourseResource['type'];
  source: string;
  created_at: string;
}
@Injectable({
  providedIn: 'root',
})
export class StudyHubDataService {
  private readonly supabase = inject(SupabaseService);
  private readonly authService = inject(AuthService);

  private readonly coursesState = signal<Course[]>([]);
  private readonly taskState = signal<Task[]>([]);
  private readonly notesState = signal<Note[]>([]);
  private readonly profileState = signal<Profile | null>(null);
  private readonly courseTopicsState = signal<Topic[]>([]);
  private readonly courseResourcesState = signal<CourseResource[]>([]);
  private readonly studySessionsState = signal<StudySession[]>([]);

  private readonly profileLoadingState = signal(true);
  private readonly coursesLoadingState = signal(true);
  private readonly topicsLoadingState = signal(true);
  private readonly tasksLoadingState = signal(true);
  private readonly notesLoadingState = signal(true);
  private readonly studySessionsLoadingState = signal(true);
  private readonly resourcesLoadingState = signal(true);

  readonly courses = this.coursesState.asReadonly();
  readonly tasks = this.taskState.asReadonly();
  readonly notes = this.notesState.asReadonly();
  readonly profile = this.profileState.asReadonly();
  readonly courseTopics = this.courseTopicsState.asReadonly();
  readonly courseResources = this.courseResourcesState.asReadonly();
  readonly studySessions = this.studySessionsState.asReadonly();
  readonly isResourceLoading = this.resourcesLoadingState.asReadonly();

  readonly activeCoursesCount = computed(() => {
    return this.courses().filter((course) => course.status === 'active').length;
  });
  readonly openTasksCount = computed(() => {
    return this.tasks().filter((task) => task.status !== 'done').length;
  });
  readonly isProfileLoading = this.profileLoadingState.asReadonly();
  readonly isCourseLoading = this.coursesLoadingState.asReadonly();
  readonly isTopicLoading = this.topicsLoadingState.asReadonly();
  readonly isTaskLoading = this.tasksLoadingState.asReadonly();
  readonly isNoteLoading = this.notesLoadingState.asReadonly();
  readonly isStudySessionLoading = this.studySessionsLoadingState.asReadonly();

  readonly weeklyStudiedMinutes = computed(() => {
    const weekStart = this.getCurrentWeekStart().getTime();

    return this.studySessions()
      .filter((session) => new Date(session.startedAt).getTime() >= weekStart)
      .reduce((totalMinutes, session) => totalMinutes + session.durationMinutes, 0);
  });

  readonly weeklyStudiedHours = computed(() => {
    return Math.round((this.weeklyStudiedMinutes() / 60) * 10) / 10;
  });

  readonly weeklyStudyTimeLabel = computed(() => {
    const totalMinutes = this.weeklyStudiedMinutes();
    if (totalMinutes < 60) {
      return `${totalMinutes}m`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  });

  readonly weeklyGoalHours = computed(() => {
    return this.profile()?.weeklyGoalHours ?? 0;
  });

  readonly weeklyProgress = computed(() => {
    const weeklyGoalHours = this.weeklyGoalHours();
    if (!weeklyGoalHours) {
      return 0;
    }
    return Math.min(100, Math.round((this.weeklyStudiedHours() / weeklyGoalHours) * 100));
  });

  async addCourse(
    course: Omit<Course, 'id' | 'completedTopics' | 'totalTopics' | 'openTasks'>,
  ): Promise<string | null> {
    const userId = this.authService.user()?.id;

    if (!userId) {
      return 'You need to sign in first.';
    }

    const { data, error } = await this.supabase.client
      .from('courses')
      .insert({
        user_id: userId,
        title: course.title,
        status: course.status,
        color: course.color,
      })
      .select('id, title, status, color')
      .single();

    if (error || !data) {
      return error?.message ?? 'Courses could not be added.';
    }

    this.coursesState.update((courses) => [this.mapCourse(data as CourseRow), ...courses]);

    return null;
  }

  async updateCourse(courseId: string, changes: CourseChanges): Promise<string | null> {
    const userId = this.authService.user()?.id;

    if (!userId) {
      return 'You need to sign in first.';
    }

    const { data, error } = await this.supabase.client
      .from('courses')
      .update({
        title: changes.title,
        status: changes.status,
        color: changes.color,
      })
      .eq('id', courseId)
      .eq('user_id', userId)
      .select('id, title, status, color')
      .single();

    if (error || !data) {
      return error?.message ?? 'Course could not be updated.';
    }
    const updatedCourse = this.mapCourse(data as CourseRow);
    this.coursesState.update((courses) =>
      courses.map((course) => (course.id === courseId ? updatedCourse : course)),
    );

    this.taskState.update((tasks) =>
      tasks.map((task) =>
        task.courseId === courseId ? { ...task, course: updatedCourse.title } : task,
      ),
    );
    this.notesState.update((notes) =>
      notes.map((note) =>
        note.courseId === courseId ? { ...note, course: updatedCourse.title } : note,
      ),
    );
    this.syncCourseTopicStats();
    this.syncCourseTaskStats();
    return null;
  }

  async deleteCourse(courseId: string): Promise<string | null> {
    const userId = this.authService.user()?.id;

    if (!userId) {
      return 'You need to sign in first.';
    }

    const { data: pdfResources, error: resourcesError } = await this.supabase.client
      .from('resources')
      .select('source')
      .eq('course_id', courseId)
      .eq('user_id', userId)
      .eq('resource_type', 'pdf');

    if (resourcesError) {
      return resourcesError.message;
    }

    const pdfPaths = (pdfResources ?? []).map((resource) => resource.source);

    const { error } = await this.supabase.client
      .from('courses')
      .delete()
      .eq('id', courseId)
      .eq('user_id', userId);

    if (error) {
      return error.message;
    }
    if (pdfPaths.length > 0) {
      const { error: storageError } = await this.supabase.client.storage
        .from('resources')
        .remove(pdfPaths);

      if (storageError) {
        console.error('Course PDF storage cleanup failed:', storageError);
      }
    }

    this.coursesState.update((courses) => courses.filter((course) => course.id !== courseId));

    this.courseTopicsState.update((courses) =>
      courses.filter((course) => course.courseId !== courseId),
    );

    this.taskState.update((tasks) => tasks.filter((task) => task.courseId !== courseId));

    this.notesState.update((notes) => notes.filter((note) => note.courseId !== courseId));

    this.courseResourcesState.update((courses) =>
      courses.filter((course) => course.courseId !== courseId),
    );

    this.studySessionsState.update((sessions) =>
      sessions.filter((session) => session.courseId !== courseId),
    );

    this.syncCourseTopicStats();
    this.syncCourseTaskStats();
    return null;
  }

  async addTopic(topic: Omit<Topic, 'id'>): Promise<string | null> {
    const userId = this.authService.user()?.id;

    if (!userId) {
      return 'You need to sign in first.';
    }

    const { data, error } = await this.supabase.client
      .from('topics')
      .insert({
        course_id: topic.courseId,
        user_id: userId,
        title: topic.title,
        status: topic.status,
      })
      .select('id, course_id, title, status')
      .single();

    if (error || !data) {
      return error?.message ?? 'Topics could not be added.';
    }
    this.courseTopicsState.update((topics) => [this.mapTopic(data as TopicRow), ...topics]);

    this.syncCourseTopicStats();
    return null;
  }

  async updateTopic(topicId: string, changes: Pick<Topic, 'title'>): Promise<string | null> {
    const userId = this.authService.user()?.id;
    if (!userId) {
      return 'You need to sign in first.';
    }

    const { data, error } = await this.supabase.client
      .from('topics')
      .update({
        title: changes.title,
      })
      .eq('id', topicId)
      .eq('user_id', userId)
      .select('id, course_id, title, status')
      .single();

    if (error || !data) {
      return error?.message ?? 'Topics were not found.';
    }

    this.courseTopicsState.update((topics) =>
      topics.map((topic) => (topic.id === topicId ? this.mapTopic(data as TopicRow) : topic)),
    );
    return null;
  }

  async updateTopicStatus(topicId: string, status: Topic['status']): Promise<string | null> {
    const userId = this.authService.user()?.id;
    if (!userId) {
      return 'You need to sign in first.';
    }

    const { data, error } = await this.supabase.client
      .from('topics')
      .update({
        status: status,
      })
      .eq('id', topicId)
      .eq('user_id', userId)
      .select('id, course_id, title, status')
      .single();

    if (error || !data) {
      return error?.message ?? 'Topics were not found.';
    }

    this.courseTopicsState.update((topics) =>
      topics.map((topic) => (topic.id === topicId ? this.mapTopic(data as TopicRow) : topic)),
    );
    this.syncCourseTopicStats();
    return null;
  }

  async deleteTopic(topicId: string): Promise<string | null> {
    const userId = this.authService.user()?.id;
    if (!userId) {
      return 'You need to sign in first.';
    }

    const { error } = await this.supabase.client
      .from('topics')
      .delete()
      .eq('id', topicId)
      .eq('user_id', userId);

    if (error) {
      return error.message;
    }

    this.courseTopicsState.update((topics) => topics.filter((topic) => topic.id !== topicId));

    this.syncCourseTopicStats();
    return null;
  }

  async addTask(task: Omit<Task, 'id'>): Promise<string | null> {
    const userId = this.authService.user()?.id;

    if (!userId) {
      return 'You need to sign in first.';
    }

    const { data, error } = await this.supabase.client
      .from('tasks')
      .insert({
        course_id: task.courseId,
        user_id: userId,
        title: task.title,
        due_date: task.dueDate,
        status: task.status,
        priority: task.priority,
      })
      .select('id, course_id, title, due_date, priority, status')
      .single();

    if (error || !data) {
      return error?.message ?? 'Tasks could not be added.';
    }
    this.taskState.update((tasks) => [this.mapTask(data as TaskRow), ...tasks]);

    this.syncCourseTaskStats();
    return null;
  }

  async updateTask(
    taskId: string,
    changes: Pick<Task, 'title' | 'dueDate' | 'priority'>,
  ): Promise<string | null> {
    const userId = this.authService.user()?.id;
    if (!userId) {
      return 'You need to sign in first.';
    }

    const { data, error } = await this.supabase.client
      .from('tasks')
      .update({
        title: changes.title,
        due_date: changes.dueDate,
        priority: changes.priority,
      })
      .eq('id', taskId)
      .eq('user_id', userId)
      .select('id, course_id, title, due_date, priority, status')
      .single();

    if (error || !data) {
      return error?.message ?? 'Tasks were not found.';
    }

    this.taskState.update((tasks) =>
      tasks.map((task) => (task.id === taskId ? this.mapTask(data as TaskRow) : task)),
    );
    return null;
  }

  async updateTaskStatus(taskId: string, status: Task['status']): Promise<string | null> {
    const userId = this.authService.user()?.id;
    if (!userId) {
      return 'You need to sign in first.';
    }

    const { data, error } = await this.supabase.client
      .from('tasks')
      .update({
        status: status,
      })
      .eq('id', taskId)
      .eq('user_id', userId)
      .select('id, course_id, title, due_date, priority, status')
      .single();

    if (error || !data) {
      return error?.message ?? 'Tasks were not found.';
    }

    this.taskState.update((tasks) =>
      tasks.map((task) => (task.id === taskId ? this.mapTask(data as TaskRow) : task)),
    );
    this.syncCourseTaskStats();
    return null;
  }

  async deleteTask(taskId: string): Promise<string | null> {
    const userId = this.authService.user()?.id;
    if (!userId) {
      return 'You need to sign in first.';
    }

    const { error } = await this.supabase.client
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId);

    if (error) {
      return error.message;
    }

    this.taskState.update((tasks) => tasks.filter((task) => task.id !== taskId));

    this.syncCourseTaskStats();
    return null;
  }

  async addNote(note: Omit<Note, 'id' | 'updatedAt'>): Promise<string | null> {
    const userId = this.authService.user()?.id;

    if (!userId) {
      return 'You need to sign in first.';
    }

    const { data, error } = await this.supabase.client
      .from('notes')
      .insert({
        course_id: note.courseId,
        user_id: userId,
        title: note.title,
        content: note.content,
        tags: note.tags,
      })
      .select('id, course_id, title, content, tags, updated_at')
      .single();

    if (error || !data) {
      return error?.message ?? 'Notes could not be added.';
    }

    this.notesState.update((notes) => [this.mapNote(data as NoteRow), ...notes]);
    return null;
  }

  async updateNote(
    noteId: string,
    changes: Pick<Note, 'title' | 'content' | 'tags'>,
  ): Promise<string | null> {
    const userId = this.authService.user()?.id;
    if (!userId) {
      return 'You need to sign in first.';
    }

    const { data, error } = await this.supabase.client
      .from('notes')
      .update({
        title: changes.title,
        content: changes.content,
        tags: changes.tags,
      })
      .eq('id', noteId)
      .eq('user_id', userId)
      .select('id, course_id, title, content, tags, updated_at')
      .single();

    if (error || !data) {
      return error?.message ?? 'Notes were not found.';
    }

    this.notesState.update((notes) =>
      notes.map((note) => (note.id === noteId ? this.mapNote(data as NoteRow) : note)),
    );
    return null;
  }

  async deleteNote(noteId: string): Promise<string | null> {
    const userId = this.authService.user()?.id;
    if (!userId) {
      return 'You need to sign in first.';
    }
    const { error } = await this.supabase.client
      .from('notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', userId);

    if (error) {
      return error.message;
    }

    this.notesState.update((notes) => notes.filter((note) => note.id !== noteId));
    return null;
  }

  async loadStudySessions(): Promise<string | null> {
    this.studySessionsLoadingState.set(true);
    this.studySessionsState.set([]);
    try {
      const userId = this.authService.user()?.id;
      if (!userId) {
        return 'You need to sign in first.';
      }

      const { data, error } = await this.supabase.client
        .from('study_sessions')
        .select('id,course_id, started_at, ended_at, duration_minutes, note')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });

      if (error || !data) {
        return error?.message ?? 'Study sessions were not found.';
      }

      this.studySessionsState.set(
        (data as StudySessionRow[]).map((row) => this.mapStudySession(row)),
      );
      return null;
    } finally {
      this.studySessionsLoadingState.set(false);
    }
  }

  async addStudySession(session: Omit<StudySession, 'id'>): Promise<string | null> {
    const userId = this.authService.user()?.id;

    if (!userId) {
      return 'You need to sign in first.';
    }
    const { data, error } = await this.supabase.client
      .from('study_sessions')
      .insert({
        user_id: userId,
        course_id: session.courseId,
        started_at: session.startedAt,
        ended_at: session.endedAt,
        duration_minutes: session.durationMinutes,
        note: session.note ?? null,
      })
      .select('id,course_id, started_at, ended_at, duration_minutes, note')
      .single();

    if (error || !data) {
      return error?.message ?? 'Study session could not be saved.';
    }

    this.studySessionsState.update((sessions) => [
      this.mapStudySession(data as StudySessionRow),
      ...sessions,
    ]);
    return null;
  }

  async deleteStudySession(sessionId: string): Promise<string | null> {
    const userId = this.authService.user()?.id;

    if (!userId) {
      return 'You need to sign in first.';
    }
    const { error } = await this.supabase.client
      .from('study_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      return error.message;
    }
    this.studySessionsState.update((sessions) =>
      sessions.filter((session) => session.id !== sessionId),
    );
    return null;
  }

  private getCurrentWeekStart(): Date {
    const weekStart = new Date();
    const dayOfWeek = weekStart.getDay();
    const daysSinceMonday = (dayOfWeek + 6) % 7;

    weekStart.setDate(weekStart.getDate() - daysSinceMonday);
    weekStart.setHours(0, 0, 0, 0);

    return weekStart;
  }
  private mapProfile(row: ProfileRow): Profile {
    return {
      name: row.name,
      email: row.email,
      learningGoal: row.learning_goal,
      weeklyGoalHours: row.weekly_goal_hours,
      avatarUrl: row.avatar_url,
    };
  }
  private mapCourse(row: CourseRow): Course {
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      color: row.color,
      completedTopics: 0,
      totalTopics: 0,
      openTasks: 0,
    };
  }
  private mapTopic(row: TopicRow): Topic {
    return {
      id: row.id,
      courseId: row.course_id,
      title: row.title,
      status: row.status,
    };
  }
  private mapTask(row: TaskRow): Task {
    return {
      id: row.id,
      courseId: row.course_id,
      title: row.title,
      dueDate: row.due_date,
      priority: row.priority,
      status: row.status,
      course:
        this.coursesState().find((course) => course.id === row.course_id)?.title ??
        'Unknown course',
    };
  }
  private mapNote(row: NoteRow): Note {
    return {
      id: row.id,
      courseId: row.course_id,
      title: row.title,
      course:
        this.coursesState().find((course) => course.id === row.course_id)?.title ??
        'Unknown course',
      content: row.content,
      updatedAt: row.updated_at,
      tags: row.tags,
    };
  }
  private mapStudySession(row: StudySessionRow): StudySession {
    return {
      id: row.id,
      courseId: row.course_id,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      durationMinutes: row.duration_minutes,
      note: row.note ?? undefined,
    };
  }

  private mapResource(row: ResourceRow): CourseResource {
    return {
      id: row.id,
      courseId: row.course_id,
      title: row.title,
      type: row.resource_type,
      source: row.source,
      createdAt: row.created_at,
    };
  }

  async loadProfile(): Promise<string | null> {
    this.profileLoadingState.set(true);
    try {
      const userId = this.authService.user()?.id;
      if (!userId) {
        return 'You need to sign in first.';
      }

      const { data, error } = await this.supabase.client
        .from('profiles')
        .select('name, email, learning_goal, weekly_goal_hours, avatar_url')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return error?.message ?? 'Profile was not found.';
      }
      this.profileState.set(this.mapProfile(data as ProfileRow));

      return null;
    } finally {
      this.profileLoadingState.set(false);
    }
  }

  async updateProfile(changes: ProfileChanges): Promise<string | null> {
    const userId = this.authService.user()?.id;

    if (!userId) {
      return 'You need to sign in first.';
    }

    const { data, error } = await this.supabase.client
      .from('profiles')
      .update({
        name: changes.name,
        learning_goal: changes.learningGoal,
        weekly_goal_hours: changes.weeklyGoalHours,
      })
      .eq('id', userId)
      .select('name, email, learning_goal, weekly_goal_hours, avatar_url')
      .single();

    if (error || !data) {
      return error?.message ?? 'Profile could not be updated.';
    }

    this.profileState.set(this.mapProfile(data as ProfileRow));

    return null;
  }
  async uploadAvatar(file: File): Promise<string | null> {
    const userId = this.authService.user()?.id;

    if (!userId) {
      return 'You need to sign in first.';
    }

    const filePath = `${userId}/avatar`;

    const { error: uploadError } = await this.supabase.client.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: true,
      });
    if (uploadError) {
      return uploadError?.message ?? 'Avatars could not be updated.';
    }
    const { data: publicUrlData } = this.supabase.client.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

    const { data, error } = await this.supabase.client
      .from('profiles')
      .update({
        avatar_url: avatarUrl,
      })
      .eq('id', userId)
      .select('name, email, learning_goal, weekly_goal_hours, avatar_url')
      .single();

    if (error || !data) {
      return error?.message ?? 'Avatar could not be saved.';
    }
    this.profileState.set(this.mapProfile(data as ProfileRow));
    return null;
  }

  async loadCourses(): Promise<string | null> {
    this.coursesLoadingState.set(true);
    this.coursesState.set([]);
    try {
      const userId = this.authService.user()?.id;
      if (!userId) {
        return 'You need to sign in first.';
      }
      const { data, error } = await this.supabase.client
        .from('courses')
        .select('id, title, status, color')
        .order('created_at', { ascending: false })
        .eq('user_id', userId);

      if (error || !data) {
        return error?.message ?? 'Courses were not found.';
      }
      this.coursesState.set(data.map((row) => this.mapCourse(row)));

      return null;
    } finally {
      this.coursesLoadingState.set(false);
    }
  }

  async loadTopics(): Promise<string | null> {
    this.topicsLoadingState.set(true);
    this.courseTopicsState.set([]);
    try {
      const userId = this.authService.user()?.id;
      if (!userId) {
        return 'You need to sign in first.';
      }

      const { data, error } = await this.supabase.client
        .from('topics')
        .select('id, course_id, title, status')
        .order('created_at', { ascending: false })
        .eq('user_id', userId);

      if (error || !data) {
        return error?.message ?? 'Topics were not found.';
      }
      this.courseTopicsState.set(data.map((row) => this.mapTopic(row)));
      this.syncCourseTopicStats();
      return null;
    } finally {
      this.topicsLoadingState.set(false);
    }
  }

  private syncCourseTopicStats() {
    const topics = this.courseTopicsState();

    this.coursesState.update((courses) =>
      courses.map((course) => {
        const courseTopics = topics.filter((topic) => topic.courseId === course.id);
        return {
          ...course,
          totalTopics: courseTopics.length,
          completedTopics: courseTopics.filter((topic) => topic.status === 'done').length,
        };
      }),
    );
  }

  private syncCourseTaskStats() {
    const tasks = this.taskState();

    this.coursesState.update((courses) =>
      courses.map((course) => {
        const courseTasks = tasks.filter((task) => task.courseId === course.id);
        return {
          ...course,
          openTasks: courseTasks.filter((task) => task.status !== 'done').length,
        };
      }),
    );
  }

  async loadTasks(): Promise<string | null> {
    this.tasksLoadingState.set(true);
    this.taskState.set([]);
    try {
      const userId = this.authService.user()?.id;
      if (!userId) {
        return 'You need to sign in first.';
      }

      const { data, error } = await this.supabase.client
        .from('tasks')
        .select('id, course_id, title ,due_date,priority , status')
        .order('created_at', { ascending: false })
        .eq('user_id', userId);

      if (error || !data) {
        return error?.message ?? 'Tasks were not found.';
      }
      this.taskState.set(data.map((row) => this.mapTask(row)));
      this.syncCourseTaskStats();
      return null;
    } finally {
      this.tasksLoadingState.set(false);
    }
  }

  async loadNotes(): Promise<string | null> {
    this.notesLoadingState.set(true);
    this.notesState.set([]);
    try {
      const userId = this.authService.user()?.id;
      if (!userId) {
        return 'You need to sign in first.';
      }

      const { data, error } = await this.supabase.client
        .from('notes')
        .select('id, course_id, title ,content, tags , updated_at')
        .order('updated_at', { ascending: false })
        .eq('user_id', userId);

      if (error || !data) {
        return error?.message ?? 'Notes were not found.';
      }
      this.notesState.set(data.map((row) => this.mapNote(row)));
      return null;
    } finally {
      this.notesLoadingState.set(false);
    }
  }

  async loadResources(): Promise<string | null> {
    this.resourcesLoadingState.set(true);
    this.courseResourcesState.set([]);
    try {
      const userId = this.authService.user()?.id;
      if (!userId) {
        return 'You need to sign in first.';
      }

      const { data, error } = await this.supabase.client
        .from('resources')
        .select('id, course_id, title, resource_type, source, created_at')
        .order('created_at', { ascending: false })
        .eq('user_id', userId);

      if (error || !data) {
        return error?.message ?? 'Resources were not found.';
      }

      this.courseResourcesState.set(data.map((row) => this.mapResource(row)));
      return null;
    } finally {
      this.resourcesLoadingState.set(false);
    }
  }

  async addResource(resource: Omit<CourseResource, 'id' | 'createdAt'>): Promise<string | null> {
    const userId = this.authService.user()?.id;

    if (!userId) {
      return 'You need to sign in first.';
    }

    const { data, error } = await this.supabase.client
      .from('resources')
      .insert({
        user_id: userId,
        course_id: resource.courseId,
        title: resource.title,
        resource_type: resource.type,
        source: resource.source,
      })
      .select('id, course_id, title, resource_type, source, created_at')
      .single();

    if (error || !data) {
      return error?.message ?? 'Resource could not be added.';
    }

    this.courseResourcesState.update((resources) => [
      this.mapResource(data as ResourceRow),
      ...resources,
    ]);
    return null;
  }

  async deleteResource(resource: CourseResource): Promise<string | null> {
    const userId = this.authService.user()?.id;

    const resourceId = resource.id;
    if (!userId) {
      return 'You need to sign in first.';
    }
    const { error } = await this.supabase.client
      .from('resources')
      .delete()
      .eq('id', resourceId)
      .eq('user_id', userId);

    if (error) {
      return error.message;
    }

    this.courseResourcesState.update((resources) =>
      resources.filter((resource) => resource.id !== resourceId),
    );
    if (resource.type === 'pdf') {
      const { error } = await this.supabase.client.storage
        .from('resources')
        .remove([resource.source]);

      if (error) {
        console.error('PDF storage cleanup failed:', error);
      }
    }

    return null;
  }

  async addPdfResource(courseId: string, title: string, file: File): Promise<string | null> {
    const userId = this.authService.user()?.id;

    if (!userId) {
      return 'You need to sign in first.';
    }

    if (file.type !== 'application/pdf') {
      return 'Please choose a PDF file.';
    }

    if (file.size > 10 * 1024 * 1024) {
      return 'The PDF must be smaller than 10 MB.';
    }

    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const filePath = `${userId}/${crypto.randomUUID()}-${safeFileName}`;

    const { error: uploadError } = await this.supabase.client.storage
      .from('resources')
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return uploadError.message ?? 'PDF could not be uploaded.';
    }

    const databaseError = await this.addResource({
      courseId,
      title,
      type: 'pdf',
      source: filePath,
    });

    if (databaseError) {
      await this.supabase.client.storage.from('resources').remove([filePath]);

      return databaseError;
    }

    return null;
  }

  async createPdfSignedUrl(
    filePath: string,
  ): Promise<{ url: string | null; errorMessage: string | null }> {
    const { data, error } = await this.supabase.client.storage
      .from('resources')
      .createSignedUrl(filePath, 60 * 60);

    if (error || !data) {
      return {
        url: null,
        errorMessage: error?.message ?? 'PDF could not be opened.',
      };
    }

    return {
      url: data.signedUrl,
      errorMessage: null,
    };
  }
}
