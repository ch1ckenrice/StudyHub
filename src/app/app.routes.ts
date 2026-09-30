import { Routes } from '@angular/router';
import { AppLayout } from './layouts/app-layout/app-layout';
import { Login } from './features/auth/pages/login/login';
import { Register } from './features/auth/pages/register/register';
import Dashboard from './features/dashboard/dashboard';
import { Courses } from './features/courses/courses';
import { Tasks } from './features/tasks/tasks';
import { Notes } from './features/notes/notes';
import { CourseDetails } from './features/courses/pages/course-details/course-details';
import { Settings } from './features/settings/settings';
import { authGuard } from './core/guards/auth.guard';
import { StudyHistory } from './features/study-sessions/pages/study-history/study-history';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'app/dashboard',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: Login,
  },
  {
    path: 'register',
    component: Register,
  },
  {
    path: 'app',
    component: AppLayout,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        component: Dashboard,
      },
      {
        path: 'courses',
        component: Courses,
      },
      {
        path: 'tasks',
        component: Tasks,
      },
      {
        path: 'notes',
        component: Notes,
      },
      {
        path: 'courses/:id',
        component: CourseDetails,
      },
      {
        path: 'profile',
        component: Settings,
      },
      {
        path: 'sessions',
        component: StudyHistory,
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'app/dashboard',
  },
];
