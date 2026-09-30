import { computed, inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Session } from '@supabase/supabase-js';

export interface SignUpResult {
  errorMessage: string | null;
  requiresEmailConfirmation: boolean;
}
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly supabase = inject(SupabaseService);

  readonly session = signal<Session | null>(null);
  readonly isInitialized = signal(false);

  readonly user = computed(() => this.session()?.user ?? null);
  readonly isAuthenticated = computed(() => this.user() !== null);

  constructor() {
    void this.initializeSession();

    this.supabase.client.auth.onAuthStateChange((_event, session) => {
      this.session.set(session);
      this.isInitialized.set(true);
    });
  }

  async signUp(name: string, email: string, password: string): Promise<SignUpResult> {
    const { data, error } = await this.supabase.client.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    return {
      errorMessage: error?.message ?? null,
      requiresEmailConfirmation: !error && !data.session,
    };
  }

  async signIn(email: string, password: string): Promise<string | null> {
    const { error } = await this.supabase.client.auth.signInWithPassword({
      email,
      password,
    });
    return error?.message ?? null;
  }

  async signOut(): Promise<string | null> {
    const { error } = await this.supabase.client.auth.signOut();

    if (!error) {
      this.session.set(null);
    }
    return error?.message ?? null;
  }

  private async initializeSession(): Promise<void> {
    const {
      data: { session },
    } = await this.supabase.client.auth.getSession();

    this.session.set(session);
    this.isInitialized.set(true);
  }
}
