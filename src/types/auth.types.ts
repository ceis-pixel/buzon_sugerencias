export type AuthErrorCode =
  | "domain_not_allowed"
  | "oauth_callback_error"
  | "session_missing"
  | "unknown_error";

export interface AuthErrorDetails {
  code: AuthErrorCode;
  title: string;
  message: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
}

export interface AuthSessionState {
  user: AuthUser | null;
  isLoading: boolean;
  error: AuthErrorCode | null;
}
