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
      announcements: {
        Row: {
          created_at: string
          description: string
          display_location: string
          ends_at: string | null
          id: string
          metadata: Json
          priority: Database["public"]["Enums"]["announcement_priority"]
          starts_at: string | null
          status: Database["public"]["Enums"]["announcement_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          display_location?: string
          ends_at?: string | null
          id?: string
          metadata?: Json
          priority?: Database["public"]["Enums"]["announcement_priority"]
          starts_at?: string | null
          status?: Database["public"]["Enums"]["announcement_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          display_location?: string
          ends_at?: string | null
          id?: string
          metadata?: Json
          priority?: Database["public"]["Enums"]["announcement_priority"]
          starts_at?: string | null
          status?: Database["public"]["Enums"]["announcement_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          checked_in_at: string
          created_at: string
          event_id: string
          id: string
          metadata: Json
          method: Database["public"]["Enums"]["attendance_method"]
          participant_id: string | null
          registration_id: string | null
          remarks: string | null
          status: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          checked_in_at?: string
          created_at?: string
          event_id: string
          id?: string
          metadata?: Json
          method?: Database["public"]["Enums"]["attendance_method"]
          participant_id?: string | null
          registration_id?: string | null
          remarks?: string | null
          status?: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          checked_in_at?: string
          created_at?: string
          event_id?: string
          id?: string
          metadata?: Json
          method?: Database["public"]["Enums"]["attendance_method"]
          participant_id?: string | null
          registration_id?: string | null
          remarks?: string | null
          status?: string
          team_id?: string | null
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
          {
            foreignKeyName: "attendance_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
          background_image_url: string | null
          created_at: string
          fields: Json
          id: string
          issue_date: string | null
          logo_url: string | null
          name: string
          signature_image_url: string | null
          status: Database["public"]["Enums"]["content_status"]
          template_url: string | null
          type: string
          updated_at: string
        }
        Insert: {
          background_image_url?: string | null
          created_at?: string
          fields?: Json
          id?: string
          issue_date?: string | null
          logo_url?: string | null
          name: string
          signature_image_url?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          template_url?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          background_image_url?: string | null
          created_at?: string
          fields?: Json
          id?: string
          issue_date?: string | null
          logo_url?: string | null
          name?: string
          signature_image_url?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          template_url?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          certificate_code: string | null
          created_at: string
          download_count: number
          downloaded_at: string | null
          event_id: string
          id: string
          issued_at: string
          metadata: Json
          participant_id: string
          registration_id: string | null
          status: string
          team_id: string | null
          template_id: string | null
          type: string
          updated_at: string
          url: string | null
          verification_count: number
          verified_at: string | null
        }
        Insert: {
          certificate_code?: string | null
          created_at?: string
          download_count?: number
          downloaded_at?: string | null
          event_id: string
          id?: string
          issued_at?: string
          metadata?: Json
          participant_id: string
          registration_id?: string | null
          status?: string
          team_id?: string | null
          template_id?: string | null
          type?: string
          updated_at?: string
          url?: string | null
          verification_count?: number
          verified_at?: string | null
        }
        Update: {
          certificate_code?: string | null
          created_at?: string
          download_count?: number
          downloaded_at?: string | null
          event_id?: string
          id?: string
          issued_at?: string
          metadata?: Json
          participant_id?: string
          registration_id?: string | null
          status?: string
          team_id?: string | null
          template_id?: string | null
          type?: string
          updated_at?: string
          url?: string | null
          verification_count?: number
          verified_at?: string | null
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
            foreignKeyName: "certificates_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
      evaluation_criteria: {
        Row: {
          created_at: string
          description: string | null
          event_id: string | null
          id: string
          max_marks: number
          name: string
          sort_order: number
          status: Database["public"]["Enums"]["jury_status"]
          updated_at: string
          weightage: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id?: string | null
          id?: string
          max_marks?: number
          name: string
          sort_order?: number
          status?: Database["public"]["Enums"]["jury_status"]
          updated_at?: string
          weightage?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: string | null
          id?: string
          max_marks?: number
          name?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["jury_status"]
          updated_at?: string
          weightage?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_criteria_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_scores: {
        Row: {
          created_at: string
          criterion_id: string
          evaluation_id: string
          id: string
          marks: number
          remarks: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          criterion_id: string
          evaluation_id: string
          id?: string
          marks?: number
          remarks?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          criterion_id?: string
          evaluation_id?: string
          id?: string
          marks?: number
          remarks?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_scores_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "evaluation_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_scores_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          created_at: string
          event_id: string
          id: string
          is_locked: boolean
          jury_id: string
          max_score: number
          overall_comments: string | null
          percentage: number
          recommendation:
            | Database["public"]["Enums"]["evaluation_recommendation"]
            | null
          registration_id: string | null
          round: string
          status: Database["public"]["Enums"]["evaluation_status"]
          submitted_at: string | null
          team_id: string
          total_score: number
          updated_at: string
          weighted_score: number
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          is_locked?: boolean
          jury_id: string
          max_score?: number
          overall_comments?: string | null
          percentage?: number
          recommendation?:
            | Database["public"]["Enums"]["evaluation_recommendation"]
            | null
          registration_id?: string | null
          round?: string
          status?: Database["public"]["Enums"]["evaluation_status"]
          submitted_at?: string | null
          team_id: string
          total_score?: number
          updated_at?: string
          weighted_score?: number
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          is_locked?: boolean
          jury_id?: string
          max_score?: number
          overall_comments?: string | null
          percentage?: number
          recommendation?:
            | Database["public"]["Enums"]["evaluation_recommendation"]
            | null
          registration_id?: string | null
          round?: string
          status?: Database["public"]["Enums"]["evaluation_status"]
          submitted_at?: string | null
          team_id?: string
          total_score?: number
          updated_at?: string
          weighted_score?: number
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
            referencedRelation: "jury_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
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
      jury_event_assignments: {
        Row: {
          created_at: string
          event_id: string
          id: string
          jury_id: string
          round: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          jury_id: string
          round?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          jury_id?: string
          round?: string
        }
        Relationships: [
          {
            foreignKeyName: "jury_event_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jury_event_assignments_jury_id_fkey"
            columns: ["jury_id"]
            isOneToOne: false
            referencedRelation: "jury_members"
            referencedColumns: ["id"]
          },
        ]
      }
      jury_members: {
        Row: {
          created_at: string
          designation: string | null
          email: string
          expertise: string | null
          full_name: string
          id: string
          metadata: Json
          mobile: string | null
          organization: string | null
          status: Database["public"]["Enums"]["jury_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          designation?: string | null
          email: string
          expertise?: string | null
          full_name: string
          id?: string
          metadata?: Json
          mobile?: string | null
          organization?: string | null
          status?: Database["public"]["Enums"]["jury_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          designation?: string | null
          email?: string
          expertise?: string | null
          full_name?: string
          id?: string
          metadata?: Json
          mobile?: string | null
          organization?: string | null
          status?: Database["public"]["Enums"]["jury_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      jury_team_assignments: {
        Row: {
          assignment_type: string
          created_at: string
          event_id: string
          id: string
          jury_id: string
          registration_id: string | null
          status: Database["public"]["Enums"]["evaluation_status"]
          team_id: string
          updated_at: string
        }
        Insert: {
          assignment_type?: string
          created_at?: string
          event_id: string
          id?: string
          jury_id: string
          registration_id?: string | null
          status?: Database["public"]["Enums"]["evaluation_status"]
          team_id: string
          updated_at?: string
        }
        Update: {
          assignment_type?: string
          created_at?: string
          event_id?: string
          id?: string
          jury_id?: string
          registration_id?: string | null
          status?: Database["public"]["Enums"]["evaluation_status"]
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jury_team_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jury_team_assignments_jury_id_fkey"
            columns: ["jury_id"]
            isOneToOne: false
            referencedRelation: "jury_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jury_team_assignments_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jury_team_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          kind: Database["public"]["Enums"]["notification_kind"]
          message: string | null
          metadata: Json
          module: string
          read_at: string | null
          related_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: Database["public"]["Enums"]["notification_kind"]
          message?: string | null
          metadata?: Json
          module?: string
          read_at?: string | null
          related_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: Database["public"]["Enums"]["notification_kind"]
          message?: string | null
          metadata?: Json
          module?: string
          read_at?: string | null
          related_id?: string | null
          title?: string
        }
        Relationships: []
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
          abstract: string | null
          created_at: string
          email_status: string
          event_id: string
          id: string
          idea_title: string | null
          metadata: Json
          project_track: Database["public"]["Enums"]["project_track"] | null
          qr_token: string | null
          registered_at: string
          registration_code: string | null
          status: Database["public"]["Enums"]["registration_status"]
          team_id: string
          updated_at: string
        }
        Insert: {
          abstract?: string | null
          created_at?: string
          email_status?: string
          event_id: string
          id?: string
          idea_title?: string | null
          metadata?: Json
          project_track?: Database["public"]["Enums"]["project_track"] | null
          qr_token?: string | null
          registered_at?: string
          registration_code?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          team_id: string
          updated_at?: string
        }
        Update: {
          abstract?: string | null
          created_at?: string
          email_status?: string
          event_id?: string
          id?: string
          idea_title?: string | null
          metadata?: Json
          project_track?: Database["public"]["Enums"]["project_track"] | null
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
      result_publications: {
        Row: {
          action: string
          event_id: string
          id: string
          metadata: Json
          performed_at: string
          scheduled_at: string | null
        }
        Insert: {
          action: string
          event_id: string
          id?: string
          metadata?: Json
          performed_at?: string
          scheduled_at?: string | null
        }
        Update: {
          action?: string
          event_id?: string
          id?: string
          metadata?: Json
          performed_at?: string
          scheduled_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "result_publications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      results: {
        Row: {
          created_at: string
          data: Json
          event_id: string
          id: string
          is_published: boolean
          published_at: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["result_status"]
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
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["result_status"]
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
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["result_status"]
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
      scorecards: {
        Row: {
          created_at: string
          department_id: string | null
          department_rank: number | null
          event_id: string
          generated_at: string
          id: string
          max_score: number | null
          overall_rank: number | null
          percentage: number | null
          registration_id: string
          snapshot: Json
          status: string
          team_id: string | null
          total_score: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          department_rank?: number | null
          event_id: string
          generated_at?: string
          id?: string
          max_score?: number | null
          overall_rank?: number | null
          percentage?: number | null
          registration_id: string
          snapshot?: Json
          status?: string
          team_id?: string | null
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          department_rank?: number | null
          event_id?: string
          generated_at?: string
          id?: string
          max_score?: number | null
          overall_rank?: number | null
          percentage?: number | null
          registration_id?: string
          snapshot?: Json
          status?: string
          team_id?: string | null
          total_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scorecards_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorecards_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorecards_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: true
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorecards_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      analytics_by_department: {
        Args: { _department_id?: string }
        Returns: Json
      }
      analytics_by_event: { Args: never; Returns: Json }
      analytics_overview: { Args: never; Returns: Json }
      archive_results: { Args: { _event_id: string }; Returns: undefined }
      attendance_analytics: { Args: never; Returns: Json }
      attendance_stats: { Args: { _event_id?: string }; Returns: Json }
      auto_assign_teams: { Args: { _event_id: string }; Returns: Json }
      certificate_analytics: { Args: never; Returns: Json }
      db_health: { Args: never; Returns: Json }
      downloads_lookup: { Args: { _query: string }; Returns: Json }
      evaluation_analytics: { Args: never; Returns: Json }
      evaluation_stats: { Args: { _event_id?: string }; Returns: Json }
      event_capacity: { Args: { _event_id: string }; Returns: Json }
      event_leaderboard: { Args: { _event_id?: string }; Returns: Json }
      generate_certificates: { Args: { _event_id: string }; Returns: number }
      generate_registration_code: { Args: never; Returns: string }
      generate_scorecards: { Args: { _event_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hide_results: { Args: { _event_id: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_jury: { Args: never; Returns: boolean }
      lookup_registration_by_code: { Args: { _code: string }; Returns: Json }
      lookup_registrations_by_email: { Args: { _email: string }; Returns: Json }
      mark_attendance_by_qr: {
        Args: {
          _event_id: string
          _method?: Database["public"]["Enums"]["attendance_method"]
          _qr_token: string
        }
        Returns: Json
      }
      mark_attendance_manual: {
        Args: {
          _method?: Database["public"]["Enums"]["attendance_method"]
          _registration_id: string
        }
        Returns: Json
      }
      next_certificate_code: { Args: never; Returns: string }
      public_results: { Args: { _query?: string }; Returns: Json }
      public_winners: { Args: { _event_id?: string }; Returns: Json }
      publish_event_evaluations: {
        Args: { _event_id: string; _publish?: boolean }
        Returns: Json
      }
      publish_results: {
        Args: { _event_id: string; _scheduled_at?: string }
        Returns: Json
      }
      recompute_evaluation_totals: {
        Args: { _evaluation_id: string }
        Returns: undefined
      }
      register_team: { Args: { payload: Json }; Returns: Json }
      registration_trends: { Args: { _days?: number }; Returns: Json }
      save_evaluation_score: {
        Args: {
          _criterion_id: string
          _evaluation_id: string
          _marks: number
          _remarks?: string
        }
        Returns: Json
      }
      set_evaluation_lock: {
        Args: { _evaluation_id: string; _locked: boolean; _reason?: string }
        Returns: Json
      }
      submit_evaluation: {
        Args: {
          _comments?: string
          _evaluation_id: string
          _recommendation?: string
        }
        Returns: Json
      }
      track_certificate_download: {
        Args: { _code: string }
        Returns: undefined
      }
      track_certificate_verification: {
        Args: { _code: string }
        Returns: undefined
      }
      unpublish_results: { Args: { _event_id: string }; Returns: undefined }
      upsert_evaluation: {
        Args: {
          _event_id: string
          _jury_id: string
          _round?: string
          _team_id: string
        }
        Returns: string
      }
      verify_certificate: { Args: { _code: string }; Returns: Json }
    }
    Enums: {
      announcement_priority: "low" | "normal" | "high" | "urgent"
      announcement_status: "draft" | "published" | "archived"
      app_role: "admin" | "user" | "jury"
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
      evaluation_recommendation: "qualified" | "not_qualified" | "needs_review"
      evaluation_status:
        | "pending"
        | "assigned"
        | "in_progress"
        | "completed"
        | "published"
      event_status:
        | "upcoming"
        | "registration_open"
        | "registration_closed"
        | "ongoing"
        | "evaluation"
        | "completed"
      jury_status: "active" | "inactive"
      media_type: "image" | "video"
      notification_kind: "info" | "success" | "warning" | "error"
      project_track: "software" | "hardware"
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
      result_status: "draft" | "published" | "hidden" | "archived"
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
      announcement_priority: ["low", "normal", "high", "urgent"],
      announcement_status: ["draft", "published", "archived"],
      app_role: ["admin", "user", "jury"],
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
      evaluation_recommendation: ["qualified", "not_qualified", "needs_review"],
      evaluation_status: [
        "pending",
        "assigned",
        "in_progress",
        "completed",
        "published",
      ],
      event_status: [
        "upcoming",
        "registration_open",
        "registration_closed",
        "ongoing",
        "evaluation",
        "completed",
      ],
      jury_status: ["active", "inactive"],
      media_type: ["image", "video"],
      notification_kind: ["info", "success", "warning", "error"],
      project_track: ["software", "hardware"],
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
      result_status: ["draft", "published", "hidden", "archived"],
      winner_position: [
        "winner",
        "runner_up",
        "second_runner_up",
        "special_mention",
      ],
    },
  },
} as const
