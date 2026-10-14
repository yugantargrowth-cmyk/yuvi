// lib/supabaseAuth.ts — Single-Owner Supabase Authentication & RLS Session Manager
// Protects all PostgREST endpoints and guarantees owner isolation (auth.uid() = owner_id).

import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from "./supabaseClient";

export interface OwnerSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

const STORAGE_SESSION_KEY = "yuvi:owner_session_v1";

export class SupabaseAuthManager {
  private currentSession: OwnerSession | null = null;
  private supabaseUrl: string;
  private anonKey: string;

  constructor(url: string = DEFAULT_SUPABASE_URL, anonKey: string = DEFAULT_SUPABASE_ANON_KEY) {
    this.supabaseUrl = url.trim().replace(/\/$/, "");
    this.anonKey = anonKey.trim();
    this.loadSessionFromStorage();
  }

  private loadSessionFromStorage(): void {
    try {
      if (typeof window === "undefined" || !window.localStorage) return;
      const raw = localStorage.getItem(STORAGE_SESSION_KEY);
      if (raw) {
        const session: OwnerSession = JSON.parse(raw);
        // Verify expiry
        if (session.expiresAt && session.expiresAt > Date.now()) {
          this.currentSession = session;
        } else {
          this.currentSession = null;
          localStorage.removeItem(STORAGE_SESSION_KEY);
        }
      }
    } catch {
      this.currentSession = null;
    }
  }

  public saveSession(session: OwnerSession): void {
    this.currentSession = session;
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
      }
    } catch {
      // storage error fallback
    }
  }

  public clearSession(): void {
    this.currentSession = null;
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.removeItem(STORAGE_SESSION_KEY);
      }
    } catch {
      // ignore
    }
  }

  public getSession(): OwnerSession | null {
    if (!this.currentSession) {
      this.loadSessionFromStorage();
    }
    return this.currentSession;
  }

  public isAuthenticated(): boolean {
    const session = this.getSession();
    return Boolean(session && session.accessToken && session.expiresAt > Date.now());
  }

  public getOwnerId(): string | null {
    const session = this.getSession();
    return session ? session.user.id : null;
  }

  /**
   * Returns HTTP headers for Supabase PostgREST queries.
   * If authenticated, passes the user's JWT so auth.uid() equals owner_id.
   * If unauthenticated, passes ONLY the public anon key.
   * Under Row Level Security, unauthenticated anon queries return 0 rows.
   */
  public getHeaders(): Record<string, string> {
    const session = this.getSession();
    if (session && session.accessToken) {
      return {
        apikey: this.anonKey,
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      };
    }

    // Unauthenticated public anon query
    return {
      apikey: this.anonKey,
      Authorization: `Bearer ${this.anonKey}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Authenticate owner using email and password via Supabase Auth GoTrue endpoint.
   */
  public async signInWithPassword(email: string, password: string): Promise<{ ok: boolean; session?: OwnerSession; error?: string }> {
    try {
      const res = await fetch(`${this.supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          apikey: this.anonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { ok: false, error: err.error_description || err.message || `Auth failed: ${res.status}` };
      }

      const data = await res.json();
      const expiresAt = Date.now() + (data.expires_in || 3600) * 1000;
      const session: OwnerSession = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt,
        user: {
          id: data.user.id,
          email: data.user.email,
          role: data.user.role || "authenticated",
        },
      };

      this.saveSession(session);
      return { ok: true, session };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Establish a deterministic offline owner session for local testing / PWA offline usage.
   */
  public initializeLocalOwner(ownerId: string = "yugantar-owner-shlok", email: string = "shlok@yugantargrowth.com"): OwnerSession {
    const session: OwnerSession = {
      accessToken: `local_owner_token_${ownerId}`,
      expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
      user: {
        id: ownerId,
        email,
        role: "owner",
      },
    };
    this.saveSession(session);
    return session;
  }
}

export const supabaseAuth = new SupabaseAuthManager();
