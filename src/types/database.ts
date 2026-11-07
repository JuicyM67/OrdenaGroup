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
      account_consent_events: {
        Row: {
          created_at: string;
          granted: boolean;
          id: string;
          kind: string;
          user_id: string | null;
          version: string;
        };
        Insert: {
          created_at?: string;
          granted: boolean;
          id?: string;
          kind: string;
          user_id?: string | null;
          version: string;
        };
        Update: {
          created_at?: string;
          granted?: boolean;
          id?: string;
          kind?: string;
          user_id?: string | null;
          version?: string;
        };
        Relationships: [];
      };
      ai_import_runs: {
        Row: {
          business_id: string | null;
          cost_usd: number;
          created_at: string;
          duration_ms: number | null;
          finished_at: string | null;
          id: string;
          input_tokens: number;
          model: string;
          output_tokens: number;
          platform: string | null;
          source: string;
          status: string;
          user_id: string;
          web_fetches: number;
        };
        Insert: {
          business_id?: string | null;
          cost_usd?: number;
          created_at?: string;
          duration_ms?: number | null;
          finished_at?: string | null;
          id?: string;
          input_tokens?: number;
          model: string;
          output_tokens?: number;
          platform?: string | null;
          source: string;
          status?: string;
          user_id: string;
          web_fetches?: number;
        };
        Update: {
          business_id?: string | null;
          cost_usd?: number;
          created_at?: string;
          duration_ms?: number | null;
          finished_at?: string | null;
          id?: string;
          input_tokens?: number;
          model?: string;
          output_tokens?: number;
          platform?: string | null;
          source?: string;
          status?: string;
          user_id?: string;
          web_fetches?: number;
        };
        Relationships: [
          {
            foreignKeyName: "ai_import_runs_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
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
          account_user_id: string | null;
          blocked: unknown;
          business_id: string;
          campaign_recipient_id: string | null;
          cancel_reason: string | null;
          cancelled_at: string | null;
          confirmed_by_customer_at: string | null;
          contact_email: string | null;
          created_at: string;
          customer_id: string;
          deposit_clp: number;
          discount_clp: number;
          flash_slot_id: string | null;
          id: string;
          idempotency_key: string | null;
          manage_token_hash: string | null;
          marketplace_offer_id: string | null;
          notes: string | null;
          pending_expires_at: string | null;
          period: unknown;
          price_clp: number;
          reminded_at: string | null;
          service_id: string;
          source: Database["public"]["Enums"]["booking_source"];
          staff_id: string;
          status: Database["public"]["Enums"]["booking_status"];
          status_before_cancel_request:
            Database["public"]["Enums"]["booking_status"] | null;
          updated_at: string;
          waitlist_entry_id: string | null;
        };
        Insert: {
          account_user_id?: string | null;
          blocked: unknown;
          business_id: string;
          campaign_recipient_id?: string | null;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          confirmed_by_customer_at?: string | null;
          contact_email?: string | null;
          created_at?: string;
          customer_id: string;
          deposit_clp?: number;
          discount_clp?: number;
          flash_slot_id?: string | null;
          id?: string;
          idempotency_key?: string | null;
          manage_token_hash?: string | null;
          marketplace_offer_id?: string | null;
          notes?: string | null;
          pending_expires_at?: string | null;
          period: unknown;
          price_clp: number;
          reminded_at?: string | null;
          service_id: string;
          source: Database["public"]["Enums"]["booking_source"];
          staff_id: string;
          status: Database["public"]["Enums"]["booking_status"];
          status_before_cancel_request?:
            Database["public"]["Enums"]["booking_status"] | null;
          updated_at?: string;
          waitlist_entry_id?: string | null;
        };
        Update: {
          account_user_id?: string | null;
          blocked?: unknown;
          business_id?: string;
          campaign_recipient_id?: string | null;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          confirmed_by_customer_at?: string | null;
          contact_email?: string | null;
          created_at?: string;
          customer_id?: string;
          deposit_clp?: number;
          discount_clp?: number;
          flash_slot_id?: string | null;
          id?: string;
          idempotency_key?: string | null;
          manage_token_hash?: string | null;
          marketplace_offer_id?: string | null;
          notes?: string | null;
          pending_expires_at?: string | null;
          period?: unknown;
          price_clp?: number;
          reminded_at?: string | null;
          service_id?: string;
          source?: Database["public"]["Enums"]["booking_source"];
          staff_id?: string;
          status?: Database["public"]["Enums"]["booking_status"];
          status_before_cancel_request?:
            Database["public"]["Enums"]["booking_status"] | null;
          updated_at?: string;
          waitlist_entry_id?: string | null;
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
          {
            foreignKeyName: "bookings_campaign_recipient_id_fkey";
            columns: ["business_id", "campaign_recipient_id"];
            isOneToOne: false;
            referencedRelation: "campaign_recipients";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "bookings_flash_slot_id_fkey";
            columns: ["business_id", "flash_slot_id"];
            isOneToOne: false;
            referencedRelation: "flash_slots";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "bookings_marketplace_offer_id_fkey";
            columns: ["business_id", "marketplace_offer_id"];
            isOneToOne: false;
            referencedRelation: "offers";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "bookings_waitlist_entry_id_fkey";
            columns: ["business_id", "waitlist_entry_id"];
            isOneToOne: false;
            referencedRelation: "waitlist_entries";
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
      business_service_areas: {
        Row: {
          area_name: string;
          area_slug: string;
          business_id: string;
          created_at: string;
          sort: number;
        };
        Insert: {
          area_name: string;
          area_slug: string;
          business_id: string;
          created_at?: string;
          sort?: number;
        };
        Update: {
          area_name?: string;
          area_slug?: string;
          business_id?: string;
          created_at?: string;
          sort?: number;
        };
        Relationships: [
          {
            foreignKeyName: "business_service_areas_business_id_fkey";
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
          area_name: string | null;
          area_slug: string | null;
          auto_confirm_bookings: boolean;
          billing_mode: string;
          cancel_approval: string;
          cancel_window_hours: number;
          category: string;
          comuna: string;
          cover_url: string | null;
          created_at: string;
          custom_limits: NonNullable<Json>;
          deletion_requested_at: string | null;
          facebook: string | null;
          geocode_address_hash: string | null;
          geocode_status: string;
          geocoded_at: string | null;
          gift_cards_enabled: boolean;
          id: string;
          instagram: string | null;
          lat: number | null;
          lng: number | null;
          logo_url: string | null;
          marketplace_categories_reviewed_at: string | null;
          marketplace_extra_categories: string[];
          marketplace_flash_visible: boolean;
          marketplace_hidden: boolean;
          marketplace_listed: boolean;
          max_days_ahead: number;
          member_benefit_text: string | null;
          member_discount_pct: number | null;
          min_notice_minutes: number;
          name: string;
          online_payment: string;
          phone: string | null;
          plan: Database["public"]["Enums"]["business_plan"];
          plan_override_until: string | null;
          plan_requested: Database["public"]["Enums"]["business_plan"] | null;
          plan_requested_at: string | null;
          review_requests_enabled: boolean;
          serves_at_customer: boolean;
          slot_interval_minutes: number;
          slug: string;
          status: Database["public"]["Enums"]["business_status"];
          status_before_deletion_request:
            Database["public"]["Enums"]["business_status"] | null;
          tiktok: string | null;
          timezone: string;
          trial_ends_at: string | null;
          updated_at: string;
          waitlist_hold_minutes: number;
          waitlist_mode: Database["public"]["Enums"]["waitlist_mode"];
          winback_days: number | null;
          winback_message: string | null;
          winback_offer_days: number | null;
          winback_offer_pct: number | null;
        };
        Insert: {
          about?: string | null;
          accent_color?: string | null;
          address?: string | null;
          area_name?: string | null;
          area_slug?: string | null;
          auto_confirm_bookings?: boolean;
          billing_mode?: string;
          cancel_approval?: string;
          cancel_window_hours?: number;
          category: string;
          comuna: string;
          cover_url?: string | null;
          created_at?: string;
          custom_limits?: NonNullable<Json>;
          deletion_requested_at?: string | null;
          facebook?: string | null;
          geocode_address_hash?: string | null;
          geocode_status?: string;
          geocoded_at?: string | null;
          gift_cards_enabled?: boolean;
          id?: string;
          instagram?: string | null;
          lat?: number | null;
          lng?: number | null;
          logo_url?: string | null;
          marketplace_categories_reviewed_at?: string | null;
          marketplace_extra_categories?: string[];
          marketplace_flash_visible?: boolean;
          marketplace_hidden?: boolean;
          marketplace_listed?: boolean;
          max_days_ahead?: number;
          member_benefit_text?: string | null;
          member_discount_pct?: number | null;
          min_notice_minutes?: number;
          name: string;
          online_payment?: string;
          phone?: string | null;
          plan?: Database["public"]["Enums"]["business_plan"];
          plan_override_until?: string | null;
          plan_requested?: Database["public"]["Enums"]["business_plan"] | null;
          plan_requested_at?: string | null;
          review_requests_enabled?: boolean;
          serves_at_customer?: boolean;
          slot_interval_minutes?: number;
          slug: string;
          status?: Database["public"]["Enums"]["business_status"];
          status_before_deletion_request?:
            Database["public"]["Enums"]["business_status"] | null;
          tiktok?: string | null;
          timezone?: string;
          trial_ends_at?: string | null;
          updated_at?: string;
          waitlist_hold_minutes?: number;
          waitlist_mode?: Database["public"]["Enums"]["waitlist_mode"];
          winback_days?: number | null;
          winback_message?: string | null;
          winback_offer_days?: number | null;
          winback_offer_pct?: number | null;
        };
        Update: {
          about?: string | null;
          accent_color?: string | null;
          address?: string | null;
          area_name?: string | null;
          area_slug?: string | null;
          auto_confirm_bookings?: boolean;
          billing_mode?: string;
          cancel_approval?: string;
          cancel_window_hours?: number;
          category?: string;
          comuna?: string;
          cover_url?: string | null;
          created_at?: string;
          custom_limits?: NonNullable<Json>;
          deletion_requested_at?: string | null;
          facebook?: string | null;
          geocode_address_hash?: string | null;
          geocode_status?: string;
          geocoded_at?: string | null;
          gift_cards_enabled?: boolean;
          id?: string;
          instagram?: string | null;
          lat?: number | null;
          lng?: number | null;
          logo_url?: string | null;
          marketplace_categories_reviewed_at?: string | null;
          marketplace_extra_categories?: string[];
          marketplace_flash_visible?: boolean;
          marketplace_hidden?: boolean;
          marketplace_listed?: boolean;
          max_days_ahead?: number;
          member_benefit_text?: string | null;
          member_discount_pct?: number | null;
          min_notice_minutes?: number;
          name?: string;
          online_payment?: string;
          phone?: string | null;
          plan?: Database["public"]["Enums"]["business_plan"];
          plan_override_until?: string | null;
          plan_requested?: Database["public"]["Enums"]["business_plan"] | null;
          plan_requested_at?: string | null;
          review_requests_enabled?: boolean;
          serves_at_customer?: boolean;
          slot_interval_minutes?: number;
          slug?: string;
          status?: Database["public"]["Enums"]["business_status"];
          status_before_deletion_request?:
            Database["public"]["Enums"]["business_status"] | null;
          tiktok?: string | null;
          timezone?: string;
          trial_ends_at?: string | null;
          updated_at?: string;
          waitlist_hold_minutes?: number;
          waitlist_mode?: Database["public"]["Enums"]["waitlist_mode"];
          winback_days?: number | null;
          winback_message?: string | null;
          winback_offer_days?: number | null;
          winback_offer_pct?: number | null;
        };
        Relationships: [];
      };
      campaign_recipients: {
        Row: {
          business_id: string;
          campaign_id: string;
          created_at: string;
          customer_id: string;
          id: string;
          redeemed_at: string | null;
          redeemed_booking_id: string | null;
          sent_at: string | null;
          token_hash: string;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          campaign_id: string;
          created_at?: string;
          customer_id: string;
          id?: string;
          redeemed_at?: string | null;
          redeemed_booking_id?: string | null;
          sent_at?: string | null;
          token_hash: string;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          campaign_id?: string;
          created_at?: string;
          customer_id?: string;
          id?: string;
          redeemed_at?: string | null;
          redeemed_booking_id?: string | null;
          sent_at?: string | null;
          token_hash?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_business_id_campaign_id_fkey";
            columns: ["business_id", "campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "campaign_recipients_business_id_customer_id_fkey";
            columns: ["business_id", "customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "campaign_recipients_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaign_recipients_business_id_redeemed_booking_id_fkey";
            columns: ["business_id", "redeemed_booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      campaigns: {
        Row: {
          audience: NonNullable<Json>;
          business_id: string;
          channel: Database["public"]["Enums"]["message_channel"];
          created_at: string;
          created_by: string;
          id: string;
          message: string;
          name: string;
          offer_pct: number | null;
          offer_text: string | null;
          offer_valid_until: string | null;
          sent_at: string | null;
          status: Database["public"]["Enums"]["campaign_status"];
          updated_at: string;
        };
        Insert: {
          audience: NonNullable<Json>;
          business_id: string;
          channel: Database["public"]["Enums"]["message_channel"];
          created_at?: string;
          created_by: string;
          id?: string;
          message: string;
          name: string;
          offer_pct?: number | null;
          offer_text?: string | null;
          offer_valid_until?: string | null;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["campaign_status"];
          updated_at?: string;
        };
        Update: {
          audience?: NonNullable<Json>;
          business_id?: string;
          channel?: Database["public"]["Enums"]["message_channel"];
          created_at?: string;
          created_by?: string;
          id?: string;
          message?: string;
          name?: string;
          offer_pct?: number | null;
          offer_text?: string | null;
          offer_valid_until?: string | null;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["campaign_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
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
      customer_account_links: {
        Row: {
          business_id: string;
          customer_id: string;
          linked_at: string;
          linked_via: string;
          user_id: string;
        };
        Insert: {
          business_id: string;
          customer_id: string;
          linked_at?: string;
          linked_via: string;
          user_id: string;
        };
        Update: {
          business_id?: string;
          customer_id?: string;
          linked_at?: string;
          linked_via?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_account_links_customer_fkey";
            columns: ["business_id", "customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "customer_account_links_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "customer_accounts";
            referencedColumns: ["user_id"];
          },
        ];
      };
      customer_accounts: {
        Row: {
          created_at: string;
          display_name: string | null;
          marketing_consent_at: string | null;
          marketing_consent_version: string | null;
          phone_e164: string | null;
          phone_verified_at: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          marketing_consent_at?: string | null;
          marketing_consent_version?: string | null;
          phone_e164?: string | null;
          phone_verified_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          marketing_consent_at?: string | null;
          marketing_consent_version?: string | null;
          phone_e164?: string | null;
          phone_verified_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
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
          is_member: boolean;
          last_visit_at: string | null;
          last_winback_at: string | null;
          member_since: string | null;
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
          is_member?: boolean;
          last_visit_at?: string | null;
          last_winback_at?: string | null;
          member_since?: string | null;
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
          is_member?: boolean;
          last_visit_at?: string | null;
          last_winback_at?: string | null;
          member_since?: string | null;
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
      favorites: {
        Row: {
          business_id: string;
          created_at: string;
          user_id: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          user_id: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favorites_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favorites_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "customer_accounts";
            referencedColumns: ["user_id"];
          },
        ];
      };
      flash_slots: {
        Row: {
          booking_id: string | null;
          business_id: string;
          created_at: string;
          created_by: string;
          discount_pct: number;
          ends_at: string;
          id: string;
          service_ids: string[] | null;
          staff_id: string;
          starts_at: string;
          status: Database["public"]["Enums"]["flash_slot_status"];
          updated_at: string;
        };
        Insert: {
          booking_id?: string | null;
          business_id: string;
          created_at?: string;
          created_by: string;
          discount_pct: number;
          ends_at: string;
          id?: string;
          service_ids?: string[] | null;
          staff_id: string;
          starts_at: string;
          status?: Database["public"]["Enums"]["flash_slot_status"];
          updated_at?: string;
        };
        Update: {
          booking_id?: string | null;
          business_id?: string;
          created_at?: string;
          created_by?: string;
          discount_pct?: number;
          ends_at?: string;
          id?: string;
          service_ids?: string[] | null;
          staff_id?: string;
          starts_at?: string;
          status?: Database["public"]["Enums"]["flash_slot_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "flash_slots_business_id_booking_id_fkey";
            columns: ["business_id", "booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "flash_slots_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "flash_slots_business_id_staff_id_fkey";
            columns: ["business_id", "staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      gift_card_ledger: {
        Row: {
          actor_user_id: string | null;
          booking_id: string | null;
          business_id: string;
          created_at: string;
          delta_minor: number;
          gift_card_id: string;
          id: number;
          kind: string;
          payment_id: string | null;
        };
        Insert: {
          actor_user_id?: string | null;
          booking_id?: string | null;
          business_id: string;
          created_at?: string;
          delta_minor: number;
          gift_card_id: string;
          id?: never;
          kind: string;
          payment_id?: string | null;
        };
        Update: {
          actor_user_id?: string | null;
          booking_id?: string | null;
          business_id?: string;
          created_at?: string;
          delta_minor?: number;
          gift_card_id?: string;
          id?: never;
          kind?: string;
          payment_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "gift_card_ledger_business_id_booking_id_fkey";
            columns: ["business_id", "booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "gift_card_ledger_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gift_card_ledger_business_id_gift_card_id_fkey";
            columns: ["business_id", "gift_card_id"];
            isOneToOne: false;
            referencedRelation: "gift_cards";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      gift_card_orders: {
        Row: {
          amount_minor: number;
          attempts: number;
          business_id: string;
          buyer_email: string | null;
          buyer_name: string | null;
          buyer_token_hash: string | null;
          channel: string;
          created_at: string;
          currency: string;
          deliver_on: string | null;
          expires_at: string;
          fee_minor: number;
          greeting: string | null;
          id: string;
          in_store_method: string | null;
          next_attempt_at: string;
          paid_at: string | null;
          payment_intent_id: string | null;
          personal_data_cleared_at: string | null;
          recipient_email: string | null;
          recipient_name: string | null;
          refunded_minor: number;
          session_id: string | null;
          sold_by_user_id: string | null;
          status: string;
          stripe_account_id: string | null;
          theme: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          amount_minor: number;
          attempts?: number;
          business_id: string;
          buyer_email?: string | null;
          buyer_name?: string | null;
          buyer_token_hash?: string | null;
          channel?: string;
          created_at?: string;
          currency?: string;
          deliver_on?: string | null;
          expires_at: string;
          fee_minor: number;
          greeting?: string | null;
          id?: string;
          in_store_method?: string | null;
          next_attempt_at?: string;
          paid_at?: string | null;
          payment_intent_id?: string | null;
          personal_data_cleared_at?: string | null;
          recipient_email?: string | null;
          recipient_name?: string | null;
          refunded_minor?: number;
          session_id?: string | null;
          sold_by_user_id?: string | null;
          status?: string;
          stripe_account_id?: string | null;
          theme?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          amount_minor?: number;
          attempts?: number;
          business_id?: string;
          buyer_email?: string | null;
          buyer_name?: string | null;
          buyer_token_hash?: string | null;
          channel?: string;
          created_at?: string;
          currency?: string;
          deliver_on?: string | null;
          expires_at?: string;
          fee_minor?: number;
          greeting?: string | null;
          id?: string;
          in_store_method?: string | null;
          next_attempt_at?: string;
          paid_at?: string | null;
          payment_intent_id?: string | null;
          personal_data_cleared_at?: string | null;
          recipient_email?: string | null;
          recipient_name?: string | null;
          refunded_minor?: number;
          session_id?: string | null;
          sold_by_user_id?: string | null;
          status?: string;
          stripe_account_id?: string | null;
          theme?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "gift_card_orders_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      gift_cards: {
        Row: {
          balance_minor: number;
          business_id: string;
          code: string;
          created_at: string;
          currency: string;
          delivered_at: string | null;
          expires_at: string;
          id: string;
          initial_minor: number;
          order_id: string;
          purchased_at: string;
          status: string;
          updated_at: string;
          user_id: string | null;
          view_token_hash: string;
        };
        Insert: {
          balance_minor?: number;
          business_id: string;
          code: string;
          created_at?: string;
          currency?: string;
          delivered_at?: string | null;
          expires_at: string;
          id?: string;
          initial_minor: number;
          order_id: string;
          purchased_at: string;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
          view_token_hash: string;
        };
        Update: {
          balance_minor?: number;
          business_id?: string;
          code?: string;
          created_at?: string;
          currency?: string;
          delivered_at?: string | null;
          expires_at?: string;
          id?: string;
          initial_minor?: number;
          order_id?: string;
          purchased_at?: string;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
          view_token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gift_cards_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gift_cards_business_id_order_id_fkey";
            columns: ["business_id", "order_id"];
            isOneToOne: false;
            referencedRelation: "gift_card_orders";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      inbound_events: {
        Row: {
          event_id: string;
          payload: NonNullable<Json>;
          processed_at: string | null;
          provider: string;
          received_at: string;
        };
        Insert: {
          event_id: string;
          payload?: NonNullable<Json>;
          processed_at?: string | null;
          provider: string;
          received_at?: string;
        };
        Update: {
          event_id?: string;
          payload?: NonNullable<Json>;
          processed_at?: string | null;
          provider?: string;
          received_at?: string;
        };
        Relationships: [];
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
          delivered_at: string | null;
          error: string | null;
          fallback_reason: string | null;
          id: string;
          next_attempt_at: string;
          payload: NonNullable<Json>;
          provider_message_id: string | null;
          quota_reserved_at: string | null;
          read_at: string | null;
          recipient_kind: Database["public"]["Enums"]["message_recipient_kind"];
          sent_at: string | null;
          sms_segments: number | null;
          status: Database["public"]["Enums"]["message_outbox_status"];
          template: string;
          updated_at: string;
          wa_message_id: string | null;
          waitlist_entry_id: string | null;
        };
        Insert: {
          attempts?: number;
          booking_id?: string | null;
          business_id: string;
          category: Database["public"]["Enums"]["message_category"];
          channel: Database["public"]["Enums"]["message_channel"];
          created_at?: string;
          dedupe_key: string;
          delivered_at?: string | null;
          error?: string | null;
          fallback_reason?: string | null;
          id?: string;
          next_attempt_at?: string;
          payload?: NonNullable<Json>;
          provider_message_id?: string | null;
          quota_reserved_at?: string | null;
          read_at?: string | null;
          recipient_kind: Database["public"]["Enums"]["message_recipient_kind"];
          sent_at?: string | null;
          sms_segments?: number | null;
          status?: Database["public"]["Enums"]["message_outbox_status"];
          template: string;
          updated_at?: string;
          wa_message_id?: string | null;
          waitlist_entry_id?: string | null;
        };
        Update: {
          attempts?: number;
          booking_id?: string | null;
          business_id?: string;
          category?: Database["public"]["Enums"]["message_category"];
          channel?: Database["public"]["Enums"]["message_channel"];
          created_at?: string;
          dedupe_key?: string;
          delivered_at?: string | null;
          error?: string | null;
          fallback_reason?: string | null;
          id?: string;
          next_attempt_at?: string;
          payload?: NonNullable<Json>;
          provider_message_id?: string | null;
          quota_reserved_at?: string | null;
          read_at?: string | null;
          recipient_kind?: Database["public"]["Enums"]["message_recipient_kind"];
          sent_at?: string | null;
          sms_segments?: number | null;
          status?: Database["public"]["Enums"]["message_outbox_status"];
          template?: string;
          updated_at?: string;
          wa_message_id?: string | null;
          waitlist_entry_id?: string | null;
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
          {
            foreignKeyName: "message_outbox_waitlist_entry_fk";
            columns: ["business_id", "waitlist_entry_id"];
            isOneToOne: false;
            referencedRelation: "waitlist_entries";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      offers: {
        Row: {
          business_id: string;
          category: string;
          created_at: string;
          currency: string;
          description: string | null;
          id: string;
          image_url: string | null;
          includes: string[];
          last_unpublished_at: string | null;
          offer_price_minor: number;
          published_at: string | null;
          quantity_sold: number;
          quantity_total: number | null;
          regular_price_minor: number;
          sale_ends_at: string | null;
          sale_starts_at: string | null;
          service_id: string;
          slug: string;
          status: string;
          terms: string | null;
          title: string;
          updated_at: string;
          valid_months: number;
        };
        Insert: {
          business_id: string;
          category: string;
          created_at?: string;
          currency: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          includes?: string[];
          last_unpublished_at?: string | null;
          offer_price_minor: number;
          published_at?: string | null;
          quantity_sold?: number;
          quantity_total?: number | null;
          regular_price_minor: number;
          sale_ends_at?: string | null;
          sale_starts_at?: string | null;
          service_id: string;
          slug: string;
          status?: string;
          terms?: string | null;
          title: string;
          updated_at?: string;
          valid_months?: number;
        };
        Update: {
          business_id?: string;
          category?: string;
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          includes?: string[];
          last_unpublished_at?: string | null;
          offer_price_minor?: number;
          published_at?: string | null;
          quantity_sold?: number;
          quantity_total?: number | null;
          regular_price_minor?: number;
          sale_ends_at?: string | null;
          sale_starts_at?: string | null;
          service_id?: string;
          slug?: string;
          status?: string;
          terms?: string | null;
          title?: string;
          updated_at?: string;
          valid_months?: number;
        };
        Relationships: [
          {
            foreignKeyName: "offers_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offers_business_id_service_id_fkey";
            columns: ["business_id", "service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["business_id", "id"];
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
      review_invites: {
        Row: {
          booking_id: string;
          business_id: string;
          created_at: string;
          id: string;
          token_hash: string;
        };
        Insert: {
          booking_id: string;
          business_id: string;
          created_at?: string;
          id?: string;
          token_hash: string;
        };
        Update: {
          booking_id?: string;
          business_id?: string;
          created_at?: string;
          id?: string;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "review_invites_business_id_booking_id_fkey";
            columns: ["business_id", "booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "review_invites_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          booking_id: string;
          business_id: string;
          comment: string | null;
          created_at: string;
          customer_id: string;
          display_name: string | null;
          hidden_at: string | null;
          id: string;
          rating: number;
          replied_at: string | null;
          reply: string | null;
          report_note: string | null;
          report_reason: string | null;
          reported_at: string | null;
          updated_at: string;
        };
        Insert: {
          booking_id: string;
          business_id: string;
          comment?: string | null;
          created_at?: string;
          customer_id: string;
          display_name?: string | null;
          hidden_at?: string | null;
          id?: string;
          rating: number;
          replied_at?: string | null;
          reply?: string | null;
          report_note?: string | null;
          report_reason?: string | null;
          reported_at?: string | null;
          updated_at?: string;
        };
        Update: {
          booking_id?: string;
          business_id?: string;
          comment?: string | null;
          created_at?: string;
          customer_id?: string;
          display_name?: string | null;
          hidden_at?: string | null;
          id?: string;
          rating?: number;
          replied_at?: string | null;
          reply?: string | null;
          report_note?: string | null;
          report_reason?: string | null;
          reported_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_booking_id_fkey";
            columns: ["business_id", "booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "reviews_business_id_customer_id_fkey";
            columns: ["business_id", "customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "reviews_business_id_fkey";
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
      service_price_history: {
        Row: {
          business_id: string;
          id: number;
          price_minor: number;
          service_id: string;
          valid_from: string;
        };
        Insert: {
          business_id: string;
          id?: never;
          price_minor: number;
          service_id: string;
          valid_from?: string;
        };
        Update: {
          business_id?: string;
          id?: never;
          price_minor?: number;
          service_id?: string;
          valid_from?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_price_history_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_price_history_business_id_service_id_fkey";
            columns: ["business_id", "service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["business_id", "id"];
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
          price_from: boolean;
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
          price_from?: boolean;
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
          price_from?: boolean;
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
      sms_credit_ledger: {
        Row: {
          business_id: string;
          created_at: string;
          delta: number;
          id: number;
          kind: string;
          outbox_id: string | null;
          purchase_id: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          delta: number;
          id?: never;
          kind: string;
          outbox_id?: string | null;
          purchase_id: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          delta?: number;
          id?: never;
          kind?: string;
          outbox_id?: string | null;
          purchase_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sms_credit_ledger_business_id_purchase_id_fkey";
            columns: ["business_id", "purchase_id"];
            isOneToOne: false;
            referencedRelation: "sms_credit_purchases";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      sms_credit_purchases: {
        Row: {
          amount_net: number;
          amount_total: number;
          amount_vat: number;
          business_id: string;
          created_at: string;
          created_by: string | null;
          credits_refunded: number;
          credits_remaining: number;
          credits_total: number;
          currency: string;
          expires_at: string | null;
          id: string;
          package_size: number;
          paid_at: string | null;
          receipt_url: string | null;
          status: string;
          stripe_checkout_session_id: string | null;
          stripe_payment_intent_id: string | null;
          updated_at: string;
        };
        Insert: {
          amount_net: number;
          amount_total: number;
          amount_vat: number;
          business_id: string;
          created_at?: string;
          created_by?: string | null;
          credits_refunded?: number;
          credits_remaining?: number;
          credits_total: number;
          currency?: string;
          expires_at?: string | null;
          id?: string;
          package_size: number;
          paid_at?: string | null;
          receipt_url?: string | null;
          status?: string;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          updated_at?: string;
        };
        Update: {
          amount_net?: number;
          amount_total?: number;
          amount_vat?: number;
          business_id?: string;
          created_at?: string;
          created_by?: string | null;
          credits_refunded?: number;
          credits_remaining?: number;
          credits_total?: number;
          currency?: string;
          expires_at?: string | null;
          id?: string;
          package_size?: number;
          paid_at?: string | null;
          receipt_url?: string | null;
          status?: string;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sms_credit_purchases_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
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
      stripe_accounts: {
        Row: {
          business_id: string;
          charges_enabled: boolean;
          created_at: string;
          details_submitted: boolean;
          payouts_enabled: boolean;
          requirements_due: boolean;
          stripe_account_id: string;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          charges_enabled?: boolean;
          created_at?: string;
          details_submitted?: boolean;
          payouts_enabled?: boolean;
          requirements_due?: boolean;
          stripe_account_id: string;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          charges_enabled?: boolean;
          created_at?: string;
          details_submitted?: boolean;
          payouts_enabled?: boolean;
          requirements_due?: boolean;
          stripe_account_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stripe_accounts_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: true;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      stripe_checkouts: {
        Row: {
          amount_minor: number;
          attempts: number;
          booking_id: string;
          business_id: string;
          created_at: string;
          currency: string;
          fee_minor: number;
          id: string;
          mode: string;
          next_attempt_at: string;
          payment_intent_id: string | null;
          session_id: string;
          status: string;
          stripe_account_id: string;
          updated_at: string;
        };
        Insert: {
          amount_minor: number;
          attempts?: number;
          booking_id: string;
          business_id: string;
          created_at?: string;
          currency: string;
          fee_minor?: number;
          id?: string;
          mode?: string;
          next_attempt_at?: string;
          payment_intent_id?: string | null;
          session_id: string;
          status?: string;
          stripe_account_id: string;
          updated_at?: string;
        };
        Update: {
          amount_minor?: number;
          attempts?: number;
          booking_id?: string;
          business_id?: string;
          created_at?: string;
          currency?: string;
          fee_minor?: number;
          id?: string;
          mode?: string;
          next_attempt_at?: string;
          payment_intent_id?: string | null;
          session_id?: string;
          status?: string;
          stripe_account_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stripe_checkouts_business_id_booking_id_fkey";
            columns: ["business_id", "booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "stripe_checkouts_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
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
      voucher_orders: {
        Row: {
          amount_minor: number;
          attempts: number;
          business_id: string;
          created_at: string;
          currency: string;
          expires_at: string;
          fee_minor: number;
          id: string;
          next_attempt_at: string;
          offer_id: string;
          paid_at: string | null;
          payment_intent_id: string | null;
          session_id: string | null;
          status: string;
          stripe_account_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount_minor: number;
          attempts?: number;
          business_id: string;
          created_at?: string;
          currency: string;
          expires_at: string;
          fee_minor: number;
          id?: string;
          next_attempt_at?: string;
          offer_id: string;
          paid_at?: string | null;
          payment_intent_id?: string | null;
          session_id?: string | null;
          status?: string;
          stripe_account_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount_minor?: number;
          attempts?: number;
          business_id?: string;
          created_at?: string;
          currency?: string;
          expires_at?: string;
          fee_minor?: number;
          id?: string;
          next_attempt_at?: string;
          offer_id?: string;
          paid_at?: string | null;
          payment_intent_id?: string | null;
          session_id?: string | null;
          status?: string;
          stripe_account_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "voucher_orders_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "voucher_orders_business_id_offer_id_fkey";
            columns: ["business_id", "offer_id"];
            isOneToOne: false;
            referencedRelation: "offers";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      vouchers: {
        Row: {
          booking_id: string | null;
          business_id: string;
          code: string;
          created_at: string;
          currency: string;
          expires_at: string;
          id: string;
          offer_id: string;
          order_id: string;
          price_minor: number;
          purchased_at: string;
          redeemed_at: string | null;
          refunded_at: string | null;
          service_id: string;
          status: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          booking_id?: string | null;
          business_id: string;
          code: string;
          created_at?: string;
          currency: string;
          expires_at: string;
          id?: string;
          offer_id: string;
          order_id: string;
          price_minor: number;
          purchased_at: string;
          redeemed_at?: string | null;
          refunded_at?: string | null;
          service_id: string;
          status?: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          booking_id?: string | null;
          business_id?: string;
          code?: string;
          created_at?: string;
          currency?: string;
          expires_at?: string;
          id?: string;
          offer_id?: string;
          order_id?: string;
          price_minor?: number;
          purchased_at?: string;
          redeemed_at?: string | null;
          refunded_at?: string | null;
          service_id?: string;
          status?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vouchers_business_id_booking_id_fkey";
            columns: ["business_id", "booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "vouchers_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vouchers_business_id_offer_id_fkey";
            columns: ["business_id", "offer_id"];
            isOneToOne: false;
            referencedRelation: "offers";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "vouchers_business_id_order_id_fkey";
            columns: ["business_id", "order_id"];
            isOneToOne: false;
            referencedRelation: "voucher_orders";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "vouchers_business_id_service_id_fkey";
            columns: ["business_id", "service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      waitlist_entries: {
        Row: {
          business_id: string;
          created_at: string;
          customer_id: string;
          day: string;
          id: string;
          offer_expires_at: string | null;
          offer_token_hash: string | null;
          offered_at: string | null;
          service_id: string;
          staff_id: string | null;
          status: Database["public"]["Enums"]["waitlist_status"];
          updated_at: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          customer_id: string;
          day: string;
          id?: string;
          offer_expires_at?: string | null;
          offer_token_hash?: string | null;
          offered_at?: string | null;
          service_id: string;
          staff_id?: string | null;
          status?: Database["public"]["Enums"]["waitlist_status"];
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          customer_id?: string;
          day?: string;
          id?: string;
          offer_expires_at?: string | null;
          offer_token_hash?: string | null;
          offered_at?: string | null;
          service_id?: string;
          staff_id?: string | null;
          status?: Database["public"]["Enums"]["waitlist_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_business_id_customer_id_fkey";
            columns: ["business_id", "customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "waitlist_entries_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "waitlist_entries_business_id_service_id_fkey";
            columns: ["business_id", "service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "waitlist_entries_business_id_staff_id_fkey";
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
      customer_stats: {
        Args: { b: string; customer: string };
        Returns: {
          average_price_clp: number;
          last_visit_at: string;
          no_show_count: number;
          total_revenue_clp: number;
          visits_count: number;
        }[];
      };
      report_breakdown: {
        Args: { b: string; dim: string; from: string; to: string };
        Returns: {
          amount_clp: number;
          bookings_count: number;
          key: string;
          label: string;
        }[];
      };
      report_summary: {
        Args: { b: string; from: string; to: string };
        Returns: {
          average_price_clp: number;
          bookings_count: number;
          expected_clp: number;
          no_show_count: number;
          revenue_clp: number;
        }[];
      };
      report_weekly: {
        Args: { b: string; weeks: number };
        Returns: {
          revenue_clp: number;
          week_start: string;
        }[];
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
        | "cancel_requested"
        | "cancelled";
      business_plan: "free" | "emprende" | "equipo" | "local" | "custom";
      business_status: "active" | "frozen";
      campaign_status: "draft" | "sent";
      consent_channel: "web" | "whatsapp" | "manual";
      consent_kind:
        "terms" | "marketing" | "waitlist" | "owner_terms" | "dpa" | "whatsapp";
      consent_subject: "customer" | "owner";
      deposit_kind: "none" | "fixed" | "percent";
      flash_slot_status: "active" | "booked" | "cancelled";
      member_role: "owner" | "staff" | "vendor" | "admin";
      message_category: "utility" | "marketing" | "service";
      message_channel: "email" | "sms" | "whatsapp";
      message_outbox_status:
        "queued" | "sending" | "sent" | "failed" | "dead" | "cancelled";
      message_recipient_kind: "customer" | "owner" | "invitee";
      payment_kind: "deposit" | "balance" | "full";
      payment_method:
        | "cash"
        | "card_terminal"
        | "transfer"
        | "swish"
        | "stripe"
        | "gift_card"
        | "mercadopago";
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
      waitlist_status: "waiting" | "offered" | "booked" | "expired" | "removed";
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
        "cancel_requested",
        "cancelled",
      ],
      business_plan: ["free", "emprende", "equipo", "local", "custom"],
      business_status: ["active", "frozen"],
      campaign_status: ["draft", "sent"],
      consent_channel: ["web", "whatsapp", "manual"],
      consent_kind: [
        "terms",
        "marketing",
        "waitlist",
        "owner_terms",
        "dpa",
        "whatsapp",
      ],
      consent_subject: ["customer", "owner"],
      deposit_kind: ["none", "fixed", "percent"],
      flash_slot_status: ["active", "booked", "cancelled"],
      member_role: ["owner", "staff", "vendor", "admin"],
      message_category: ["utility", "marketing", "service"],
      message_channel: ["email", "sms", "whatsapp"],
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
      payment_method: [
        "cash",
        "card_terminal",
        "transfer",
        "swish",
        "stripe",
        "gift_card",
        "mercadopago",
      ],
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
      waitlist_status: ["waiting", "offered", "booked", "expired", "removed"],
    },
  },
} as const;
