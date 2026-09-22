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

/** @deprecated Use ShiftType instead */
export type MealShift = ShiftType;
