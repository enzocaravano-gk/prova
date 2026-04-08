export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      profiles: {
        Row: { id: string; user_id: string; full_name: string | null; email: string | null; phone: string | null; created_at: string }
        Insert: { id?: string; user_id: string; full_name?: string | null; email?: string | null; phone?: string | null; created_at?: string }
        Update: { id?: string; user_id?: string; full_name?: string | null; email?: string | null; phone?: string | null; created_at?: string }
        Relationships: []
      }
      user_roles: {
        Row: { id: string; user_id: string; role: Database["public"]["Enums"]["app_role"] }
        Insert: { id?: string; user_id: string; role: Database["public"]["Enums"]["app_role"] }
        Update: { id?: string; user_id?: string; role?: Database["public"]["Enums"]["app_role"] }
        Relationships: []
      }
      societies: {
        Row: { id: string; name: string; director_id: string; created_at: string }
        Insert: { id?: string; name: string; director_id: string; created_at?: string }
        Update: { id?: string; name?: string; director_id?: string; created_at?: string }
        Relationships: []
      }
      teams: {
        Row: { id: string; name: string; society_id: string; created_at: string }
        Insert: { id?: string; name: string; society_id: string; created_at?: string }
        Update: { id?: string; name?: string; society_id?: string; created_at?: string }
        Relationships: [{ foreignKeyName: "teams_society_id_fkey"; columns: ["society_id"]; isOneToOne: false; referencedRelation: "societies"; referencedColumns: ["id"] }]
      }
      team_coaches: {
        Row: { id: string; team_id: string; coach_id: string; created_at: string }
        Insert: { id?: string; team_id: string; coach_id: string; created_at?: string }
        Update: { id?: string; team_id?: string; coach_id?: string; created_at?: string }
        Relationships: [{ foreignKeyName: "team_coaches_team_id_fkey"; columns: ["team_id"]; isOneToOne: false; referencedRelation: "teams"; referencedColumns: ["id"] }]
      }
      athletes: {
        Row: { id: string; team_id: string; full_name: string; birth_date: string | null; position: string | null; jersey_number: number | null; created_at: string }
        Insert: { id?: string; team_id: string; full_name: string; birth_date?: string | null; position?: string | null; jersey_number?: number | null; created_at?: string }
        Update: { id?: string; team_id?: string; full_name?: string; birth_date?: string | null; position?: string | null; jersey_number?: number | null; created_at?: string }
        Relationships: [{ foreignKeyName: "athletes_team_id_fkey"; columns: ["team_id"]; isOneToOne: false; referencedRelation: "teams"; referencedColumns: ["id"] }]
      }
      training_sessions: {
        Row: { id: string; team_id: string; coach_id: string | null; date: string; type: string; duration_min: number; notes: string | null; created_at: string }
        Insert: { id?: string; team_id: string; coach_id?: string | null; date: string; type?: string; duration_min?: number; notes?: string | null; created_at?: string }
        Update: { id?: string; team_id?: string; coach_id?: string | null; date?: string; type?: string; duration_min?: number; notes?: string | null; created_at?: string }
        Relationships: [{ foreignKeyName: "training_sessions_team_id_fkey"; columns: ["team_id"]; isOneToOne: false; referencedRelation: "teams"; referencedColumns: ["id"] }]
      }
      training_attendances: {
        Row: { id: string; session_id: string; athlete_id: string; present: boolean }
        Insert: { id?: string; session_id: string; athlete_id: string; present?: boolean }
        Update: { id?: string; session_id?: string; athlete_id?: string; present?: boolean }
        Relationships: [{ foreignKeyName: "training_attendances_session_id_fkey"; columns: ["session_id"]; isOneToOne: false; referencedRelation: "training_sessions"; referencedColumns: ["id"] }, { foreignKeyName: "training_attendances_athlete_id_fkey"; columns: ["athlete_id"]; isOneToOne: false; referencedRelation: "athletes"; referencedColumns: ["id"] }]
      }
      matches: {
        Row: { id: string; team_id: string; coach_id: string | null; date: string; opponent: string; type: string; venue: string; goals_for: number; goals_against: number; notes: string | null; created_at: string }
        Insert: { id?: string; team_id: string; coach_id?: string | null; date: string; opponent: string; type?: string; venue?: string; goals_for?: number; goals_against?: number; notes?: string | null; created_at?: string }
        Update: { id?: string; team_id?: string; coach_id?: string | null; date?: string; opponent?: string; type?: string; venue?: string; goals_for?: number; goals_against?: number; notes?: string | null; created_at?: string }
        Relationships: [{ foreignKeyName: "matches_team_id_fkey"; columns: ["team_id"]; isOneToOne: false; referencedRelation: "teams"; referencedColumns: ["id"] }]
      }
      match_scorers: {
        Row: { id: string; match_id: string; athlete_id: string; goals: number }
        Insert: { id?: string; match_id: string; athlete_id: string; goals?: number }
        Update: { id?: string; match_id?: string; athlete_id?: string; goals?: number }
        Relationships: [{ foreignKeyName: "match_scorers_match_id_fkey"; columns: ["match_id"]; isOneToOne: false; referencedRelation: "matches"; referencedColumns: ["id"] }]
      }
      match_assists: {
        Row: { id: string; match_id: string; athlete_id: string; assists: number }
        Insert: { id?: string; match_id: string; athlete_id: string; assists?: number }
        Update: { id?: string; match_id?: string; athlete_id?: string; assists?: number }
        Relationships: [{ foreignKeyName: "match_assists_match_id_fkey"; columns: ["match_id"]; isOneToOne: false; referencedRelation: "matches"; referencedColumns: ["id"] }]
      }
      match_goalkeepers: {
        Row: { id: string; match_id: string; athlete_id: string; goals_conceded: number }
        Insert: { id?: string; match_id: string; athlete_id: string; goals_conceded?: number }
        Update: { id?: string; match_id?: string; athlete_id?: string; goals_conceded?: number }
        Relationships: [{ foreignKeyName: "match_goalkeepers_match_id_fkey"; columns: ["match_id"]; isOneToOne: false; referencedRelation: "matches"; referencedColumns: ["id"] }]
      }
      jump_tests: {
        Row: { id: string; athlete_id: string; team_id: string; coach_id: string | null; test_type: string; is_long_jump: boolean; avg_height_cm: number | null; best_height_cm: number | null; flight_time_s: number | null; takeoff_speed: number | null; distance_cm: number | null; date: string; notes: string | null; created_at: string }
        Insert: { id?: string; athlete_id: string; team_id: string; coach_id?: string | null; test_type?: string; is_long_jump?: boolean; avg_height_cm?: number | null; best_height_cm?: number | null; flight_time_s?: number | null; takeoff_speed?: number | null; distance_cm?: number | null; date?: string; notes?: string | null; created_at?: string }
        Update: { id?: string; athlete_id?: string; team_id?: string; coach_id?: string | null; test_type?: string; is_long_jump?: boolean; avg_height_cm?: number | null; best_height_cm?: number | null; flight_time_s?: number | null; takeoff_speed?: number | null; distance_cm?: number | null; date?: string; notes?: string | null; created_at?: string }
        Relationships: [{ foreignKeyName: "jump_tests_athlete_id_fkey"; columns: ["athlete_id"]; isOneToOne: false; referencedRelation: "athletes"; referencedColumns: ["id"] }]
      }
      posture_sessions: {
        Row: { id: string; athlete_id: string; team_id: string; coach_id: string | null; label: string | null; date: string; checks: Json; photo_front: string | null; photo_back: string | null; photo_dx: string | null; photo_sx: string | null; notes: string | null; created_at: string }
        Insert: { id?: string; athlete_id: string; team_id: string; coach_id?: string | null; label?: string | null; date?: string; checks?: Json; photo_front?: string | null; photo_back?: string | null; photo_dx?: string | null; photo_sx?: string | null; notes?: string | null; created_at?: string }
        Update: { id?: string; athlete_id?: string; team_id?: string; coach_id?: string | null; label?: string | null; date?: string; checks?: Json; photo_front?: string | null; photo_back?: string | null; photo_dx?: string | null; photo_sx?: string | null; notes?: string | null; created_at?: string }
        Relationships: [{ foreignKeyName: "posture_sessions_athlete_id_fkey"; columns: ["athlete_id"]; isOneToOne: false; referencedRelation: "athletes"; referencedColumns: ["id"] }]
      }
    }
    Views: {
      athlete_stats: {
        Row: { athlete_id: string | null; team_id: string | null; full_name: string | null; position: string | null; jersey_number: number | null; training_presences: number | null; training_sessions_total: number | null; goals_scored: number | null; assists: number | null; goals_conceded: number | null; jump_tests_count: number | null; best_jump_cm: number | null; posture_sessions_count: number | null }
        Relationships: []
      }
    }
    Functions: {
      find_coach_by_email: { Args: { _email: string }; Returns: string }
      get_profile_name: { Args: { _user_id: string }; Returns: string }
      get_profile_phone: { Args: { _user_id: string }; Returns: string }
      get_user_role: { Args: { _user_id: string }; Returns: Database["public"]["Enums"]["app_role"] }
      get_user_society_id: { Args: { _user_id: string }; Returns: string }
      get_team_society_id: { Args: { _team_id: string }; Returns: string }
      has_role: { Args: { _role: Database["public"]["Enums"]["app_role"]; _user_id: string }; Returns: boolean }
      is_coach_of_team: { Args: { _team_id: string; _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "coach" | "director"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<T extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])> =
  (DefaultSchema["Tables"] & DefaultSchema["Views"])[T] extends { Row: infer R } ? R : never

export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Insert: infer I } ? I : never

export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Update: infer U } ? U : never

export type Enums<T extends keyof DefaultSchema["Enums"]> = DefaultSchema["Enums"][T]

export const Constants = {
  public: {
    Enums: {
      app_role: ["coach", "director"],
    },
  },
} as const
