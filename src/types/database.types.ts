export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      suggestions: {
        Row: {
          id: string;
          ticket_code: string | null;
          shift: Database["public"]["Enums"]["shift_type"];
          category: Database["public"]["Enums"]["suggestion_category"];
          message: string;
          photo_url: string | null;
          status: Database["public"]["Enums"]["ticket_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          // Assigned by the insertion trigger when omitted, null, or blank.
          ticket_code?: string | null;
          shift: Database["public"]["Enums"]["shift_type"];
          category: Database["public"]["Enums"]["suggestion_category"];
          message: string;
          photo_url?: string | null;
          // The insertion trigger always overrides this value with pending.
          status?: Database["public"]["Enums"]["ticket_status"];
          // Omitted timestamps are supplied by PostgreSQL, not the browser.
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ticket_code?: string | null;
          shift?: Database["public"]["Enums"]["shift_type"];
          category?: Database["public"]["Enums"]["suggestion_category"];
          message?: string;
          photo_url?: string | null;
          status?: Database["public"]["Enums"]["ticket_status"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      admins: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name: string;
          role?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ticket_responses: {
        Row: {
          id: string;
          suggestion_id: string;
          responder_email: string;
          response_text: string;
          is_internal: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          suggestion_id: string;
          responder_email: string;
          response_text: string;
          is_internal?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          suggestion_id?: string;
          responder_email?: string;
          response_text?: string;
          is_internal?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ticket_responses_suggestion_id_fkey";
            columns: ["suggestion_id"];
            isOneToOne: false;
            referencedRelation: "suggestions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ticket_responses_responder_email_fkey";
            columns: ["responder_email"];
            isOneToOne: false;
            referencedRelation: "admins";
            referencedColumns: ["email"];
          },
        ];
      };
      submission_rate_limits: {
        Row: {
          id: string;
          rate_hash: string;
          shift: Database["public"]["Enums"]["shift_type"];
          submission_date: string;
          submission_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          rate_hash: string;
          shift: Database["public"]["Enums"]["shift_type"];
          submission_date?: string;
          submission_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          rate_hash?: string;
          shift?: Database["public"]["Enums"]["shift_type"];
          submission_date?: string;
          submission_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      daily_menus: {
        Row: {
          id: string;
          date: string;
          shift: Database["public"]["Enums"]["shift_type"];
          main_dish: string;
          side_dish: string | null;
          beverage: string | null;
          published_by: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          date?: string;
          shift: Database["public"]["Enums"]["shift_type"];
          main_dish: string;
          side_dish?: string | null;
          beverage?: string | null;
          published_by?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          date?: string;
          shift?: Database["public"]["Enums"]["shift_type"];
          main_dish?: string;
          side_dish?: string | null;
          beverage?: string | null;
          published_by?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      menu_ratings: {
        Row: {
          id: string;
          menu_id: string;
          rating_main: number;
          rating_side: number | null;
          rating_beverage: number | null;
          shift: Database["public"]["Enums"]["shift_type"];
          rating_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          menu_id: string;
          rating_main: number;
          rating_side?: number | null;
          rating_beverage?: number | null;
          shift: Database["public"]["Enums"]["shift_type"];
          rating_date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          menu_id?: string;
          rating_main?: number;
          rating_side?: number | null;
          rating_beverage?: number | null;
          shift?: Database["public"]["Enums"]["shift_type"];
          rating_date?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_ratings_menu_id_fkey";
            columns: ["menu_id"];
            isOneToOne: false;
            referencedRelation: "daily_menus";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_rating_limits: {
        Row: {
          id: string;
          rate_hash: string;
          shift: Database["public"]["Enums"]["shift_type"];
          rating_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          rate_hash: string;
          shift: Database["public"]["Enums"]["shift_type"];
          rating_date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          rate_hash?: string;
          shift?: Database["public"]["Enums"]["shift_type"];
          rating_date?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      generate_unique_ticket_code: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      submit_anonymous_suggestion: {
        Args: {
          p_shift: Database["public"]["Enums"]["shift_type"];
          p_category: Database["public"]["Enums"]["suggestion_category"];
          p_message: string;
          p_photo_url?: string | null;
        };
        Returns: Json;
      };
      submit_menu_rating: {
        Args: {
          p_menu_id: string;
          p_shift: Database["public"]["Enums"]["shift_type"];
          p_rating_main: number;
          p_rating_side?: number | null;
          p_rating_beverage?: number | null;
        };
        Returns: Json;
      };
      has_user_rated_today: {
        Args: {
          p_shift: Database["public"]["Enums"]["shift_type"];
        };
        Returns: boolean;
      };
      purge_orphaned_or_old_media: {
        Args: {
          p_days_old?: number;
        };
        Returns: Json;
      };
    };
    Enums: {
      shift_type: "breakfast" | "lunch" | "dinner";
      suggestion_category: "menu" | "hygiene" | "portion" | "service" | "infrastructure";
      ticket_status: "pending" | "in_review" | "resolved";
      /** @deprecated Use shift_type instead */
      meal_shift: "breakfast" | "lunch" | "dinner";
      /** @deprecated Use ticket_status instead */
      suggestion_status: "pending" | "in_review" | "resolved";
    };
    CompositeTypes: { [_ in never]: never };
  };
}

export type ShiftType = Database["public"]["Enums"]["shift_type"];
export type SuggestionCategory = Database["public"]["Enums"]["suggestion_category"];
export type TicketStatus = Database["public"]["Enums"]["ticket_status"];

export type SuggestionRow = Database["public"]["Tables"]["suggestions"]["Row"];
export type SuggestionInsert = Database["public"]["Tables"]["suggestions"]["Insert"];
// Browser submissions contain only user-authored fields.
export type NewSuggestion = Pick<SuggestionInsert, "shift" | "category" | "message" | "photo_url">;
export type SuggestionUpdate = Database["public"]["Tables"]["suggestions"]["Update"];

export type AdminRow = Database["public"]["Tables"]["admins"]["Row"];
export type AdminInsert = Database["public"]["Tables"]["admins"]["Insert"];
export type AdminUpdate = Database["public"]["Tables"]["admins"]["Update"];

export type TicketResponse = Database["public"]["Tables"]["ticket_responses"]["Row"];
export type TicketResponseRow = Database["public"]["Tables"]["ticket_responses"]["Row"];
export type TicketResponseInsert = Database["public"]["Tables"]["ticket_responses"]["Insert"];
export type TicketResponseUpdate = Database["public"]["Tables"]["ticket_responses"]["Update"];

export type SubmissionRateLimitRow = Database["public"]["Tables"]["submission_rate_limits"]["Row"];
export type SubmissionRateLimitInsert = Database["public"]["Tables"]["submission_rate_limits"]["Insert"];
export type SubmissionRateLimitUpdate = Database["public"]["Tables"]["submission_rate_limits"]["Update"];

export type DailyMenuRow = Database["public"]["Tables"]["daily_menus"]["Row"];
export type DailyMenuInsert = Database["public"]["Tables"]["daily_menus"]["Insert"];
export type DailyMenuUpdate = Database["public"]["Tables"]["daily_menus"]["Update"];

export type MenuRatingRow = Database["public"]["Tables"]["menu_ratings"]["Row"];
export type MenuRatingInsert = Database["public"]["Tables"]["menu_ratings"]["Insert"];
export type MenuRatingUpdate = Database["public"]["Tables"]["menu_ratings"]["Update"];

export type MenuRatingLimitRow = Database["public"]["Tables"]["menu_rating_limits"]["Row"];
export type MenuRatingLimitInsert = Database["public"]["Tables"]["menu_rating_limits"]["Insert"];
export type MenuRatingLimitUpdate = Database["public"]["Tables"]["menu_rating_limits"]["Update"];

export interface MenuRatingStats {
  count: number;
  avg_main: number;
  avg_side: number | null;
  avg_beverage: number | null;
  avg_overall: number;
}

export interface DailyMenuWithStats extends DailyMenuRow {
  stats?: MenuRatingStats;
}

/** @deprecated Use ShiftType instead */
export type MealShift = ShiftType;

export interface SubmittedTicketResult {
  id: string;
  ticket_code: string;
  shift: ShiftType;
  category: SuggestionCategory;
  status: TicketStatus;
  created_at: string;
}
