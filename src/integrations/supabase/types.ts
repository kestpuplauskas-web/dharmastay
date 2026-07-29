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
      bookings: {
        Row: {
          bic: string | null
          booking_number: string
          check_in_time: string
          check_out_time: string
          created_at: string
          customer_address: string
          customer_email: string
          customer_id_code: string
          customer_name: string
          customer_phone: string
          date_from: string
          date_to: string
          expires_at: string | null
          extras: Json
          extras_total: number
          guests: number
          id: string
          location: string
          note: string | null
          payment_amount: number
          payment_option: string
          payment_paid_at: string | null
          payment_provider: string | null
          payment_reference: string | null
          payment_status: string
          property_id: string
          source: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          bic?: string | null
          booking_number: string
          check_in_time?: string
          check_out_time?: string
          created_at?: string
          customer_address?: string
          customer_email?: string
          customer_id_code?: string
          customer_name?: string
          customer_phone?: string
          date_from: string
          date_to: string
          expires_at?: string | null
          extras?: Json
          extras_total?: number
          guests?: number
          id?: string
          location?: string
          note?: string | null
          payment_amount?: number
          payment_option?: string
          payment_paid_at?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: string
          property_id: string
          source?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          bic?: string | null
          booking_number?: string
          check_in_time?: string
          check_out_time?: string
          created_at?: string
          customer_address?: string
          customer_email?: string
          customer_id_code?: string
          customer_name?: string
          customer_phone?: string
          date_from?: string
          date_to?: string
          expires_at?: string | null
          extras?: Json
          extras_total?: number
          guests?: number
          id?: string
          location?: string
          note?: string | null
          payment_amount?: number
          payment_option?: string
          payment_paid_at?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: string
          property_id?: string
          source?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          kind: string
          language: string
          name: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          language: string
          name: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          language?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          expense_date: string
          id: string
          mileage_km: number | null
          note: string
          property_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          mileage_km?: number | null
          note?: string
          property_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          mileage_km?: number | null
          note?: string
          property_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      page_views: {
        Row: {
          country: string
          created_at: string
          id: string
          path: string
          referrer: string
          session_id: string
          user_agent: string
        }
        Insert: {
          country?: string
          created_at?: string
          id?: string
          path?: string
          referrer?: string
          session_id?: string
          user_agent?: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          path?: string
          referrer?: string
          session_id?: string
          user_agent?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          bic: string | null
          booking_id: string
          created_at: string
          currency: string
          id: string
          mac_valid: boolean | null
          provider: string
          provider_transaction_id: string | null
          raw_request: Json | null
          raw_response: Json | null
          service_code: string | null
          stamp: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          bic?: string | null
          booking_id: string
          created_at?: string
          currency?: string
          id?: string
          mac_valid?: boolean | null
          provider?: string
          provider_transaction_id?: string | null
          raw_request?: Json | null
          raw_response?: Json | null
          service_code?: string | null
          stamp: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bic?: string | null
          booking_id?: string
          created_at?: string
          currency?: string
          id?: string
          mac_valid?: boolean | null
          provider?: string
          provider_transaction_id?: string | null
          raw_request?: Json | null
          raw_response?: Json | null
          service_code?: string | null
          stamp?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          amenities: Json
          area_m2: number | null
          beds: number
          category: string
          city: string
          country: string
          cover_image_url: string
          created_at: string
          description: string
          extra_services: Json
          features: Json
          id: string
          image_urls: Json
          is_active: boolean
          lat: number | null
          lng: number | null
          max_guests: number
          name: string
          price_per_night: number
          price_tiers: Json
          property_type: string
          rooms: Json
          sort_order: number
          status: string
          updated_at: string
          year: number
        }
        Insert: {
          address?: string
          amenities?: Json
          area_m2?: number | null
          beds?: number
          category: string
          city?: string
          country?: string
          cover_image_url?: string
          created_at?: string
          description?: string
          extra_services?: Json
          features?: Json
          id?: string
          image_urls?: Json
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          max_guests?: number
          name: string
          price_per_night: number
          price_tiers?: Json
          property_type?: string
          rooms?: Json
          sort_order?: number
          status?: string
          updated_at?: string
          year: number
        }
        Update: {
          address?: string
          amenities?: Json
          area_m2?: number | null
          beds?: number
          category?: string
          city?: string
          country?: string
          cover_image_url?: string
          created_at?: string
          description?: string
          extra_services?: Json
          features?: Json
          id?: string
          image_urls?: Json
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          max_guests?: number
          name?: string
          price_per_night?: number
          price_tiers?: Json
          property_type?: string
          rooms?: Json
          sort_order?: number
          status?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      property_documents: {
        Row: {
          created_at: string
          expires_at: string | null
          file_path: string
          id: string
          kind: string
          mime_type: string
          property_id: string
          size_bytes: number
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          file_path: string
          id?: string
          kind: string
          mime_type?: string
          property_id: string
          size_bytes?: number
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          file_path?: string
          id?: string
          kind?: string
          mime_type?: string
          property_id?: string
          size_bytes?: number
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_events: {
        Row: {
          cost: number | null
          created_at: string
          ended_at: string | null
          id: string
          mileage_km: number | null
          note: string
          property_id: string
          reason: string
          started_at: string
          updated_at: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          ended_at?: string | null
          id?: string
          mileage_km?: number | null
          note?: string
          property_id: string
          reason?: string
          started_at?: string
          updated_at?: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          ended_at?: string | null
          id?: string
          mileage_km?: number | null
          note?: string
          property_id?: string
          reason?: string
          started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_investments: {
        Row: {
          amount: number
          category: string
          created_at: string
          id: string
          mileage_km: number | null
          note: string
          property_id: string
          purchase_date: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          mileage_km?: number | null
          note?: string
          property_id: string
          purchase_date?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          mileage_km?: number | null
          note?: string
          property_id?: string
          purchase_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_investments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_maintenance: {
        Row: {
          created_at: string
          due_date: string | null
          due_mileage_km: number | null
          id: string
          last_done_at: string | null
          note: string
          property_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          due_mileage_km?: number | null
          id?: string
          last_done_at?: string | null
          note?: string
          property_id: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          due_mileage_km?: number | null
          id?: string
          last_done_at?: string | null
          note?: string
          property_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_maintenance_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      signed_contracts: {
        Row: {
          booking_id: string
          contract_content: string
          created_at: string
          customer_email: string
          customer_name: string
          id: string
          pdf_url: string | null
          signature_text: string
          signed_at: string
          template_id: string | null
        }
        Insert: {
          booking_id: string
          contract_content: string
          created_at?: string
          customer_email?: string
          customer_name: string
          id?: string
          pdf_url?: string | null
          signature_text: string
          signed_at?: string
          template_id?: string | null
        }
        Update: {
          booking_id?: string
          contract_content?: string
          created_at?: string
          customer_email?: string
          customer_name?: string
          id?: string
          pdf_url?: string | null
          signature_text?: string
          signed_at?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signed_contracts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signed_contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_expired_pending_bookings: { Args: never; Returns: number }
      get_property_booked_dates: {
        Args: { _property_id: string }
        Returns: {
          date_from: string
          date_to: string
          status: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
