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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      buyer_preferences: {
        Row: {
          activity_duration: string | null
          address: string | null
          alerts_consent: boolean | null
          annual_revenue: string | null
          billing_address_line2: string | null
          budget: string | null
          categories: string[] | null
          city: string | null
          country: string | null
          created_at: string
          delivery_address: string | null
          delivery_countries: string[] | null
          genders: string[] | null
          id: string
          info_certified: boolean | null
          marketing_consent: boolean | null
          perfect_lot: string | null
          pieces_per_lot: string | null
          postal_code: string | null
          price_per_piece: string | null
          referral_source: string | null
          revenue: string | null
          revenue_document_url: string | null
          same_shipping_address: boolean | null
          searched_brands: string | null
          shipping_address_line1: string | null
          shipping_address_line2: string | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_country_for_filter: string | null
          shipping_postal_code: string | null
          store_link: string | null
          store_photos: string[] | null
          store_types: string[] | null
          styles: string[] | null
          terms_accepted: boolean | null
          updated_at: string
          user_id: string
          vat_code: string | null
        }
        Insert: {
          activity_duration?: string | null
          address?: string | null
          alerts_consent?: boolean | null
          annual_revenue?: string | null
          billing_address_line2?: string | null
          budget?: string | null
          categories?: string[] | null
          city?: string | null
          country?: string | null
          created_at?: string
          delivery_address?: string | null
          delivery_countries?: string[] | null
          genders?: string[] | null
          id?: string
          info_certified?: boolean | null
          marketing_consent?: boolean | null
          perfect_lot?: string | null
          pieces_per_lot?: string | null
          postal_code?: string | null
          price_per_piece?: string | null
          referral_source?: string | null
          revenue?: string | null
          revenue_document_url?: string | null
          same_shipping_address?: boolean | null
          searched_brands?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_country_for_filter?: string | null
          shipping_postal_code?: string | null
          store_link?: string | null
          store_photos?: string[] | null
          store_types?: string[] | null
          styles?: string[] | null
          terms_accepted?: boolean | null
          updated_at?: string
          user_id: string
          vat_code?: string | null
        }
        Update: {
          activity_duration?: string | null
          address?: string | null
          alerts_consent?: boolean | null
          annual_revenue?: string | null
          billing_address_line2?: string | null
          budget?: string | null
          categories?: string[] | null
          city?: string | null
          country?: string | null
          created_at?: string
          delivery_address?: string | null
          delivery_countries?: string[] | null
          genders?: string[] | null
          id?: string
          info_certified?: boolean | null
          marketing_consent?: boolean | null
          perfect_lot?: string | null
          pieces_per_lot?: string | null
          postal_code?: string | null
          price_per_piece?: string | null
          referral_source?: string | null
          revenue?: string | null
          revenue_document_url?: string | null
          same_shipping_address?: boolean | null
          searched_brands?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_country_for_filter?: string | null
          shipping_postal_code?: string | null
          store_link?: string | null
          store_photos?: string[] | null
          store_types?: string[] | null
          styles?: string[] | null
          terms_accepted?: boolean | null
          updated_at?: string
          user_id?: string
          vat_code?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          lot_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lot_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lot_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          buyer_id: string
          details: string | null
          evidence_urls: string[] | null
          id: string
          opened_at: string
          order_id: string
          reason: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          seller_id: string
          status: string
        }
        Insert: {
          buyer_id: string
          details?: string | null
          evidence_urls?: string[] | null
          id?: string
          opened_at?: string
          order_id: string
          reason: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          seller_id: string
          status?: string
        }
        Update: {
          buyer_id?: string
          details?: string | null
          evidence_urls?: string[] | null
          id?: string
          opened_at?: string
          order_id?: string
          reason?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          seller_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          lot_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lot_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lot_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lot_items: {
        Row: {
          brand: string | null
          category: string | null
          gender: string | null
          id: string
          image_url: string | null
          lot_id: string
          name: string
          quantity: number
          reference: string | null
          retail_price: number | null
          size: string | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          gender?: string | null
          id?: string
          image_url?: string | null
          lot_id: string
          name: string
          quantity?: number
          reference?: string | null
          retail_price?: number | null
          size?: string | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          gender?: string | null
          id?: string
          image_url?: string | null
          lot_id?: string
          name?: string
          quantity?: number
          reference?: string | null
          retail_price?: number | null
          size?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lot_items_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      lots: {
        Row: {
          brand: string
          category: string | null
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          images: string[] | null
          location: string | null
          pallets: number
          price: number
          rating: number | null
          seller_id: string
          status: Database["public"]["Enums"]["lot_status"]
          title: string
          units: number
          updated_at: string
        }
        Insert: {
          brand?: string
          category?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          images?: string[] | null
          location?: string | null
          pallets?: number
          price?: number
          rating?: number | null
          seller_id: string
          status?: Database["public"]["Enums"]["lot_status"]
          title: string
          units?: number
          updated_at?: string
        }
        Update: {
          brand?: string
          category?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          images?: string[] | null
          location?: string | null
          pallets?: number
          price?: number
          rating?: number | null
          seller_id?: string
          status?: Database["public"]["Enums"]["lot_status"]
          title?: string
          units?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lots_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          lot_id: string | null
          read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          lot_id?: string | null
          read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lot_id?: string | null
          read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      orders: {
        Row: {
          amount: number
          buyer_id: string
          commission: number
          confirmed_at: string | null
          created_at: string
          delivered_at: string | null
          id: string
          lot_id: string
          seller_id: string
          shipped_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          buyer_id: string
          commission?: number
          confirmed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          lot_id: string
          seller_id: string
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          commission?: number
          confirmed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          lot_id?: string
          seller_id?: string
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_description: string | null
          company_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          siret: string | null
          stripe_account_id: string | null
          updated_at: string
          user_id: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          company_description?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          siret?: string | null
          stripe_account_id?: string | null
          updated_at?: string
          user_id: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          company_description?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          siret?: string | null
          stripe_account_id?: string | null
          updated_at?: string
          user_id?: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: []
      }
      reviews: {
        Row: {
          buyer_id: string
          comment: string | null
          created_at: string
          id: string
          lot_id: string
          order_id: string
          rating: number
          seller_id: string
        }
        Insert: {
          buyer_id: string
          comment?: string | null
          created_at?: string
          id?: string
          lot_id: string
          order_id: string
          rating: number
          seller_id: string
        }
        Update: {
          buyer_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          lot_id?: string
          order_id?: string
          rating?: number
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_preferences: {
        Row: {
          address: string | null
          approval_status: string
          approved_at: string | null
          auth_document_url: string | null
          avg_retail_price: string | null
          billing_address_line1: string | null
          billing_address_line2: string | null
          billing_city: string | null
          billing_country: string | null
          billing_postal_code: string | null
          brands_text: string | null
          business_type: string | null
          buyer_budget: string | null
          buyer_categories: string[] | null
          buyer_geography: string | null
          buyer_min_revenue: string | null
          buyer_types: string[] | null
          categories: string[] | null
          city: string | null
          client_types: string[] | null
          company_document_url: string | null
          consent: boolean | null
          country: string | null
          created_at: string
          description: string | null
          id: string
          lot_size: string | null
          min_order_size: string | null
          monthly_volume: string | null
          pickup_address_line1: string | null
          pickup_address_line2: string | null
          pickup_city: string | null
          pickup_country: string | null
          pickup_postal_code: string | null
          postal_code: string | null
          referral_source: string | null
          rejection_reason: string | null
          same_pickup_address: boolean | null
          seller_certified: boolean | null
          sells_unbranded: string | null
          target_countries: string[] | null
          target_market: string | null
          terms_accepted: boolean | null
          updated_at: string
          user_id: string
          validated_at: string | null
          validated_by: string | null
          validation_note: string | null
          validation_status: string | null
          vat_code: string | null
          visibility_mode: string | null
          warehouse_location: string | null
          website: string | null
          years_in_business: string | null
        }
        Insert: {
          address?: string | null
          approval_status?: string
          approved_at?: string | null
          auth_document_url?: string | null
          avg_retail_price?: string | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_postal_code?: string | null
          brands_text?: string | null
          business_type?: string | null
          buyer_budget?: string | null
          buyer_categories?: string[] | null
          buyer_geography?: string | null
          buyer_min_revenue?: string | null
          buyer_types?: string[] | null
          categories?: string[] | null
          city?: string | null
          client_types?: string[] | null
          company_document_url?: string | null
          consent?: boolean | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lot_size?: string | null
          min_order_size?: string | null
          monthly_volume?: string | null
          pickup_address_line1?: string | null
          pickup_address_line2?: string | null
          pickup_city?: string | null
          pickup_country?: string | null
          pickup_postal_code?: string | null
          postal_code?: string | null
          referral_source?: string | null
          rejection_reason?: string | null
          same_pickup_address?: boolean | null
          seller_certified?: boolean | null
          sells_unbranded?: string | null
          target_countries?: string[] | null
          target_market?: string | null
          terms_accepted?: boolean | null
          updated_at?: string
          user_id: string
          validated_at?: string | null
          validated_by?: string | null
          validation_note?: string | null
          validation_status?: string | null
          vat_code?: string | null
          visibility_mode?: string | null
          warehouse_location?: string | null
          website?: string | null
          years_in_business?: string | null
        }
        Update: {
          address?: string | null
          approval_status?: string
          approved_at?: string | null
          auth_document_url?: string | null
          avg_retail_price?: string | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_postal_code?: string | null
          brands_text?: string | null
          business_type?: string | null
          buyer_budget?: string | null
          buyer_categories?: string[] | null
          buyer_geography?: string | null
          buyer_min_revenue?: string | null
          buyer_types?: string[] | null
          categories?: string[] | null
          city?: string | null
          client_types?: string[] | null
          company_document_url?: string | null
          consent?: boolean | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lot_size?: string | null
          min_order_size?: string | null
          monthly_volume?: string | null
          pickup_address_line1?: string | null
          pickup_address_line2?: string | null
          pickup_city?: string | null
          pickup_country?: string | null
          pickup_postal_code?: string | null
          postal_code?: string | null
          referral_source?: string | null
          rejection_reason?: string | null
          same_pickup_address?: boolean | null
          seller_certified?: boolean | null
          sells_unbranded?: string | null
          target_countries?: string[] | null
          target_market?: string | null
          terms_accepted?: boolean | null
          updated_at?: string
          user_id?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_note?: string | null
          validation_status?: string | null
          vat_code?: string | null
          visibility_mode?: string | null
          warehouse_location?: string | null
          website?: string | null
          years_in_business?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_preferences_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_pallet_coefficients: {
        Row: {
          coefficient: number
          created_at: string
          display_order: number
          id: string
          max_pallets: number
        }
        Insert: {
          coefficient: number
          created_at?: string
          display_order: number
          id?: string
          max_pallets: number
        }
        Update: {
          coefficient?: number
          created_at?: string
          display_order?: number
          id?: string
          max_pallets?: number
        }
        Relationships: []
      }
      shipping_pricing: {
        Row: {
          category: string
          cost_per_pallet: number
          created_at: string
          display_order: number
          id: string
        }
        Insert: {
          category: string
          cost_per_pallet: number
          created_at?: string
          display_order: number
          id?: string
        }
        Update: {
          category?: string
          cost_per_pallet?: number
          created_at?: string
          display_order?: number
          id?: string
        }
        Relationships: []
      }
      shipping_routes: {
        Row: {
          category: string
          created_at: string
          destination_country: string
          distance_km: number
          id: string
          origin_country: string
        }
        Insert: {
          category: string
          created_at?: string
          destination_country: string
          distance_km: number
          id?: string
          origin_country: string
        }
        Update: {
          category?: string
          created_at?: string
          destination_country?: string
          distance_km?: number
          id?: string
          origin_country?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
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
      get_my_full_profile: {
        Args: never
        Returns: {
          company_description: string | null
          company_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          siret: string | null
          stripe_account_id: string | null
          updated_at: string
          user_id: string
          user_type: Database["public"]["Enums"]["user_type"]
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_profile_id: { Args: never; Returns: string }
      get_seller_public_info: {
        Args: { _profile_id: string }
        Returns: {
          company_name: string
          full_name: string
          id: string
        }[]
      }
      get_seller_rating: {
        Args: { seller_profile_id: string }
        Returns: {
          average_rating: number
          review_count: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_seller: { Args: never; Returns: boolean }
      is_seller_approved: { Args: never; Returns: boolean }
      is_seller_of_lot: { Args: { _lot_id: string }; Returns: boolean }
      is_vip_buyer: { Args: never; Returns: boolean }
      is_vip_seller: { Args: never; Returns: boolean }
    }
    Enums: {
      lot_status: "active" | "draft" | "sold"
      order_status:
        | "pending_payment"
        | "paid"
        | "preparing"
        | "shipped"
        | "delivered"
        | "confirmed"
        | "disputed"
        | "refunded"
        | "cancelled"
      subscription_status: "active" | "cancelled" | "past_due" | "trialing"
      user_type: "buyer" | "seller" | "both" | "admin"
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
      lot_status: ["active", "draft", "sold"],
      order_status: [
        "pending_payment",
        "paid",
        "preparing",
        "shipped",
        "delivered",
        "confirmed",
        "disputed",
        "refunded",
        "cancelled",
      ],
      subscription_status: ["active", "cancelled", "past_due", "trialing"],
      user_type: ["buyer", "seller", "both", "admin"],
    },
  },
} as const
