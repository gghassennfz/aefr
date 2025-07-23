// Generated TypeScript types for Supabase database schema
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          role: 'user' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role?: 'user' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'user' | 'admin'
          created_at?: string
          updated_at?: string
        }
      }
      businesses: {
        Row: {
          id: string
          user_id: string
          company_name: string
          siret: string | null
          siren: string | null
          legal_form: string | null
          activity_code: string | null
          address: string | null
          postal_code: string | null
          city: string | null
          phone: string | null
          website: string | null
          logo_url: string | null
          vat_number: string | null
          vat_rate: number
          social_security_number: string | null
          urssaf_number: string | null
          auto_entrepreneur_regime: boolean
          quarterly_declaration: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_name: string
          siret?: string | null
          siren?: string | null
          legal_form?: string | null
          activity_code?: string | null
          address?: string | null
          postal_code?: string | null
          city?: string | null
          phone?: string | null
          website?: string | null
          logo_url?: string | null
          vat_number?: string | null
          vat_rate?: number
          social_security_number?: string | null
          urssaf_number?: string | null
          auto_entrepreneur_regime?: boolean
          quarterly_declaration?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_name?: string
          siret?: string | null
          siren?: string | null
          legal_form?: string | null
          activity_code?: string | null
          address?: string | null
          postal_code?: string | null
          city?: string | null
          phone?: string | null
          website?: string | null
          logo_url?: string | null
          vat_number?: string | null
          vat_rate?: number
          social_security_number?: string | null
          urssaf_number?: string | null
          auto_entrepreneur_regime?: boolean
          quarterly_declaration?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          user_id: string
          company_name: string | null
          first_name: string | null
          last_name: string | null
          email: string | null
          phone: string | null
          address: string | null
          postal_code: string | null
          city: string | null
          country: string | null
          siret: string | null
          vat_number: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_name?: string | null
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          postal_code?: string | null
          city?: string | null
          country?: string | null
          siret?: string | null
          vat_number?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_name?: string | null
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          postal_code?: string | null
          city?: string | null
          country?: string | null
          siret?: string | null
          vat_number?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          user_id: string
          client_id: string | null
          quote_id: string | null
          invoice_number: string
          title: string | null
          description: string | null
          issue_date: string
          due_date: string | null
          subtotal: number
          vat_amount: number
          total_amount: number
          paid_amount: number
          status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          payment_method: string | null
          payment_date: string | null
          notes: string | null
          terms_conditions: string | null
          pdf_url: string | null
          sent_at: string | null
          last_reminder_sent: string | null
          reminder_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_id?: string | null
          quote_id?: string | null
          invoice_number: string
          title?: string | null
          description?: string | null
          issue_date: string
          due_date?: string | null
          subtotal?: number
          vat_amount?: number
          total_amount?: number
          paid_amount?: number
          status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          payment_method?: string | null
          payment_date?: string | null
          notes?: string | null
          terms_conditions?: string | null
          pdf_url?: string | null
          sent_at?: string | null
          last_reminder_sent?: string | null
          reminder_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          client_id?: string | null
          quote_id?: string | null
          invoice_number?: string
          title?: string | null
          description?: string | null
          issue_date?: string
          due_date?: string | null
          subtotal?: number
          vat_amount?: number
          total_amount?: number
          paid_amount?: number
          status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          payment_method?: string | null
          payment_date?: string | null
          notes?: string | null
          terms_conditions?: string | null
          pdf_url?: string | null
          sent_at?: string | null
          last_reminder_sent?: string | null
          reminder_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          invoice_id: string | null
          type: 'income' | 'expense'
          category: string
          subcategory: string | null
          description: string
          amount: number
          vat_amount: number
          date: string
          payment_method: string | null
          receipt_url: string | null
          notes: string | null
          is_deductible: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          invoice_id?: string | null
          type: 'income' | 'expense'
          category: string
          subcategory?: string | null
          description: string
          amount: number
          vat_amount?: number
          date: string
          payment_method?: string | null
          receipt_url?: string | null
          notes?: string | null
          is_deductible?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          invoice_id?: string | null
          type?: 'income' | 'expense'
          category?: string
          subcategory?: string | null
          description?: string
          amount?: number
          vat_amount?: number
          date?: string
          payment_method?: string | null
          receipt_url?: string | null
          notes?: string | null
          is_deductible?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_subscription_id: string
          stripe_customer_id: string
          plan_name: string
          plan_price: number
          billing_cycle: string
          status: 'active' | 'cancelled' | 'past_due' | 'unpaid'
          current_period_start: string | null
          current_period_end: string | null
          cancelled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_subscription_id: string
          stripe_customer_id: string
          plan_name: string
          plan_price: number
          billing_cycle: string
          status: 'active' | 'cancelled' | 'past_due' | 'unpaid'
          current_period_start?: string | null
          current_period_end?: string | null
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_subscription_id?: string
          stripe_customer_id?: string
          plan_name?: string
          plan_price?: number
          billing_cycle?: string
          status?: 'active' | 'cancelled' | 'past_due' | 'unpaid'
          current_period_start?: string | null
          current_period_end?: string | null
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      invoice_status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
      quote_status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
      transaction_type: 'income' | 'expense'
      subscription_status: 'active' | 'cancelled' | 'past_due' | 'unpaid'
      user_role: 'user' | 'admin'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
