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
          ticket_code?: string | null;
          shift: Database["public"]["Enums"]["shift_type"];
          category: Database["public"]["Enums"]["suggestion_category"];
          message: string;
          photo_url?: string | null;
          status?: Database["public"]["Enums"]["ticket_status"];
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
          admin_id: string;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          suggestion_id: string;
          admin_id: string;
          message: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          suggestion_id?: string;
          admin_id?: string;
          message?: string;
          created_at?: string;
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
            foreignKeyName: "ticket_responses_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "admins";
            referencedColumns: ["id"];
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
export type SuggestionUpdate = Database["public"]["Tables"]["suggestions"]["Update"];

export type AdminRow = Database["public"]["Tables"]["admins"]["Row"];
export type AdminInsert = Database["public"]["Tables"]["admins"]["Insert"];
export type AdminUpdate = Database["public"]["Tables"]["admins"]["Update"];

/** @deprecated Use ShiftType instead */
export type MealShift = ShiftType;
