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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      application_answers: {
        Row: {
          answer: string
          application_id: string
          created_at: string
          id: string
          question_id: string
          updated_at: string
        }
        Insert: {
          answer: string
          application_id: string
          created_at?: string
          id?: string
          question_id: string
          updated_at?: string
        }
        Update: {
          answer?: string
          application_id?: string
          created_at?: string
          id?: string
          question_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_answers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "job_screening_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      application_notes: {
        Row: {
          application_id: string
          author_id: string | null
          body: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          application_id: string
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      application_status_history: {
        Row: {
          application_id: string
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["application_status"] | null
          id: string
          to_status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          application_id: string
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["application_status"] | null
          id?: string
          to_status: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          application_id?: string
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["application_status"] | null
          id?: string
          to_status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          target_id: string | null
          target_table: string | null
          updated_at: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_table?: string | null
          updated_at?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_table?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      buddy_profiles: {
        Row: {
          bio: string | null
          city_id: string
          created_at: string
          help_types: Database["public"]["Enums"]["relocation_need"][]
          is_active: boolean
          languages: string[]
          neighbourhood_ids: string[]
          rating_avg: number | null
          rating_count: number
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
        }
        Insert: {
          bio?: string | null
          city_id: string
          created_at?: string
          help_types?: Database["public"]["Enums"]["relocation_need"][]
          is_active?: boolean
          languages?: string[]
          neighbourhood_ids?: string[]
          rating_avg?: number | null
          rating_count?: number
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
        }
        Update: {
          bio?: string | null
          city_id?: string
          created_at?: string
          help_types?: Database["public"]["Enums"]["relocation_need"][]
          is_active?: boolean
          languages?: string[]
          neighbourhood_ids?: string[]
          rating_avg?: number | null
          rating_count?: number
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buddy_profiles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buddy_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      buddy_ratings: {
        Row: {
          buddy_id: string
          comment: string | null
          created_at: string
          hidden_at: string | null
          id: string
          rater_id: string
          rating: number
          request_id: string
          updated_at: string
        }
        Insert: {
          buddy_id: string
          comment?: string | null
          created_at?: string
          hidden_at?: string | null
          id?: string
          rater_id: string
          rating: number
          request_id: string
          updated_at?: string
        }
        Update: {
          buddy_id?: string
          comment?: string | null
          created_at?: string
          hidden_at?: string | null
          id?: string
          rater_id?: string
          rating?: number
          request_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buddy_ratings_buddy_id_fkey"
            columns: ["buddy_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buddy_ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buddy_ratings_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "relocation_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          center: unknown
          country_code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          state: string
          timezone: string
          updated_at: string
        }
        Insert: {
          center: unknown
          country_code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          state: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          center?: unknown
          country_code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          state?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          description: string | null
          hidden_at: string | null
          id: string
          industry: string | null
          is_community_owned: boolean
          leap_friendly: boolean
          logo_path: string | null
          name: string
          owner_id: string
          size: Database["public"]["Enums"]["company_size"] | null
          slug: string
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          hidden_at?: string | null
          id?: string
          industry?: string | null
          is_community_owned?: boolean
          leap_friendly?: boolean
          logo_path?: string | null
          name: string
          owner_id: string
          size?: Database["public"]["Enums"]["company_size"] | null
          slug: string
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          hidden_at?: string | null
          id?: string
          industry?: string | null
          is_community_owned?: boolean
          leap_friendly?: boolean
          logo_path?: string | null
          name?: string
          owner_id?: string
          size?: Database["public"]["Enums"]["company_size"] | null
          slug?: string
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_affiliations: {
        Row: {
          company_id: string
          confirmed_by_company_at: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          confirmed_by_company_at?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          confirmed_by_company_at?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_affiliations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_affiliations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_locations: {
        Row: {
          address: string | null
          city_id: string
          company_id: string
          created_at: string
          id: string
          location: unknown
          updated_at: string
        }
        Insert: {
          address?: string | null
          city_id: string
          company_id: string
          created_at?: string
          id?: string
          location?: unknown
          updated_at?: string
        }
        Update: {
          address?: string | null
          city_id?: string
          company_id?: string
          created_at?: string
          id?: string
          location?: unknown
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_locations_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          member_role: Database["public"]["Enums"]["company_member_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          member_role?: Database["public"]["Enums"]["company_member_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          member_role?: Database["public"]["Enums"]["company_member_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          last_read_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          last_read_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          last_read_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          context_id: string
          context_type: Database["public"]["Enums"]["conversation_context"]
          created_at: string
          id: string
          last_message_at: string | null
          updated_at: string
        }
        Insert: {
          context_id: string
          context_type: Database["public"]["Enums"]["conversation_context"]
          created_at?: string
          id?: string
          last_message_at?: string | null
          updated_at?: string
        }
        Update: {
          context_id?: string
          context_type?: Database["public"]["Enums"]["conversation_context"]
          created_at?: string
          id?: string
          last_message_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cvs: {
        Row: {
          created_at: string
          file_name: string
          id: string
          is_default: boolean
          size_bytes: number
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          is_default?: boolean
          size_bytes: number
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          is_default?: boolean
          size_bytes?: number
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cvs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      educations: {
        Row: {
          created_at: string
          degree: string
          end_year: number | null
          field: string | null
          id: string
          institution: string
          start_year: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          degree: string
          end_year?: number | null
          field?: string | null
          id?: string
          institution: string
          start_year?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          degree?: string
          end_year?: number | null
          field?: string | null
          id?: string
          institution?: string
          start_year?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "educations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      experiences: {
        Row: {
          company_name: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_current: boolean
          start_date: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          start_date: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          start_date?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flat_contact_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          id: string
          intro: string
          listing_id: string
          requester_id: string
          status: Database["public"]["Enums"]["offer_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          id?: string
          intro: string
          listing_id: string
          requester_id: string
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          id?: string
          intro?: string
          listing_id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flat_contact_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "flat_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flat_contact_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flat_listing_photos: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          position: number
          storage_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          position?: number
          storage_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          position?: number
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flat_listing_photos_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "flat_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      flat_listing_private: {
        Row: {
          address_line: string
          created_at: string
          exact_location: unknown
          landmark: string | null
          listing_id: string
          updated_at: string
        }
        Insert: {
          address_line: string
          created_at?: string
          exact_location: unknown
          landmark?: string | null
          listing_id: string
          updated_at?: string
        }
        Update: {
          address_line?: string
          created_at?: string
          exact_location?: unknown
          landmark?: string | null
          listing_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flat_listing_private_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "flat_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      flat_listings: {
        Row: {
          amenities: string[]
          approx_location: unknown
          available_from: string
          bathrooms: number | null
          bedrooms: number | null
          city_id: string
          created_at: string
          currency: string
          deleted_at: string | null
          deposit: number | null
          description: string | null
          expires_at: string
          food_pref: Database["public"]["Enums"]["food_pref"] | null
          furnishing: Database["public"]["Enums"]["furnishing"]
          hidden_at: string | null
          id: string
          lister_id: string
          listing_type: Database["public"]["Enums"]["listing_type"]
          min_stay_months: number | null
          neighbourhood_id: string | null
          renewed_at: string | null
          rent: number
          status: Database["public"]["Enums"]["listing_status"]
          tenant_gender_pref: Database["public"]["Enums"]["tenant_gender_pref"]
          title: string
          updated_at: string
        }
        Insert: {
          amenities?: string[]
          approx_location?: unknown
          available_from: string
          bathrooms?: number | null
          bedrooms?: number | null
          city_id: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          deposit?: number | null
          description?: string | null
          expires_at?: string
          food_pref?: Database["public"]["Enums"]["food_pref"] | null
          furnishing?: Database["public"]["Enums"]["furnishing"]
          hidden_at?: string | null
          id?: string
          lister_id: string
          listing_type: Database["public"]["Enums"]["listing_type"]
          min_stay_months?: number | null
          neighbourhood_id?: string | null
          renewed_at?: string | null
          rent: number
          status?: Database["public"]["Enums"]["listing_status"]
          tenant_gender_pref?: Database["public"]["Enums"]["tenant_gender_pref"]
          title: string
          updated_at?: string
        }
        Update: {
          amenities?: string[]
          approx_location?: unknown
          available_from?: string
          bathrooms?: number | null
          bedrooms?: number | null
          city_id?: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          deposit?: number | null
          description?: string | null
          expires_at?: string
          food_pref?: Database["public"]["Enums"]["food_pref"] | null
          furnishing?: Database["public"]["Enums"]["furnishing"]
          hidden_at?: string | null
          id?: string
          lister_id?: string
          listing_type?: Database["public"]["Enums"]["listing_type"]
          min_stay_months?: number | null
          neighbourhood_id?: string | null
          renewed_at?: string | null
          rent?: number
          status?: Database["public"]["Enums"]["listing_status"]
          tenant_gender_pref?: Database["public"]["Enums"]["tenant_gender_pref"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flat_listings_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flat_listings_lister_id_fkey"
            columns: ["lister_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flat_listings_neighbourhood_id_fkey"
            columns: ["neighbourhood_id"]
            isOneToOne: false
            referencedRelation: "neighbourhoods"
            referencedColumns: ["id"]
          },
        ]
      }
      flatmate_connections: {
        Row: {
          created_at: string
          decided_at: string | null
          id: string
          message: string | null
          recipient_id: string
          requester_id: string
          status: Database["public"]["Enums"]["offer_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          id?: string
          message?: string | null
          recipient_id: string
          requester_id: string
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          id?: string
          message?: string | null
          recipient_id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flatmate_connections_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flatmate_connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flatmate_profiles: {
        Row: {
          bio: string | null
          budget_max: number
          budget_min: number
          city_id: string
          cleanliness: number
          created_at: string
          currency: string
          food_habit: Database["public"]["Enums"]["food_habit"]
          guests_policy: Database["public"]["Enums"]["guests_policy"]
          is_active: boolean
          move_date: string
          neighbourhood_ids: string[]
          ok_with_smoker: boolean
          preferred_gender: Database["public"]["Enums"]["flatmate_gender_pref"]
          sleep_schedule: Database["public"]["Enums"]["sleep_schedule"]
          smokes: boolean
          updated_at: string
          user_id: string
          work_schedule: Database["public"]["Enums"]["work_schedule"]
        }
        Insert: {
          bio?: string | null
          budget_max: number
          budget_min: number
          city_id: string
          cleanliness?: number
          created_at?: string
          currency?: string
          food_habit: Database["public"]["Enums"]["food_habit"]
          guests_policy?: Database["public"]["Enums"]["guests_policy"]
          is_active?: boolean
          move_date: string
          neighbourhood_ids?: string[]
          ok_with_smoker?: boolean
          preferred_gender?: Database["public"]["Enums"]["flatmate_gender_pref"]
          sleep_schedule?: Database["public"]["Enums"]["sleep_schedule"]
          smokes?: boolean
          updated_at?: string
          user_id: string
          work_schedule?: Database["public"]["Enums"]["work_schedule"]
        }
        Update: {
          bio?: string | null
          budget_max?: number
          budget_min?: number
          city_id?: string
          cleanliness?: number
          created_at?: string
          currency?: string
          food_habit?: Database["public"]["Enums"]["food_habit"]
          guests_policy?: Database["public"]["Enums"]["guests_policy"]
          is_active?: boolean
          move_date?: string
          neighbourhood_ids?: string[]
          ok_with_smoker?: boolean
          preferred_gender?: Database["public"]["Enums"]["flatmate_gender_pref"]
          sleep_schedule?: Database["public"]["Enums"]["sleep_schedule"]
          smokes?: boolean
          updated_at?: string
          user_id?: string
          work_schedule?: Database["public"]["Enums"]["work_schedule"]
        }
        Relationships: [
          {
            foreignKeyName: "flatmate_profiles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flatmate_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_slots: {
        Row: {
          application_id: string
          created_at: string
          ends_at: string
          id: string
          location_or_link: string | null
          proposed_by: string | null
          starts_at: string
          status: Database["public"]["Enums"]["interview_slot_status"]
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          ends_at: string
          id?: string
          location_or_link?: string | null
          proposed_by?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["interview_slot_status"]
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          location_or_link?: string | null
          proposed_by?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["interview_slot_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_slots_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_slots_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          applicant_id: string
          cover_note: string | null
          created_at: string
          cv_id: string
          id: string
          job_id: string
          referral_id: string | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          applicant_id: string
          cover_note?: string | null
          created_at?: string
          cv_id: string
          id?: string
          job_id: string
          referral_id?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          cover_note?: string | null
          created_at?: string
          cv_id?: string
          id?: string
          job_id?: string
          referral_id?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_cv_id_fkey"
            columns: ["cv_id"]
            isOneToOne: false
            referencedRelation: "cvs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      job_salaries: {
        Row: {
          created_at: string
          currency: string
          is_visible: boolean
          job_id: string
          salary_max: number | null
          salary_min: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          is_visible?: boolean
          job_id: string
          salary_max?: number | null
          salary_min?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          is_visible?: boolean
          job_id?: string
          salary_max?: number | null
          salary_min?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_salaries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_screening_questions: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          job_id: string
          position: number
          question: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          job_id: string
          position?: number
          question: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          job_id?: string
          position?: number
          question?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_screening_questions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_skills: {
        Row: {
          created_at: string
          id: string
          job_id: string
          skill_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          skill_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          skill_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_skills_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          address_text: string | null
          application_deadline: string | null
          city_id: string | null
          closed_at: string | null
          company_id: string
          created_at: string
          description: string
          experience_level: Database["public"]["Enums"]["experience_level"]
          expires_at: string | null
          hidden_at: string | null
          id: string
          job_type: Database["public"]["Enums"]["job_type"]
          location: unknown
          neighbourhood_id: string | null
          openings: number
          posted_by: string | null
          published_at: string | null
          requirements: string | null
          search_tsv: unknown
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
          work_mode: Database["public"]["Enums"]["work_mode"]
        }
        Insert: {
          address_text?: string | null
          application_deadline?: string | null
          city_id?: string | null
          closed_at?: string | null
          company_id: string
          created_at?: string
          description: string
          experience_level: Database["public"]["Enums"]["experience_level"]
          expires_at?: string | null
          hidden_at?: string | null
          id?: string
          job_type: Database["public"]["Enums"]["job_type"]
          location?: unknown
          neighbourhood_id?: string | null
          openings?: number
          posted_by?: string | null
          published_at?: string | null
          requirements?: string | null
          search_tsv?: unknown
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at?: string
          work_mode: Database["public"]["Enums"]["work_mode"]
        }
        Update: {
          address_text?: string | null
          application_deadline?: string | null
          city_id?: string | null
          closed_at?: string | null
          company_id?: string
          created_at?: string
          description?: string
          experience_level?: Database["public"]["Enums"]["experience_level"]
          expires_at?: string | null
          hidden_at?: string | null
          id?: string
          job_type?: Database["public"]["Enums"]["job_type"]
          location?: unknown
          neighbourhood_id?: string | null
          openings?: number
          posted_by?: string | null
          published_at?: string | null
          requirements?: string | null
          search_tsv?: unknown
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
          work_mode?: Database["public"]["Enums"]["work_mode"]
        }
        Relationships: [
          {
            foreignKeyName: "jobs_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_neighbourhood_id_fkey"
            columns: ["neighbourhood_id"]
            isOneToOne: false
            referencedRelation: "neighbourhoods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leap_badges: {
        Row: {
          awarded_at: string
          awarded_by: string | null
          created_at: string
          id: string
          program_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          awarded_by?: string | null
          created_at?: string
          id?: string
          program_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          awarded_by?: string | null
          created_at?: string
          id?: string
          program_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leap_badges_awarded_by_fkey"
            columns: ["awarded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leap_badges_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "leap_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leap_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leap_enrollments: {
        Row: {
          completed_at: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_reason: string | null
          id: string
          motivation: string | null
          program_id: string
          status: Database["public"]["Enums"]["enrollment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          id?: string
          motivation?: string | null
          program_id: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          id?: string
          motivation?: string | null
          program_id?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leap_enrollments_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leap_enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "leap_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leap_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leap_programs: {
        Row: {
          badge_name: string
          capacity: number | null
          city_id: string | null
          created_at: string
          created_by: string | null
          description: string
          eligibility: string | null
          end_date: string
          id: string
          image_path: string | null
          mode: Database["public"]["Enums"]["program_mode"]
          program_type: Database["public"]["Enums"]["leap_program_type"]
          requires_approval: boolean
          seats_taken: number
          slug: string
          start_date: string
          status: Database["public"]["Enums"]["leap_program_status"]
          title: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          badge_name: string
          capacity?: number | null
          city_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          eligibility?: string | null
          end_date: string
          id?: string
          image_path?: string | null
          mode: Database["public"]["Enums"]["program_mode"]
          program_type: Database["public"]["Enums"]["leap_program_type"]
          requires_approval?: boolean
          seats_taken?: number
          slug: string
          start_date: string
          status?: Database["public"]["Enums"]["leap_program_status"]
          title: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          badge_name?: string
          capacity?: number | null
          city_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          eligibility?: string | null
          end_date?: string
          id?: string
          image_path?: string | null
          mode?: Database["public"]["Enums"]["program_mode"]
          program_type?: Database["public"]["Enums"]["leap_program_type"]
          requires_approval?: boolean
          seats_taken?: number
          slug?: string
          start_date?: string
          status?: Database["public"]["Enums"]["leap_program_status"]
          title?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leap_programs_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leap_programs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_availability_exceptions: {
        Row: {
          created_at: string
          end_time: string | null
          id: string
          kind: Database["public"]["Enums"]["availability_exception_kind"]
          mentor_id: string
          on_date: string
          start_time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          id?: string
          kind: Database["public"]["Enums"]["availability_exception_kind"]
          mentor_id: string
          on_date: string
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["availability_exception_kind"]
          mentor_id?: string
          on_date?: string
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_availability_exceptions_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentor_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mentor_availability_rules: {
        Row: {
          created_at: string
          end_time: string
          id: string
          mentor_id: string
          start_time: string
          updated_at: string
          weekday: number
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          mentor_id: string
          start_time: string
          updated_at?: string
          weekday: number
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          mentor_id?: string
          start_time?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "mentor_availability_rules_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentor_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mentor_private_notes: {
        Row: {
          body: string
          created_at: string
          id: string
          mentor_id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          mentor_id: string
          session_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          mentor_id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_private_notes_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_private_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mentorship_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_profiles: {
        Row: {
          bio: string | null
          city_id: string | null
          created_at: string
          default_duration_min: number
          headline: string
          industries: string[]
          is_accepting: boolean
          languages: string[]
          rating_avg: number | null
          rating_count: number
          session_types: Database["public"]["Enums"]["session_type"][]
          timezone: string
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          years_experience: number
        }
        Insert: {
          bio?: string | null
          city_id?: string | null
          created_at?: string
          default_duration_min?: number
          headline: string
          industries?: string[]
          is_accepting?: boolean
          languages?: string[]
          rating_avg?: number | null
          rating_count?: number
          session_types?: Database["public"]["Enums"]["session_type"][]
          timezone?: string
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          years_experience: number
        }
        Update: {
          bio?: string | null
          city_id?: string | null
          created_at?: string
          default_duration_min?: number
          headline?: string
          industries?: string[]
          is_accepting?: boolean
          languages?: string[]
          rating_avg?: number | null
          rating_count?: number
          session_types?: Database["public"]["Enums"]["session_type"][]
          timezone?: string
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          years_experience?: number
        }
        Relationships: [
          {
            foreignKeyName: "mentor_profiles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_skills: {
        Row: {
          created_at: string
          id: string
          mentor_id: string
          skill_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mentor_id: string
          skill_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mentor_id?: string
          skill_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_skills_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentor_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mentor_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_sessions: {
        Row: {
          cancel_reason: string | null
          cancelled_by: string | null
          created_at: string
          decline_reason: string | null
          ends_at: string
          goal_note: string | null
          id: string
          meeting_url: string | null
          mentee_id: string
          mentor_id: string
          responded_at: string | null
          session_type: Database["public"]["Enums"]["session_type"]
          starts_at: string
          status: Database["public"]["Enums"]["session_status"]
          updated_at: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_by?: string | null
          created_at?: string
          decline_reason?: string | null
          ends_at: string
          goal_note?: string | null
          id?: string
          meeting_url?: string | null
          mentee_id: string
          mentor_id: string
          responded_at?: string | null
          session_type: Database["public"]["Enums"]["session_type"]
          starts_at: string
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_by?: string | null
          created_at?: string
          decline_reason?: string | null
          ends_at?: string
          goal_note?: string | null
          id?: string
          meeting_url?: string | null
          mentee_id?: string
          mentor_id?: string
          responded_at?: string | null
          session_type?: Database["public"]["Enums"]["session_type"]
          starts_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_sessions_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_sessions_mentee_id_fkey"
            columns: ["mentee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_sessions_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentor_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_path: string | null
          body: string | null
          conversation_id: string
          created_at: string
          deleted_at: string | null
          hidden_at: string | null
          id: string
          sender_id: string | null
          updated_at: string
        }
        Insert: {
          attachment_path?: string | null
          body?: string | null
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          hidden_at?: string | null
          id?: string
          sender_id?: string | null
          updated_at?: string
        }
        Update: {
          attachment_path?: string | null
          body?: string | null
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          hidden_at?: string | null
          id?: string
          sender_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      neighbourhoods: {
        Row: {
          center: unknown
          city_id: string
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          center?: unknown
          city_id: string
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          center?: unknown
          city_id?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "neighbourhoods_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_private: {
        Row: {
          created_at: string
          phone: string | null
          updated_at: string
          user_id: string
          whatsapp_opt_in: boolean
        }
        Insert: {
          created_at?: string
          phone?: string | null
          updated_at?: string
          user_id: string
          whatsapp_opt_in?: boolean
        }
        Update: {
          created_at?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_opt_in?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profile_private_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_skills: {
        Row: {
          created_at: string
          id: string
          skill_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          skill_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          skill_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          bio: string | null
          city_id: string | null
          created_at: string
          full_name: string | null
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          intents: Database["public"]["Enums"]["onboarding_intent"][]
          onboarding_completed_at: string | null
          suspended_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          bio?: string | null
          city_id?: string | null
          created_at?: string
          full_name?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          id: string
          intents?: Database["public"]["Enums"]["onboarding_intent"][]
          onboarding_completed_at?: string | null
          suspended_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          bio?: string | null
          city_id?: string | null
          created_at?: string
          full_name?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          intents?: Database["public"]["Enums"]["onboarding_intent"][]
          onboarding_completed_at?: string | null
          suspended_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_events: {
        Row: {
          action: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_limit_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          job_id: string
          note: string | null
          referrer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          note?: string | null
          referrer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          note?: string | null
          referrer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      relocation_offers: {
        Row: {
          buddy_id: string
          created_at: string
          decided_at: string | null
          id: string
          message: string | null
          request_id: string
          status: Database["public"]["Enums"]["offer_status"]
          updated_at: string
        }
        Insert: {
          buddy_id: string
          created_at?: string
          decided_at?: string | null
          id?: string
          message?: string | null
          request_id: string
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
        }
        Update: {
          buddy_id?: string
          created_at?: string
          decided_at?: string | null
          id?: string
          message?: string | null
          request_id?: string
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relocation_offers_buddy_id_fkey"
            columns: ["buddy_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relocation_offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "relocation_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      relocation_requests: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          city_id: string
          closed_at: string | null
          created_at: string
          currency: string
          hidden_at: string | null
          household: Database["public"]["Enums"]["household_type"]
          id: string
          move_from: string
          move_to: string | null
          needs: Database["public"]["Enums"]["relocation_need"][]
          neighbourhood_ids: string[]
          note: string | null
          same_gender_buddies_only: boolean
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
          user_id: string
          workplace_address: string | null
          workplace_location: unknown
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          city_id: string
          closed_at?: string | null
          created_at?: string
          currency?: string
          hidden_at?: string | null
          household: Database["public"]["Enums"]["household_type"]
          id?: string
          move_from: string
          move_to?: string | null
          needs: Database["public"]["Enums"]["relocation_need"][]
          neighbourhood_ids?: string[]
          note?: string | null
          same_gender_buddies_only?: boolean
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          user_id: string
          workplace_address?: string | null
          workplace_location?: unknown
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          city_id?: string
          closed_at?: string | null
          created_at?: string
          currency?: string
          hidden_at?: string | null
          household?: Database["public"]["Enums"]["household_type"]
          id?: string
          move_from?: string
          move_to?: string | null
          needs?: Database["public"]["Enums"]["relocation_need"][]
          neighbourhood_ids?: string[]
          note?: string | null
          same_gender_buddies_only?: boolean
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          user_id?: string
          workplace_address?: string | null
          workplace_location?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "relocation_requests_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relocation_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_jobs: {
        Row: {
          created_at: string
          id: string
          job_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          alert_frequency: Database["public"]["Enums"]["alert_frequency"]
          created_at: string
          filters: Json
          id: string
          last_alerted_at: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_frequency?: Database["public"]["Enums"]["alert_frequency"]
          created_at?: string
          filters?: Json
          id?: string
          last_alerted_at?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_frequency?: Database["public"]["Enums"]["alert_frequency"]
          created_at?: string
          filters?: Json
          id?: string
          last_alerted_at?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_searches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seeker_profiles: {
        Row: {
          created_at: string
          experience_level:
            | Database["public"]["Enums"]["experience_level"]
            | null
          headline: string | null
          languages: string[]
          linkedin_url: string | null
          open_to_relocate: boolean
          portfolio_url: string | null
          preferred_city_ids: string[]
          summary: string | null
          updated_at: string
          user_id: string
          work_mode_pref: Database["public"]["Enums"]["work_mode"] | null
        }
        Insert: {
          created_at?: string
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          headline?: string | null
          languages?: string[]
          linkedin_url?: string | null
          open_to_relocate?: boolean
          portfolio_url?: string | null
          preferred_city_ids?: string[]
          summary?: string | null
          updated_at?: string
          user_id: string
          work_mode_pref?: Database["public"]["Enums"]["work_mode"] | null
        }
        Update: {
          created_at?: string
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          headline?: string | null
          languages?: string[]
          linkedin_url?: string | null
          open_to_relocate?: boolean
          portfolio_url?: string | null
          preferred_city_ids?: string[]
          summary?: string | null
          updated_at?: string
          user_id?: string
          work_mode_pref?: Database["public"]["Enums"]["work_mode"] | null
        }
        Relationships: [
          {
            foreignKeyName: "seeker_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seeker_salary_prefs: {
        Row: {
          created_at: string
          currency: string
          salary_max: number | null
          salary_min: number | null
          share_with_employers: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          salary_max?: number | null
          salary_min?: number | null
          share_with_employers?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          salary_max?: number | null
          salary_min?: number | null
          share_with_employers?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seeker_salary_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_feedback: {
        Row: {
          author_id: string
          author_side: Database["public"]["Enums"]["session_side"]
          comment: string | null
          created_at: string
          id: string
          next_steps: string | null
          rating: number | null
          session_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          author_side: Database["public"]["Enums"]["session_side"]
          comment?: string | null
          created_at?: string
          id?: string
          next_steps?: string | null
          rating?: number | null
          session_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_side?: Database["public"]["Enums"]["session_side"]
          comment?: string | null
          created_at?: string
          id?: string
          next_steps?: string | null
          rating?: number | null
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_feedback_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mentorship_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_requests: {
        Row: {
          applicant_note: string | null
          created_at: string
          document_paths: string[]
          id: string
          kind: Database["public"]["Enums"]["verification_kind"]
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["verification_status"]
          subject_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          applicant_note?: string | null
          created_at?: string
          document_paths?: string[]
          id?: string
          kind: Database["public"]["Enums"]["verification_kind"]
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          subject_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          applicant_note?: string | null
          created_at?: string
          document_paths?: string[]
          id?: string
          kind?: Database["public"]["Enums"]["verification_kind"]
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          subject_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_skill: { Args: { p_name: string }; Returns: string }
      admin_complete_enrollment: {
        Args: { p_enrollment_id: string }
        Returns: undefined
      }
      admin_decide_enrollment: {
        Args: { p_approve: boolean; p_enrollment_id: string; p_reason?: string }
        Returns: Database["public"]["Enums"]["enrollment_status"]
      }
      admin_review_job: {
        Args: { p_approve: boolean; p_job_id: string; p_reason?: string }
        Returns: undefined
      }
      admin_review_verification: {
        Args: { p_approve: boolean; p_reason?: string; p_request_id: string }
        Returns: undefined
      }
      apply_to_job: {
        Args: {
          p_answers?: Json
          p_cover_note?: string
          p_cv_id: string
          p_job_id: string
          p_referral_id?: string
        }
        Returns: string
      }
      book_session: {
        Args: {
          p_goal_note?: string
          p_mentor_id: string
          p_session_type: Database["public"]["Enums"]["session_type"]
          p_starts_at: string
        }
        Returns: string
      }
      cancel_enrollment: {
        Args: { p_enrollment_id: string }
        Returns: undefined
      }
      cancel_interview_slot: { Args: { p_slot_id: string }; Returns: undefined }
      cancel_session: {
        Args: { p_reason?: string; p_session_id: string }
        Returns: undefined
      }
      check_rate_limit: {
        Args: { p_action: string; p_max: number; p_window: string }
        Returns: undefined
      }
      close_relocation_request: {
        Args: { p_cancel?: boolean; p_request_id: string }
        Returns: undefined
      }
      complete_onboarding: {
        Args: {
          p_city_id: string
          p_full_name: string
          p_gender: Database["public"]["Enums"]["gender"]
          p_intents: Database["public"]["Enums"]["onboarding_intent"][]
          p_phone?: string
          p_verification_note?: string
        }
        Returns: undefined
      }
      confirm_affiliation: {
        Args: { p_affiliation_id: string; p_confirm?: boolean }
        Returns: undefined
      }
      create_company: {
        Args: {
          p_description?: string
          p_industry?: string
          p_is_community_owned?: boolean
          p_leap_friendly?: boolean
          p_name: string
          p_size?: Database["public"]["Enums"]["company_size"]
          p_verification_note?: string
          p_website?: string
        }
        Returns: string
      }
      delete_listing: { Args: { p_listing_id: string }; Returns: undefined }
      delete_message: { Args: { p_message_id: string }; Returns: undefined }
      enroll_in_program: {
        Args: { p_motivation?: string; p_program_id: string }
        Returns: Database["public"]["Enums"]["enrollment_status"]
      }
      get_flatmate_matches: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          avatar_path: string
          bio: string
          budget_max: number
          budget_min: number
          cleanliness: number
          connection_status: Database["public"]["Enums"]["offer_status"]
          food_habit: Database["public"]["Enums"]["food_habit"]
          full_name: string
          gender: Database["public"]["Enums"]["gender"]
          guests_policy: Database["public"]["Enums"]["guests_policy"]
          move_date: string
          neighbourhood_ids: string[]
          score: number
          sleep_schedule: Database["public"]["Enums"]["sleep_schedule"]
          smokes: boolean
          user_id: string
          work_schedule: Database["public"]["Enums"]["work_schedule"]
        }[]
      }
      get_listing_address: {
        Args: { p_listing_id: string }
        Returns: {
          address_line: string
          landmark: string
          lat: number
          lng: number
        }[]
      }
      get_mentor_slots: {
        Args: { p_from: string; p_mentor_id: string; p_to: string }
        Returns: {
          ends_at: string
          starts_at: string
        }[]
      }
      get_my_conversations: {
        Args: never
        Returns: {
          context_id: string
          context_type: Database["public"]["Enums"]["conversation_context"]
          conversation_id: string
          last_message_at: string
          last_message_body: string
          last_message_has_attachment: boolean
          last_message_sender_id: string
          other_avatar_path: string
          other_name: string
          other_user_id: string
          unread_count: number
        }[]
      }
      has_role: {
        Args: { role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_blocked_between: { Args: { a: string; b: string }; Returns: boolean }
      is_company_member: { Args: { p_company_id: string }; Returns: boolean }
      log_admin_action: {
        Args: {
          p_action: string
          p_details?: Json
          p_target_id?: string
          p_target_table?: string
        }
        Returns: undefined
      }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      offer_help: {
        Args: { p_message?: string; p_request_id: string }
        Returns: string
      }
      pick_interview_slot: { Args: { p_slot_id: string }; Returns: undefined }
      rate_buddy: {
        Args: {
          p_buddy_id: string
          p_comment?: string
          p_rating: number
          p_request_id: string
        }
        Returns: undefined
      }
      recommended_jobs: {
        Args: { p_limit?: number }
        Returns: {
          application_deadline: string
          city_id: string
          city_name: string
          company_id: string
          company_logo_path: string
          company_name: string
          company_slug: string
          currency: string
          experience_level: Database["public"]["Enums"]["experience_level"]
          id: string
          is_community_owned: boolean
          job_type: Database["public"]["Enums"]["job_type"]
          leap_friendly: boolean
          neighbourhood_name: string
          published_at: string
          salary_max: number
          salary_min: number
          score: number
          title: string
          work_mode: Database["public"]["Enums"]["work_mode"]
        }[]
      }
      renew_listing: { Args: { p_listing_id: string }; Returns: undefined }
      request_buddy_verification: {
        Args: { p_note?: string }
        Returns: undefined
      }
      request_company_verification: {
        Args: { p_company_id: string; p_note?: string }
        Returns: undefined
      }
      request_mentor_verification: {
        Args: { p_note?: string }
        Returns: undefined
      }
      respond_contact_request: {
        Args: { p_accept: boolean; p_request_id: string }
        Returns: string
      }
      respond_flatmate_connection: {
        Args: { p_accept: boolean; p_connection_id: string }
        Returns: string
      }
      respond_to_offer: {
        Args: { p_accept: boolean; p_offer_id: string }
        Returns: string
      }
      respond_to_session: {
        Args: {
          p_accept: boolean
          p_meeting_url?: string
          p_reason?: string
          p_session_id: string
        }
        Returns: undefined
      }
      save_listing_address: {
        Args: {
          p_address_line: string
          p_landmark: string
          p_lat: number
          p_listing_id: string
          p_lng: number
        }
        Returns: undefined
      }
      search_flats: {
        Args: {
          p_city_id?: string
          p_furnishing?: Database["public"]["Enums"]["furnishing"]
          p_limit?: number
          p_listing_types?: Database["public"]["Enums"]["listing_type"][]
          p_neighbourhood_id?: string
          p_offset?: number
          p_rent_max?: number
          p_rent_min?: number
        }
        Returns: {
          approx_lat: number
          approx_lng: number
          available_from: string
          bathrooms: number
          bedrooms: number
          city_id: string
          cover_photo_path: string
          created_at: string
          currency: string
          deposit: number
          food_pref: Database["public"]["Enums"]["food_pref"]
          furnishing: Database["public"]["Enums"]["furnishing"]
          id: string
          lister_id: string
          listing_type: Database["public"]["Enums"]["listing_type"]
          neighbourhood_id: string
          rent: number
          tenant_gender_pref: Database["public"]["Enums"]["tenant_gender_pref"]
          title: string
          total_count: number
        }[]
      }
      search_jobs: {
        Args: {
          p_city_id?: string
          p_job_types?: Database["public"]["Enums"]["job_type"][]
          p_lat?: number
          p_leap_friendly?: boolean
          p_levels?: Database["public"]["Enums"]["experience_level"][]
          p_limit?: number
          p_lng?: number
          p_offset?: number
          p_posted_within_days?: number
          p_q?: string
          p_radius_km?: number
          p_salary_min?: number
          p_work_modes?: Database["public"]["Enums"]["work_mode"][]
        }
        Returns: {
          application_deadline: string
          city_id: string
          city_name: string
          company_id: string
          company_logo_path: string
          company_name: string
          company_slug: string
          currency: string
          distance_km: number
          experience_level: Database["public"]["Enums"]["experience_level"]
          id: string
          is_community_owned: boolean
          job_type: Database["public"]["Enums"]["job_type"]
          leap_friendly: boolean
          neighbourhood_name: string
          published_at: string
          salary_max: number
          salary_min: number
          title: string
          total_count: number
          work_mode: Database["public"]["Enums"]["work_mode"]
        }[]
      }
      send_contact_request: {
        Args: { p_intro: string; p_listing_id: string }
        Returns: string
      }
      send_flatmate_connection: {
        Args: { p_message?: string; p_recipient_id: string }
        Returns: string
      }
      set_application_status: {
        Args: {
          p_application_id: string
          p_note?: string
          p_status: Database["public"]["Enums"]["application_status"]
        }
        Returns: undefined
      }
      set_listing_status: {
        Args: {
          p_listing_id: string
          p_status: Database["public"]["Enums"]["listing_status"]
        }
        Returns: undefined
      }
      submit_session_feedback: {
        Args: {
          p_comment?: string
          p_next_steps?: string
          p_rating?: number
          p_session_id: string
        }
        Returns: undefined
      }
      withdraw_application: {
        Args: { p_application_id: string }
        Returns: undefined
      }
      withdraw_contact_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      withdraw_flatmate_connection: {
        Args: { p_connection_id: string }
        Returns: undefined
      }
      withdraw_offer: { Args: { p_offer_id: string }; Returns: undefined }
    }
    Enums: {
      alert_frequency: "none" | "daily"
      app_role:
        | "job_seeker"
        | "employer"
        | "mentor"
        | "buddy"
        | "flat_lister"
        | "admin"
      application_status:
        | "applied"
        | "shortlisted"
        | "interview"
        | "offer"
        | "hired"
        | "rejected"
        | "withdrawn"
      availability_exception_kind: "unavailable" | "extra"
      company_member_role: "owner" | "recruiter"
      company_size: "s1_10" | "s11_50" | "s51_200" | "s201_1000" | "s1000_plus"
      conversation_context:
        | "relocation_offer"
        | "flat_contact"
        | "flatmate_connection"
      enrollment_status:
        | "pending"
        | "enrolled"
        | "waitlisted"
        | "rejected"
        | "cancelled"
        | "completed"
      experience_level: "entry" | "mid" | "senior" | "lead"
      flatmate_gender_pref: "any" | "male" | "female"
      food_habit: "veg" | "non_veg" | "halal_only"
      food_pref: "veg_only" | "non_veg_ok" | "halal_only"
      furnishing: "unfurnished" | "semi" | "full"
      gender: "male" | "female"
      guests_policy: "no_guests" | "occasionally" | "often"
      household_type: "alone" | "family" | "with_flatmates"
      interview_slot_status: "proposed" | "selected" | "cancelled"
      job_status:
        | "draft"
        | "pending_review"
        | "published"
        | "closed"
        | "expired"
      job_type: "full_time" | "part_time" | "contract" | "internship"
      leap_program_status:
        | "draft"
        | "open"
        | "closed"
        | "completed"
        | "cancelled"
      leap_program_type:
        | "workshop"
        | "training_course"
        | "internship"
        | "cohort"
      listing_status: "active" | "paused" | "rented" | "expired"
      listing_type: "entire_flat" | "private_room" | "shared_room" | "pg_hostel"
      offer_status: "pending" | "accepted" | "declined" | "withdrawn"
      onboarding_intent:
        | "find_job"
        | "hire"
        | "mentor"
        | "relocate"
        | "help_newcomers"
        | "list_flat"
      program_mode: "online" | "in_person"
      relocation_need:
        | "flat"
        | "flatmate"
        | "area_guidance"
        | "nearby_masjid"
        | "halal_food"
        | "pickup"
        | "temporary_stay"
        | "general_advice"
      report_reason:
        | "spam"
        | "harassment"
        | "inappropriate"
        | "fraud"
        | "fake_profile"
        | "safety"
        | "other"
      report_status: "open" | "dismissed" | "actioned"
      report_target_type:
        | "user"
        | "company"
        | "job"
        | "flat_listing"
        | "relocation_request"
        | "review"
        | "area_tip"
        | "message"
        | "place_suggestion"
      request_status: "open" | "closed" | "cancelled"
      session_side: "mentee" | "mentor"
      session_status:
        | "requested"
        | "confirmed"
        | "declined"
        | "cancelled"
        | "completed"
      session_type:
        | "career_guidance"
        | "cv_review"
        | "mock_interview"
        | "skill_roadmap"
        | "industry_qa"
      sleep_schedule: "early_bird" | "night_owl" | "flexible"
      tenant_gender_pref: "any" | "male" | "female" | "family"
      verification_kind: "company" | "mentor" | "buddy" | "flat_lister_id"
      verification_status: "pending" | "approved" | "rejected"
      work_mode: "onsite" | "hybrid" | "remote"
      work_schedule:
        | "day_shift"
        | "night_shift"
        | "work_from_home"
        | "student"
        | "flexible"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      alert_frequency: ["none", "daily"],
      app_role: [
        "job_seeker",
        "employer",
        "mentor",
        "buddy",
        "flat_lister",
        "admin",
      ],
      application_status: [
        "applied",
        "shortlisted",
        "interview",
        "offer",
        "hired",
        "rejected",
        "withdrawn",
      ],
      availability_exception_kind: ["unavailable", "extra"],
      company_member_role: ["owner", "recruiter"],
      company_size: ["s1_10", "s11_50", "s51_200", "s201_1000", "s1000_plus"],
      conversation_context: [
        "relocation_offer",
        "flat_contact",
        "flatmate_connection",
      ],
      enrollment_status: [
        "pending",
        "enrolled",
        "waitlisted",
        "rejected",
        "cancelled",
        "completed",
      ],
      experience_level: ["entry", "mid", "senior", "lead"],
      flatmate_gender_pref: ["any", "male", "female"],
      food_habit: ["veg", "non_veg", "halal_only"],
      food_pref: ["veg_only", "non_veg_ok", "halal_only"],
      furnishing: ["unfurnished", "semi", "full"],
      gender: ["male", "female"],
      guests_policy: ["no_guests", "occasionally", "often"],
      household_type: ["alone", "family", "with_flatmates"],
      interview_slot_status: ["proposed", "selected", "cancelled"],
      job_status: ["draft", "pending_review", "published", "closed", "expired"],
      job_type: ["full_time", "part_time", "contract", "internship"],
      leap_program_status: [
        "draft",
        "open",
        "closed",
        "completed",
        "cancelled",
      ],
      leap_program_type: [
        "workshop",
        "training_course",
        "internship",
        "cohort",
      ],
      listing_status: ["active", "paused", "rented", "expired"],
      listing_type: ["entire_flat", "private_room", "shared_room", "pg_hostel"],
      offer_status: ["pending", "accepted", "declined", "withdrawn"],
      onboarding_intent: [
        "find_job",
        "hire",
        "mentor",
        "relocate",
        "help_newcomers",
        "list_flat",
      ],
      program_mode: ["online", "in_person"],
      relocation_need: [
        "flat",
        "flatmate",
        "area_guidance",
        "nearby_masjid",
        "halal_food",
        "pickup",
        "temporary_stay",
        "general_advice",
      ],
      report_reason: [
        "spam",
        "harassment",
        "inappropriate",
        "fraud",
        "fake_profile",
        "safety",
        "other",
      ],
      report_status: ["open", "dismissed", "actioned"],
      report_target_type: [
        "user",
        "company",
        "job",
        "flat_listing",
        "relocation_request",
        "review",
        "area_tip",
        "message",
        "place_suggestion",
      ],
      request_status: ["open", "closed", "cancelled"],
      session_side: ["mentee", "mentor"],
      session_status: [
        "requested",
        "confirmed",
        "declined",
        "cancelled",
        "completed",
      ],
      session_type: [
        "career_guidance",
        "cv_review",
        "mock_interview",
        "skill_roadmap",
        "industry_qa",
      ],
      sleep_schedule: ["early_bird", "night_owl", "flexible"],
      tenant_gender_pref: ["any", "male", "female", "family"],
      verification_kind: ["company", "mentor", "buddy", "flat_lister_id"],
      verification_status: ["pending", "approved", "rejected"],
      work_mode: ["onsite", "hybrid", "remote"],
      work_schedule: [
        "day_shift",
        "night_shift",
        "work_from_home",
        "student",
        "flexible",
      ],
    },
  },
} as const
