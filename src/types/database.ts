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
      booking_answers: {
        Row: {
          booking_id: string;
          business_id: string;
          created_at: string;
          id: string;
          kind_snapshot: Database["public"]["Enums"]["question_kind"];
          label_snapshot: string;
          question_id: string | null;
          value: NonNullable<Json>;
        };
        Insert: {
          booking_id: string;
          business_id: string;
          created_at?: string;
          id?: string;
          kind_snapshot: Database["public"]["Enums"]["question_kind"];
          label_snapshot: string;
          question_id?: string | null;
          value: NonNullable<Json>;
        };
        Update: {
          booking_id?: string;
          business_id?: string;
          created_at?: string;
          id?: string;
          kind_snapshot?: Database["public"]["Enums"]["question_kind"];
          label_snapshot?: string;
          question_id?: string | null;
          value?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "booking_answers_business_id_booking_id_fkey";
            columns: ["business_id", "booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "booking_answers_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_answers_business_id_question_id_fkey";
            columns: ["business_id", "question_id"];
            isOneToOne: false;
            referencedRelation: "booking_questions";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      booking_question_targets: {
        Row: {
          business_id: string;
          category_id: string | null;
          created_at: string;
          id: string;
          question_id: string;
          service_id: string | null;
        };
        Insert: {
          business_id: string;
          category_id?: string | null;
          created_at?: string;
          id?: string;
          question_id: string;
          service_id?: string | null;
        };
        Update: {
          business_id?: string;
          category_id?: string | null;
          created_at?: string;
          id?: string;
          question_id?: string;
          service_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "booking_question_targets_business_id_category_id_fkey";
            columns: ["business_id", "category_id"];
            isOneToOne: false;
            referencedRelation: "service_categories";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "booking_question_targets_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_question_targets_business_id_question_id_fkey";
            columns: ["business_id", "question_id"];
            isOneToOne: false;
            referencedRelation: "booking_questions";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "booking_question_targets_business_id_service_id_fkey";
            columns: ["business_id", "service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      booking_questions: {
        Row: {
          active: boolean;
          applies_to: Database["public"]["Enums"]["booking_question_applies_to"];
          business_id: string;
          created_at: string;
          help: string | null;
          id: string;
          kind: Database["public"]["Enums"]["question_kind"];
          label: string;
          options: Json | null;
          preset_key: string | null;
          required: boolean;
          save_to_customer: boolean;
          sort: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          applies_to?: Database["public"]["Enums"]["booking_question_applies_to"];
          business_id: string;
          created_at?: string;
          help?: string | null;
          id?: string;
          kind: Database["public"]["Enums"]["question_kind"];
          label: string;
          options?: Json | null;
          preset_key?: string | null;
          required?: boolean;
          save_to_customer?: boolean;
          sort?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          applies_to?: Database["public"]["Enums"]["booking_question_applies_to"];
          business_id?: string;
          created_at?: string;
          help?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["question_kind"];
          label?: string;
          options?: Json | null;
          preset_key?: string | null;
          required?: boolean;
          save_to_customer?: boolean;
          sort?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_questions_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          blocked: unknown;
          business_id: string;
          cancel_reason: string | null;
          cancelled_at: string | null;
          confirmed_by_customer_at: string | null;
          created_at: string;
          customer_id: string;
          deposit_clp: number;
          discount_clp: number;
          id: string;
          idempotency_key: string | null;
          manage_token_hash: string | null;
          notes: string | null;
          pending_expires_at: string | null;
          period: unknown;
          price_clp: number;
          reminded_at: string | null;
          service_id: string;
          source: Database["public"]["Enums"]["booking_source"];
          staff_id: string;
          status: Database["public"]["Enums"]["booking_status"];
          updated_at: string;
        };
        Insert: {
          blocked: unknown;
          business_id: string;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          confirmed_by_customer_at?: string | null;
          created_at?: string;
          customer_id: string;
          deposit_clp?: number;
          discount_clp?: number;
          id?: string;
          idempotency_key?: string | null;
          manage_token_hash?: string | null;
          notes?: string | null;
          pending_expires_at?: string | null;
          period: unknown;
          price_clp: number;
          reminded_at?: string | null;
          service_id: string;
          source: Database["public"]["Enums"]["booking_source"];
          staff_id: string;
          status: Database["public"]["Enums"]["booking_status"];
          updated_at?: string;
        };
        Update: {
          blocked?: unknown;
          business_id?: string;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          confirmed_by_customer_at?: string | null;
          created_at?: string;
          customer_id?: string;
          deposit_clp?: number;
          discount_clp?: number;
          id?: string;
          idempotency_key?: string | null;
          manage_token_hash?: string | null;
          notes?: string | null;
          pending_expires_at?: string | null;
          period?: unknown;
          price_clp?: number;
          reminded_at?: string | null;
          service_id?: string;
          source?: Database["public"]["Enums"]["booking_source"];
          staff_id?: string;
          status?: Database["public"]["Enums"]["booking_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_customer_id_fkey";
            columns: ["business_id", "customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "bookings_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_business_id_service_id_fkey";
            columns: ["business_id", "service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "bookings_business_id_staff_id_fkey";
            columns: ["business_id", "staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      business_hours: {
        Row: {
          business_id: string;
          created_at: string;
          end_time: string;
          id: string;
          minutes_range: unknown;
          start_time: string;
          weekday: number;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          end_time: string;
          id?: string;
          minutes_range?: never;
          start_time: string;
          weekday: number;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          end_time?: string;
          id?: string;
          minutes_range?: never;
          start_time?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "business_hours_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      business_images: {
        Row: {
          business_id: string;
          created_at: string;
          id: string;
          path: string;
          sort: number;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          id?: string;
          path: string;
          sort?: number;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          id?: string;
          path?: string;
          sort?: number;
        };
        Relationships: [
          {
            foreignKeyName: "business_images_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      businesses: {
        Row: {
          about: string | null;
          accent_color: string | null;
          address: string | null;
          auto_confirm_bookings: boolean;
          cancel_window_hours: number;
          category: string;
          comuna: string;
          cover_url: string | null;
          created_at: string;
          deletion_requested_at: string | null;
          facebook: string | null;
          id: string;
          instagram: string | null;
          logo_url: string | null;
          max_days_ahead: number;
          min_notice_minutes: number;
          name: string;
          phone: string | null;
          plan: Database["public"]["Enums"]["business_plan"];
          plan_override_until: string | null;
          slot_interval_minutes: number;
          slug: string;
          status: Database["public"]["Enums"]["business_status"];
          status_before_deletion_request:
            Database["public"]["Enums"]["business_status"] | null;
          tiktok: string | null;
          timezone: string;
          trial_ends_at: string | null;
          updated_at: string;
          waitlist_mode: Database["public"]["Enums"]["waitlist_mode"];
        };
        Insert: {
          about?: string | null;
          accent_color?: string | null;
          address?: string | null;
          auto_confirm_bookings?: boolean;
          cancel_window_hours?: number;
          category: string;
          comuna: string;
          cover_url?: string | null;
          created_at?: string;
          deletion_requested_at?: string | null;
          facebook?: string | null;
          id?: string;
          instagram?: string | null;
          logo_url?: string | null;
          max_days_ahead?: number;
          min_notice_minutes?: number;
          name: string;
          phone?: string | null;
          plan?: Database["public"]["Enums"]["business_plan"];
          plan_override_until?: string | null;
          slot_interval_minutes?: number;
          slug: string;
          status?: Database["public"]["Enums"]["business_status"];
          status_before_deletion_request?:
            Database["public"]["Enums"]["business_status"] | null;
          tiktok?: string | null;
          timezone?: string;
          trial_ends_at?: string | null;
          updated_at?: string;
          waitlist_mode?: Database["public"]["Enums"]["waitlist_mode"];
        };
        Update: {
          about?: string | null;
          accent_color?: string | null;
          address?: string | null;
          auto_confirm_bookings?: boolean;
          cancel_window_hours?: number;
          category?: string;
          comuna?: string;
          cover_url?: string | null;
          created_at?: string;
          deletion_requested_at?: string | null;
          facebook?: string | null;
          id?: string;
          instagram?: string | null;
          logo_url?: string | null;
          max_days_ahead?: number;
          min_notice_minutes?: number;
          name?: string;
          phone?: string | null;
          plan?: Database["public"]["Enums"]["business_plan"];
          plan_override_until?: string | null;
          slot_interval_minutes?: number;
          slug?: string;
          status?: Database["public"]["Enums"]["business_status"];
          status_before_deletion_request?:
            Database["public"]["Enums"]["business_status"] | null;
          tiktok?: string | null;
          timezone?: string;
          trial_ends_at?: string | null;
          updated_at?: string;
          waitlist_mode?: Database["public"]["Enums"]["waitlist_mode"];
        };
        Relationships: [];
      };
      consent_events: {
        Row: {
          business_id: string;
          channel: Database["public"]["Enums"]["consent_channel"];
          created_at: string;
          customer_id: string | null;
          granted: boolean;
          id: string;
          kind: Database["public"]["Enums"]["consent_kind"];
          subject: Database["public"]["Enums"]["consent_subject"];
          version: string;
        };
        Insert: {
          business_id: string;
          channel: Database["public"]["Enums"]["consent_channel"];
          created_at?: string;
          customer_id?: string | null;
          granted: boolean;
          id?: string;
          kind: Database["public"]["Enums"]["consent_kind"];
          subject: Database["public"]["Enums"]["consent_subject"];
          version: string;
        };
        Update: {
          business_id?: string;
          channel?: Database["public"]["Enums"]["consent_channel"];
          created_at?: string;
          customer_id?: string | null;
          granted?: boolean;
          id?: string;
          kind?: Database["public"]["Enums"]["consent_kind"];
          subject?: Database["public"]["Enums"]["consent_subject"];
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "consent_events_business_id_customer_id_fkey";
            columns: ["business_id", "customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "consent_events_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_answers: {
        Row: {
          business_id: string;
          created_at: string;
          customer_id: string;
          question_id: string;
          updated_at: string;
          value: NonNullable<Json>;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          customer_id: string;
          question_id: string;
          updated_at?: string;
          value: NonNullable<Json>;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          customer_id?: string;
          question_id?: string;
          updated_at?: string;
          value?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "customer_answers_business_id_customer_id_fkey";
            columns: ["business_id", "customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "customer_answers_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_answers_business_id_question_id_fkey";
            columns: ["business_id", "question_id"];
            isOneToOne: false;
            referencedRelation: "booking_questions";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      customers: {
        Row: {
          anonymized_at: string | null;
          business_id: string;
          consent_channel:
            Database["public"]["Enums"]["consent_channel"] | null;
          consent_marketing_at: string | null;
          consent_terms_at: string | null;
          consent_version: string | null;
          created_at: string;
          email: string | null;
          id: string;
          last_visit_at: string | null;
          name: string | null;
          no_show_count: number;
          notes: string | null;
          phone_e164: string | null;
          updated_at: string;
          visits_count: number;
        };
        Insert: {
          anonymized_at?: string | null;
          business_id: string;
          consent_channel?:
            Database["public"]["Enums"]["consent_channel"] | null;
          consent_marketing_at?: string | null;
          consent_terms_at?: string | null;
          consent_version?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          last_visit_at?: string | null;
          name?: string | null;
          no_show_count?: number;
          notes?: string | null;
          phone_e164?: string | null;
          updated_at?: string;
          visits_count?: number;
        };
        Update: {
          anonymized_at?: string | null;
          business_id?: string;
          consent_channel?:
            Database["public"]["Enums"]["consent_channel"] | null;
          consent_marketing_at?: string | null;
          consent_terms_at?: string | null;
          consent_version?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          last_visit_at?: string | null;
          name?: string | null;
          no_show_count?: number;
          notes?: string | null;
          phone_e164?: string | null;
          updated_at?: string;
          visits_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      member_invitations: {
        Row: {
          accepted_at: string | null;
          business_id: string;
          can_cancel_bookings: boolean;
          can_edit_catalog: boolean;
          can_edit_settings: boolean;
          can_manage_all_bookings: boolean;
          can_manage_own_bookings: boolean;
          can_manage_team: boolean;
          can_view_reports: boolean;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string;
          revoked_at: string | null;
          staff_id: string;
          token_hash: string;
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          business_id: string;
          can_cancel_bookings?: boolean;
          can_edit_catalog?: boolean;
          can_edit_settings?: boolean;
          can_manage_all_bookings?: boolean;
          can_manage_own_bookings?: boolean;
          can_manage_team?: boolean;
          can_view_reports?: boolean;
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          invited_by: string;
          revoked_at?: string | null;
          staff_id: string;
          token_hash: string;
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          business_id?: string;
          can_cancel_bookings?: boolean;
          can_edit_catalog?: boolean;
          can_edit_settings?: boolean;
          can_manage_all_bookings?: boolean;
          can_manage_own_bookings?: boolean;
          can_manage_team?: boolean;
          can_view_reports?: boolean;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string;
          revoked_at?: string | null;
          staff_id?: string;
          token_hash?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_invitations_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_invitations_business_id_staff_id_fkey";
            columns: ["business_id", "staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      memberships: {
        Row: {
          business_id: string;
          can_cancel_bookings: boolean;
          can_edit_catalog: boolean;
          can_edit_settings: boolean;
          can_manage_all_bookings: boolean;
          can_manage_own_bookings: boolean;
          can_manage_team: boolean;
          can_view_reports: boolean;
          created_at: string;
          role: Database["public"]["Enums"]["member_role"];
          staff_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          business_id: string;
          can_cancel_bookings?: boolean;
          can_edit_catalog?: boolean;
          can_edit_settings?: boolean;
          can_manage_all_bookings?: boolean;
          can_manage_own_bookings?: boolean;
          can_manage_team?: boolean;
          can_view_reports?: boolean;
          created_at?: string;
          role: Database["public"]["Enums"]["member_role"];
          staff_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          business_id?: string;
          can_cancel_bookings?: boolean;
          can_edit_catalog?: boolean;
          can_edit_settings?: boolean;
          can_manage_all_bookings?: boolean;
          can_manage_own_bookings?: boolean;
          can_manage_team?: boolean;
          can_view_reports?: boolean;
          created_at?: string;
          role?: Database["public"]["Enums"]["member_role"];
          staff_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memberships_staff_fk";
            columns: ["business_id", "staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      message_outbox: {
        Row: {
          attempts: number;
          booking_id: string | null;
          business_id: string;
          category: Database["public"]["Enums"]["message_category"];
          channel: Database["public"]["Enums"]["message_channel"];
          created_at: string;
          dedupe_key: string;
          error: string | null;
          id: string;
          next_attempt_at: string;
          payload: NonNullable<Json>;
          provider_message_id: string | null;
          recipient_kind: Database["public"]["Enums"]["message_recipient_kind"];
          sent_at: string | null;
          status: Database["public"]["Enums"]["message_outbox_status"];
          template: string;
          updated_at: string;
        };
        Insert: {
          attempts?: number;
          booking_id?: string | null;
          business_id: string;
          category: Database["public"]["Enums"]["message_category"];
          channel: Database["public"]["Enums"]["message_channel"];
          created_at?: string;
          dedupe_key: string;
          error?: string | null;
          id?: string;
          next_attempt_at?: string;
          payload?: NonNullable<Json>;
          provider_message_id?: string | null;
          recipient_kind: Database["public"]["Enums"]["message_recipient_kind"];
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["message_outbox_status"];
          template: string;
          updated_at?: string;
        };
        Update: {
          attempts?: number;
          booking_id?: string | null;
          business_id?: string;
          category?: Database["public"]["Enums"]["message_category"];
          channel?: Database["public"]["Enums"]["message_channel"];
          created_at?: string;
          dedupe_key?: string;
          error?: string | null;
          id?: string;
          next_attempt_at?: string;
          payload?: NonNullable<Json>;
          provider_message_id?: string | null;
          recipient_kind?: Database["public"]["Enums"]["message_recipient_kind"];
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["message_outbox_status"];
          template?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "message_outbox_business_id_booking_id_fkey";
            columns: ["business_id", "booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "message_outbox_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount_clp: number;
          booking_id: string;
          business_id: string;
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["payment_kind"];
          method: Database["public"]["Enums"]["payment_method"];
          paid_at: string | null;
          provider_ref: string | null;
          status: Database["public"]["Enums"]["payment_status"];
          updated_at: string;
        };
        Insert: {
          amount_clp: number;
          booking_id: string;
          business_id: string;
          created_at?: string;
          id?: string;
          kind: Database["public"]["Enums"]["payment_kind"];
          method: Database["public"]["Enums"]["payment_method"];
          paid_at?: string | null;
          provider_ref?: string | null;
          status: Database["public"]["Enums"]["payment_status"];
          updated_at?: string;
        };
        Update: {
          amount_clp?: number;
          booking_id?: string;
          business_id?: string;
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["payment_kind"];
          method?: Database["public"]["Enums"]["payment_method"];
          paid_at?: string | null;
          provider_ref?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_business_id_booking_id_fkey";
            columns: ["business_id", "booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "payments_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      service_categories: {
        Row: {
          business_id: string;
          created_at: string;
          id: string;
          name: string;
          sort: number;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          id?: string;
          name: string;
          sort?: number;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          sort?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_categories_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      services: {
        Row: {
          active: boolean;
          buffer_after_min: number;
          business_id: string;
          category_id: string | null;
          created_at: string;
          deposit_kind: Database["public"]["Enums"]["deposit_kind"];
          deposit_value: number | null;
          description: string | null;
          duration_min: number;
          id: string;
          name: string;
          price_clp: number;
          remind_after_weeks: number | null;
          sort: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          buffer_after_min?: number;
          business_id: string;
          category_id?: string | null;
          created_at?: string;
          deposit_kind?: Database["public"]["Enums"]["deposit_kind"];
          deposit_value?: number | null;
          description?: string | null;
          duration_min: number;
          id?: string;
          name: string;
          price_clp: number;
          remind_after_weeks?: number | null;
          sort?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          buffer_after_min?: number;
          business_id?: string;
          category_id?: string | null;
          created_at?: string;
          deposit_kind?: Database["public"]["Enums"]["deposit_kind"];
          deposit_value?: number | null;
          description?: string | null;
          duration_min?: number;
          id?: string;
          name?: string;
          price_clp?: number;
          remind_after_weeks?: number | null;
          sort?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "services_category_id_fkey";
            columns: ["business_id", "category_id"];
            isOneToOne: false;
            referencedRelation: "service_categories";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      staff: {
        Row: {
          active: boolean;
          business_id: string;
          color: string;
          created_at: string;
          id: string;
          name: string;
          photo_url: string | null;
          sort: number;
          title: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          business_id: string;
          color: string;
          created_at?: string;
          id?: string;
          name: string;
          photo_url?: string | null;
          sort?: number;
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          business_id?: string;
          color?: string;
          created_at?: string;
          id?: string;
          name?: string;
          photo_url?: string | null;
          sort?: number;
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_hours: {
        Row: {
          business_id: string;
          created_at: string;
          end_time: string;
          id: string;
          minutes_range: unknown;
          staff_id: string;
          start_time: string;
          weekday: number;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          end_time: string;
          id?: string;
          minutes_range?: never;
          staff_id: string;
          start_time: string;
          weekday: number;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          end_time?: string;
          id?: string;
          minutes_range?: never;
          staff_id?: string;
          start_time?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "staff_hours_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_hours_business_id_staff_id_fkey";
            columns: ["business_id", "staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      staff_services: {
        Row: {
          business_id: string;
          created_at: string;
          service_id: string;
          staff_id: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          service_id: string;
          staff_id: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          service_id?: string;
          staff_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_services_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_services_business_id_service_id_fkey";
            columns: ["business_id", "service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "staff_services_business_id_staff_id_fkey";
            columns: ["business_id", "staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      time_off: {
        Row: {
          business_id: string;
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["time_off_kind"];
          note: string | null;
          period: unknown;
          staff_id: string | null;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          id?: string;
          kind: Database["public"]["Enums"]["time_off_kind"];
          note?: string | null;
          period: unknown;
          staff_id?: string | null;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["time_off_kind"];
          note?: string | null;
          period?: unknown;
          staff_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "time_off_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "time_off_business_id_staff_id_fkey";
            columns: ["business_id", "staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_business_invitation: { Args: { token: string }; Returns: string };
      accept_invitation: { Args: { token: string }; Returns: string };
      create_business: {
        Args: {
          category: string;
          comuna: string;
          name: string;
          phone?: string;
          slug: string;
          timezone?: string;
        };
        Returns: string;
      };
    };
    Enums: {
      booking_question_applies_to: "all" | "targets";
      booking_source: "web" | "manual" | "waitlist" | "flash";
      booking_status:
        | "requested"
        | "pending_payment"
        | "confirmed"
        | "completed"
        | "no_show"
        | "cancelled";
      business_plan: "free" | "emprende" | "equipo" | "local";
      business_status: "active" | "frozen";
      consent_channel: "web" | "whatsapp" | "manual";
      consent_kind: "terms" | "marketing" | "waitlist" | "owner_terms" | "dpa";
      consent_subject: "customer" | "owner";
      deposit_kind: "none" | "fixed" | "percent";
      member_role: "owner" | "staff" | "vendor" | "admin";
      message_category: "utility" | "marketing" | "service";
      message_channel: "email" | "sms";
      message_outbox_status:
        "queued" | "sending" | "sent" | "failed" | "dead" | "cancelled";
      message_recipient_kind: "customer" | "owner" | "invitee";
      payment_kind: "deposit" | "balance" | "full";
      payment_method: "cash" | "card_terminal" | "transfer" | "mercadopago";
      payment_status: "pending" | "approved" | "rejected" | "refunded";
      question_kind:
        | "short_text"
        | "long_text"
        | "single_choice"
        | "multi_choice"
        | "number"
        | "yes_no"
        | "date";
      time_off_kind: "block" | "lunch" | "vacation" | "holiday";
      waitlist_mode: "sequential" | "broadcast";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      booking_question_applies_to: ["all", "targets"],
      booking_source: ["web", "manual", "waitlist", "flash"],
      booking_status: [
        "requested",
        "pending_payment",
        "confirmed",
        "completed",
        "no_show",
        "cancelled",
      ],
      business_plan: ["free", "emprende", "equipo", "local"],
      business_status: ["active", "frozen"],
      consent_channel: ["web", "whatsapp", "manual"],
      consent_kind: ["terms", "marketing", "waitlist", "owner_terms", "dpa"],
      consent_subject: ["customer", "owner"],
      deposit_kind: ["none", "fixed", "percent"],
      member_role: ["owner", "staff", "vendor", "admin"],
      message_category: ["utility", "marketing", "service"],
      message_channel: ["email", "sms"],
      message_outbox_status: [
        "queued",
        "sending",
        "sent",
        "failed",
        "dead",
        "cancelled",
      ],
      message_recipient_kind: ["customer", "owner", "invitee"],
      payment_kind: ["deposit", "balance", "full"],
      payment_method: ["cash", "card_terminal", "transfer", "mercadopago"],
      payment_status: ["pending", "approved", "rejected", "refunded"],
      question_kind: [
        "short_text",
        "long_text",
        "single_choice",
        "multi_choice",
        "number",
        "yes_no",
        "date",
      ],
      time_off_kind: ["block", "lunch", "vacation", "holiday"],
      waitlist_mode: ["sequential", "broadcast"],
    },
  },
} as const;
