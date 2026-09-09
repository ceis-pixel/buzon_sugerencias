// Provisional schema contract. Replace this file with Supabase CLI output once
// the database migrations exist; these types do not create tables or RLS policies.
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
          ticket_code: string;
          content: string;
          meal_shift: Database["public"]["Enums"]["meal_shift"];
          status: Database["public"]["Enums"]["suggestion_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ticket_code?: string;
          content: string;
          meal_shift: Database["public"]["Enums"]["meal_shift"];
          status?: Database["public"]["Enums"]["suggestion_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ticket_code?: string;
          content?: string;
          meal_shift?: Database["public"]["Enums"]["meal_shift"];
          status?: Database["public"]["Enums"]["suggestion_status"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      admins: {
        Row: {
          id: string;
          full_name: string;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          created_at?: string;
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
    Functions: { [_ in never]: never };
    Enums: {
      meal_shift: "breakfast" | "lunch" | "dinner";
      suggestion_status: "pending" | "in_review" | "resolved";
    };
    CompositeTypes: { [_ in never]: never };
  };
}
