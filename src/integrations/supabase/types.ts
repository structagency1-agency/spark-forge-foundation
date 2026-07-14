export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          checked_in_at: string
          created_at: string
          event_id: string
          id: string
          metadata: Json
          method: Database["public"]["Enums"]["attendance_method"]
          participant_id: string
          updated_at: string
        }
        Insert: {
          checked_in_at?: string
          created_at?: string
          event_id: string
          id?: string
          metadata?: Json
          method?: Database["public"]["Enums"]["attendance_method"]
          participant_id: string
          updated_at?: string
        }
        Update: {
          checked_in_at?: string
          created_at?: string
          event_id?: string
          id?: string
          metadata?: Json
          method?: Database["public"]["Enums"]["attendance_method"]
          participant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_label: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json
          module: string
          occurred_at: string
          updated_at: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          module: string
          occurred_at?: string
          updated_at?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          module?: string
          occurred_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      certificate_templates: {
        Row: {
          created_at: string
          fields: Json
          id: string
          name: string
          status: Database["public"]["Enums"]["content_status"]
          template_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          fields?: Json
          id?: string
          name: string
          status?: Database["public"]["Enums"]["content_status"]
          template_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          fields?: Json
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["content_status"]
          template_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          created_at: string
          event_id: string
          id: string
          issued_at: string
          participant_id: string
          template_id: string | null
          type: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          issued_at?: string
          participant_id: string
          template_id?: string | null
          type?: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          issued_at?: string
          participant_id?: string
          template_id?: string | null
          type?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
          read_at: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message: string
          name: string
          read_at?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
          read_at?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          payload: Json
          recipient: string
          sent_at: string | null
          status: Database["public"]["Enums"]["email_status"]
          subject: string
          template_key: Database["public"]["Enums"]["email_template_key"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json
          recipient: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status"]
          subject: string
          template_key: Database["public"]["Enums"]["email_template_key"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json
          recipient?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status"]
          subject?: string
          template_key?: Database["public"]["Enums"]["email_template_key"]
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          is_active: boolean
          key: string
          name: string
          subject: string
          updated_at: string
          variables: Json
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          name: string
          subject: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          subject?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      evaluations: {
        Row: {
          created_at: string
          event_id: string
          id: string
          jury_id: string | null
          remarks: string | null
          round: string
          scores: Json
          team_id: string
          total: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          jury_id?: string | null
          remarks?: string | null
          round?: string
          scores?: Json
          team_id: string
          total?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          jury_id?: string | null
          remarks?: string | null
          round?: string
          scores?: Json
          team_id?: string
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_jury_id_fkey"
            columns: ["jury_id"]
            isOneToOne: false
            referencedRelation: "jury_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          banner_url: string | null
          created_at: string
          department_id: string
          description: string | null
          event_date: string | null
          id: string
          is_archived: boolean
          is_published: boolean
          max_participants: number | null
          max_team_size: number
          metadata: Json
          min_team_size: number
          name: string
          registration_close: string | null
          registration_start: string | null
          slug: string
          status: Database["public"]["Enums"]["event_status"]
          updated_at: string
          venue: string | null
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          department_id: string
          description?: string | null
          event_date?: string | null
          id?: string
          is_archived?: boolean
          is_published?: boolean
          max_participants?: number | null
          max_team_size?: number
          metadata?: Json
          min_team_size?: number
          name: string
          registration_close?: string | null
          registration_start?: string | null
          slug: string
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
          venue?: string | null
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          department_id?: string
          description?: string | null
          event_date?: string | null
          id?: string
          is_archived?: boolean
          is_published?: boolean
          max_participants?: number | null
          max_team_size?: number
          metadata?: Json
          min_team_size?: number
          name?: string
          registration_close?: string | null
          registration_start?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          id: string
          is_active: boolean
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      gallery: {
        Row: {
          caption: string | null
          created_at: string
          event_id: string | null
          id: string
          media_type: Database["public"]["Enums"]["media_type"]
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          uploaded_at: string
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          media_type?: Database["public"]["Enums"]["media_type"]
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          uploaded_at?: string
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          media_type?: Database["public"]["Enums"]["media_type"]
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          uploaded_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_content: {
        Row: {
          content: Json
          created_at: string
          id: string
          is_active: boolean
          section_key: string
          sort_order: number
          title: string | null
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          section_key: string
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          section_key?: string
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      jury_assignments: {
        Row: {
          created_at: string
          event_id: string
          id: string
          jury_email: string
          jury_name: string
          metadata: Json
          round: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          jury_email: string
          jury_name: string
          metadata?: Json
          round?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          jury_email?: string
          jury_name?: string
          metadata?: Json
          round?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jury_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          created_at: string
          department_id: string | null
          email: string
          full_name: string
          id: string
          metadata: Json
          phone: string | null
          roll_number: string | null
          updated_at: string
          year_of_study: number | null
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          email: string
          full_name: string
          id?: string
          metadata?: Json
          phone?: string | null
          roll_number?: string | null
          updated_at?: string
          year_of_study?: number | null
        }
        Update: {
          created_at?: string
          department_id?: string | null
          email?: string
          full_name?: string
          id?: string
          metadata?: Json
          phone?: string | null
          roll_number?: string | null
          updated_at?: string
          year_of_study?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "participants_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      problem_statements: {
        Row: {
          created_at: string
          description: string | null
          document_url: string | null
          event_id: string | null
          id: string
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
          uploaded_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_url?: string | null
          event_id?: string | null
          id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
          uploaded_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          document_url?: string | null
          event_id?: string | null
          id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "problem_statements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          created_at: string
          email_status: string
          event_id: string
          id: string
          metadata: Json
          qr_token: string | null
          registered_at: string
          registration_code: string | null
          status: Database["public"]["Enums"]["registration_status"]
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_status?: string
          event_id: string
          id?: string
          metadata?: Json
          qr_token?: string | null
          registered_at?: string
          registration_code?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_status?: string
          event_id?: string
          id?: string
          metadata?: Json
          qr_token?: string | null
          registered_at?: string
          registration_code?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          data: Json
          generated_at: string
          id: string
          title: string | null
          type: Database["public"]["Enums"]["report_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          generated_at?: string
          id?: string
          title?: string | null
          type: Database["public"]["Enums"]["report_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          generated_at?: string
          id?: string
          title?: string | null
          type?: Database["public"]["Enums"]["report_type"]
          updated_at?: string
        }
        Relationships: []
      }
      results: {
        Row: {
          created_at: string
          data: Json
          event_id: string
          id: string
          is_published: boolean
          published_at: string | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          event_id: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          event_id?: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "results_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      sponsors: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          priority: number
          status: Database["public"]["Enums"]["content_status"]
          tier: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          priority?: number
          status?: Database["public"]["Enums"]["content_status"]
          tier?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          priority?: number
          status?: Database["public"]["Enums"]["content_status"]
          tier?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          academic_year: string | null
          branch: string | null
          created_at: string
          id: string
          participant_id: string
          registration_number: string | null
          role: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          academic_year?: string | null
          branch?: string | null
          created_at?: string
          id?: string
          participant_id: string
          registration_number?: string | null
          role?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          academic_year?: string | null
          branch?: string | null
          created_at?: string
          id?: string
          participant_id?: string
          registration_number?: string | null
          role?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          academic_year: string | null
          created_at: string
          department_id: string | null
          event_id: string
          id: string
          leader_participant_id: string | null
          metadata: Json
          name: string
          updated_at: string
        }
        Insert: {
          academic_year?: string | null
          created_at?: string
          department_id?: string | null
          event_id: string
          id?: string
          leader_participant_id?: string | null
          metadata?: Json
          name: string
          updated_at?: string
        }
        Update: {
          academic_year?: string | null
          created_at?: string
          department_id?: string | null
          event_id?: string
          id?: string
          leader_participant_id?: string | null
          metadata?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_leader_participant_id_fkey"
            columns: ["leader_participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline: {
        Row: {
          created_at: string
          description: string | null
          event_date: string | null
          icon: string | null
          id: string
          sequence_order: number
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_date?: string | null
          icon?: string | null
          id?: string
          sequence_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_date?: string | null
          icon?: string | null
          id?: string
          sequence_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      winner_list: {
        Row: {
          citation: string | null
          created_at: string
          event_id: string
          id: string
          position: Database["public"]["Enums"]["winner_position"]
          prize: string | null
          team_id: string | null
          team_name_snapshot: string | null
          updated_at: string
        }
        Insert: {
          citation?: string | null
          created_at?: string
          event_id: string
          id?: string
          position: Database["public"]["Enums"]["winner_position"]
          prize?: string | null
          team_id?: string | null
          team_name_snapshot?: string | null
          updated_at?: string
        }
        Update: {
          citation?: string | null
          created_at?: string
          event_id?: string
          id?: string
          position?: Database["public"]["Enums"]["winner_position"]
          prize?: string | null
          team_id?: string | null
          team_name_snapshot?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "winner_list_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "winner_list_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_stats: { Args: never; Returns: Json }
      event_capacity: { Args: { _event_id: string }; Returns: Json }
      generate_registration_code: { Args: never; Returns: string }
      lookup_registration_by_code: { Args: { _code: string }; Returns: Json }
      lookup_registrations_by_email: { Args: { _email: string }; Returns: Json }
      register_team: { Args: { payload: Json }; Returns: Json }
    }
    Enums: {
      attendance_method: "qr" | "manual" | "import"
      content_status: "active" | "inactive"
      email_status: "pending" | "sent" | "failed"
      email_template_key:
        | "registration"
        | "reminder"
        | "certificate"
        | "winner_announcement"
        | "password_reset"
        | "notification"
      event_status:
        | "upcoming"
        | "registration_open"
        | "registration_closed"
        | "ongoing"
        | "evaluation"
        | "completed"
      media_type: "image" | "video"
      registration_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "waitlisted"
        | "attended"
        | "evaluated"
        | "completed"
      report_type:
        | "registrations"
        | "attendance"
        | "evaluations"
        | "certificates"
        | "results"
      winner_position:
        | "winner"
        | "runner_up"
        | "second_runner_up"
        | "special_mention"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      attendance_method: ["qr", "manual", "import"],
      content_status: ["active", "inactive"],
      email_status: ["pending", "sent", "failed"],
      email_template_key: [
        "registration",
        "reminder",
        "certificate",
        "winner_announcement",
        "password_reset",
        "notification",
      ],
      event_status: [
        "upcoming",
        "registration_open",
        "registration_closed",
        "ongoing",
        "evaluation",
        "completed",
      ],
      media_type: ["image", "video"],
      registration_status: [
        "pending",
        "confirmed",
        "cancelled",
        "waitlisted",
        "attended",
        "evaluated",
        "completed",
      ],
      report_type: [
        "registrations",
        "attendance",
        "evaluations",
        "certificates",
        "results",
      ],
      winner_position: [
        "winner",
        "runner_up",
        "second_runner_up",
        "special_mention",
      ],
    },
  },
} as const
