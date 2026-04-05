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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bank_details: {
        Row: {
          account_number: string | null
          bank_name: string
          bik: string | null
          card_number: string | null
          created_at: string
          detail_type: string
          id: string
          is_default: boolean
          label: string
          phone: string | null
          qr_image_url: string | null
          recipient_display_name: string | null
          transfer_link: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number?: string | null
          bank_name?: string
          bik?: string | null
          card_number?: string | null
          created_at?: string
          detail_type?: string
          id?: string
          is_default?: boolean
          label?: string
          phone?: string | null
          qr_image_url?: string | null
          recipient_display_name?: string | null
          transfer_link?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string | null
          bank_name?: string
          bik?: string | null
          card_number?: string | null
          created_at?: string
          detail_type?: string
          id?: string
          is_default?: boolean
          label?: string
          phone?: string | null
          qr_image_url?: string | null
          recipient_display_name?: string | null
          transfer_link?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      edo_regulation_acceptances: {
        Row: {
          accepted_at: string
          id: string
          ip_address: string | null
          regulation_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          ip_address?: string | null
          regulation_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          id?: string
          ip_address?: string | null
          regulation_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "edo_regulation_acceptances_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "edo_regulations"
            referencedColumns: ["id"]
          },
        ]
      }
      edo_regulations: {
        Row: {
          content_hash: string | null
          created_at: string
          effective_from: string
          id: string
          is_current: boolean
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          content_hash?: string | null
          created_at?: string
          effective_from?: string
          id?: string
          is_current?: boolean
          title?: string
          updated_at?: string
          version: string
        }
        Update: {
          content_hash?: string | null
          created_at?: string
          effective_from?: string
          id?: string
          is_current?: boolean
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      generated_documents: {
        Row: {
          created_at: string
          created_by: string
          document_type: string
          file_url: string | null
          id: string
          loan_id: string
          render_data_snapshot: Json
          source_entity_id: string | null
          template_version: string
        }
        Insert: {
          created_at?: string
          created_by: string
          document_type: string
          file_url?: string | null
          id?: string
          loan_id: string
          render_data_snapshot: Json
          source_entity_id?: string | null
          template_version?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          document_type?: string
          file_url?: string | null
          id?: string
          loan_id?: string
          render_data_snapshot?: Json
          source_entity_id?: string | null
          template_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_allowed_bank_details: {
        Row: {
          bank_detail_id: string
          created_at: string
          id: string
          loan_id: string
          party_role: string
          purpose: string
        }
        Insert: {
          bank_detail_id: string
          created_at?: string
          id?: string
          loan_id: string
          party_role: string
          purpose?: string
        }
        Update: {
          bank_detail_id?: string
          created_at?: string
          id?: string
          loan_id?: string
          party_role?: string
          purpose?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_allowed_bank_details_bank_detail_id_fkey"
            columns: ["bank_detail_id"]
            isOneToOne: false
            referencedRelation: "bank_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_allowed_bank_details_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_payments: {
        Row: {
          bank_name: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          loan_id: string
          payer_id: string
          payment_reference: string | null
          schedule_item_id: string | null
          screenshot_url: string | null
          status: string
          transaction_id: string | null
          transfer_amount: number
          transfer_date: string
          transfer_method: string
        }
        Insert: {
          bank_name?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          loan_id: string
          payer_id: string
          payment_reference?: string | null
          schedule_item_id?: string | null
          screenshot_url?: string | null
          status?: string
          transaction_id?: string | null
          transfer_amount: number
          transfer_date?: string
          transfer_method: string
        }
        Update: {
          bank_name?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          loan_id?: string
          payer_id?: string
          payment_reference?: string | null
          schedule_item_id?: string | null
          screenshot_url?: string | null
          status?: string
          transaction_id?: string | null
          transfer_amount?: number
          transfer_date?: string
          transfer_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_payments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_payments_schedule_item_id_fkey"
            columns: ["schedule_item_id"]
            isOneToOne: false
            referencedRelation: "payment_schedule_items"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_signatures: {
        Row: {
          id: string
          loan_id: string
          role: string
          signature_data: string
          signed_at: string
          signer_id: string
          signer_ip: string | null
        }
        Insert: {
          id?: string
          loan_id: string
          role: string
          signature_data: string
          signed_at?: string
          signer_id: string
          signer_ip?: string | null
        }
        Update: {
          id?: string
          loan_id?: string
          role?: string
          signature_data?: string
          signed_at?: string
          signer_id?: string
          signer_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loan_signatures_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_tranches: {
        Row: {
          actual_date: string | null
          actual_time: string | null
          amount: number
          bank_document_date: string | null
          bank_document_id: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string
          currency: string
          id: string
          loan_id: string
          method: string
          notes: string | null
          planned_date: string
          receiver_account_display: string | null
          receiver_bank_detail_id: string | null
          reference_text: string | null
          sender_account_display: string | null
          sender_bank_detail_id: string | null
          status: string
          timezone: string | null
          tranche_number: number
          transfer_source: string | null
        }
        Insert: {
          actual_date?: string | null
          actual_time?: string | null
          amount: number
          bank_document_date?: string | null
          bank_document_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by: string
          currency?: string
          id?: string
          loan_id: string
          method?: string
          notes?: string | null
          planned_date: string
          receiver_account_display?: string | null
          receiver_bank_detail_id?: string | null
          reference_text?: string | null
          sender_account_display?: string | null
          sender_bank_detail_id?: string | null
          status?: string
          timezone?: string | null
          tranche_number: number
          transfer_source?: string | null
        }
        Update: {
          actual_date?: string | null
          actual_time?: string | null
          amount?: number
          bank_document_date?: string | null
          bank_document_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          id?: string
          loan_id?: string
          method?: string
          notes?: string | null
          planned_date?: string
          receiver_account_display?: string | null
          receiver_bank_detail_id?: string | null
          reference_text?: string | null
          sender_account_display?: string | null
          sender_bank_detail_id?: string | null
          status?: string
          timezone?: string | null
          tranche_number?: number
          transfer_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loan_tranches_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_tranches_receiver_bank_detail_id_fkey"
            columns: ["receiver_bank_detail_id"]
            isOneToOne: false
            referencedRelation: "bank_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_tranches_sender_bank_detail_id_fkey"
            columns: ["sender_bank_detail_id"]
            isOneToOne: false
            referencedRelation: "bank_details"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          amount: number
          borrower_address: string | null
          borrower_disbursement_receipt_policy: string
          borrower_id: string | null
          borrower_name: string
          borrower_passport: string | null
          city: string
          contract_number: string | null
          created_at: string
          deal_version: number
          disbursement_method: string
          early_repayment_interest_rule: string
          early_repayment_notice_days: number
          id: string
          initiator_role: string
          interest_accrual_start: string
          interest_mode: string
          interest_payment_schedule: string | null
          interest_rate: number
          issue_date: string
          lender_address: string | null
          lender_id: string
          lender_name: string
          lender_passport: string | null
          lender_repayment_receipt_policy: string
          loan_type: string
          notes: string | null
          penalty_rate: number
          repayment_date: string
          repayment_schedule_type: string
          signature_scheme_requested: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          borrower_address?: string | null
          borrower_disbursement_receipt_policy?: string
          borrower_id?: string | null
          borrower_name: string
          borrower_passport?: string | null
          city?: string
          contract_number?: string | null
          created_at?: string
          deal_version?: number
          disbursement_method?: string
          early_repayment_interest_rule?: string
          early_repayment_notice_days?: number
          id?: string
          initiator_role?: string
          interest_accrual_start?: string
          interest_mode?: string
          interest_payment_schedule?: string | null
          interest_rate?: number
          issue_date?: string
          lender_address?: string | null
          lender_id: string
          lender_name: string
          lender_passport?: string | null
          lender_repayment_receipt_policy?: string
          loan_type?: string
          notes?: string | null
          penalty_rate?: number
          repayment_date: string
          repayment_schedule_type?: string
          signature_scheme_requested?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          borrower_address?: string | null
          borrower_disbursement_receipt_policy?: string
          borrower_id?: string | null
          borrower_name?: string
          borrower_passport?: string | null
          city?: string
          contract_number?: string | null
          created_at?: string
          deal_version?: number
          disbursement_method?: string
          early_repayment_interest_rule?: string
          early_repayment_notice_days?: number
          id?: string
          initiator_role?: string
          interest_accrual_start?: string
          interest_mode?: string
          interest_payment_schedule?: string | null
          interest_rate?: number
          issue_date?: string
          lender_address?: string | null
          lender_id?: string
          lender_name?: string
          lender_passport?: string | null
          lender_repayment_receipt_policy?: string
          loan_type?: string
          notes?: string | null
          penalty_rate?: number
          repayment_date?: string
          repayment_schedule_type?: string
          signature_scheme_requested?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          bank_name: string | null
          card_holder: string | null
          card_number: string | null
          created_at: string
          id: string
          is_default: boolean
          label: string
          method_type: string
          phone: string | null
          qr_image_url: string | null
          recipient_display_name: string | null
          transfer_link: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_name?: string | null
          card_holder?: string | null
          card_number?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          method_type: string
          phone?: string | null
          qr_image_url?: string | null
          recipient_display_name?: string | null
          transfer_link?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_name?: string | null
          card_holder?: string | null
          card_number?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          method_type?: string
          phone?: string | null
          qr_image_url?: string | null
          recipient_display_name?: string | null
          transfer_link?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_schedule_items: {
        Row: {
          created_at: string
          due_date: string
          id: string
          interest_amount: number
          item_number: number
          loan_id: string
          principal_amount: number
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date: string
          id?: string
          interest_amount?: number
          item_number: number
          loan_id: string
          principal_amount?: number
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string
          id?: string
          interest_amount?: number
          item_number?: number
          loan_id?: string
          principal_amount?: number
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_schedule_items_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string
          id: string
          passport_division_code: string | null
          passport_issue_date: string | null
          passport_issued_by: string | null
          passport_number: string | null
          passport_series: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          id?: string
          passport_division_code?: string | null
          passport_issue_date?: string | null
          passport_issued_by?: string | null
          passport_number?: string | null
          passport_series?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          id?: string
          passport_division_code?: string | null
          passport_issue_date?: string | null
          passport_issued_by?: string | null
          passport_number?: string | null
          passport_series?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      signature_packages: {
        Row: {
          app6_required: boolean
          app6_status: string
          created_at: string
          id: string
          loan_id: string
          package_status: string
          signature_scheme_effective: string
          signed_no_debt: boolean
          updated_at: string
        }
        Insert: {
          app6_required?: boolean
          app6_status?: string
          created_at?: string
          id?: string
          loan_id: string
          package_status?: string
          signature_scheme_effective?: string
          signed_no_debt?: boolean
          updated_at?: string
        }
        Update: {
          app6_required?: boolean
          app6_status?: string
          created_at?: string
          id?: string
          loan_id?: string
          package_status?: string
          signature_scheme_effective?: string
          signed_no_debt?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "signature_packages_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: true
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      signing_snapshots: {
        Row: {
          created_at: string
          id: string
          loan_id: string
          role: string | null
          signer_id: string | null
          snapshot_data: Json
          snapshot_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          loan_id: string
          role?: string | null
          signer_id?: string | null
          snapshot_data: Json
          snapshot_type: string
        }
        Update: {
          created_at?: string
          id?: string
          loan_id?: string
          role?: string | null
          signer_id?: string | null
          snapshot_data?: Json
          snapshot_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "signing_snapshots_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      unep_agreements: {
        Row: {
          borrower_signed_at: string | null
          completed_at: string | null
          created_at: string
          generated_at: string | null
          id: string
          lender_signed_at: string | null
          loan_id: string
          status: string
          updated_at: string
        }
        Insert: {
          borrower_signed_at?: string | null
          completed_at?: string | null
          created_at?: string
          generated_at?: string | null
          id?: string
          lender_signed_at?: string | null
          loan_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          borrower_signed_at?: string | null
          completed_at?: string | null
          created_at?: string
          generated_at?: string | null
          id?: string
          lender_signed_at?: string | null
          loan_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unep_agreements_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: true
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_user_by_email: {
        Args: { lookup_email: string }
        Returns: {
          full_name: string
          user_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
