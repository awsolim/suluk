export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          global_role: "platform_admin" | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          global_role?: "platform_admin" | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          global_role?: "platform_admin" | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: []; // Required so Supabase table typing works correctly.
      };

      mosques: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: []; // Required so Supabase table typing works correctly.
      };

      mosque_memberships: {
        Row: {
          id: string;
          mosque_id: string;
          profile_id: string;
          role: "mosque_admin" | "teacher" | "student";
          created_at: string;
        };
        Insert: {
          id?: string;
          mosque_id: string;
          profile_id: string;
          role: "mosque_admin" | "teacher" | "student";
          created_at?: string;
        };
        Update: {
          id?: string;
          mosque_id?: string;
          profile_id?: string;
          role?: "mosque_admin" | "teacher" | "student";
          created_at?: string;
        };
        Relationships: []; // Required so Supabase table typing works correctly.
      };

      programs: {
        Row: {
          id: string;
          mosque_id: string;
          teacher_profile_id: string | null;
          title: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mosque_id: string;
          teacher_profile_id?: string | null;
          title: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          mosque_id?: string;
          teacher_profile_id?: string | null;
          title?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: []; // Required so Supabase table typing works correctly.
      };

      enrollments: {
        Row: {
          id: string;
          program_id: string;
          student_profile_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          program_id: string;
          student_profile_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          program_id?: string;
          student_profile_id?: string;
          created_at?: string;
        };
        Relationships: []; // Required so Supabase table typing works correctly.
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};