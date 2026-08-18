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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      assembly_group_hardware: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          part_id: string
          quantity_confirmed: number | null
          quantity_required: number
          status: string | null
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          part_id: string
          quantity_confirmed?: number | null
          quantity_required: number
          status?: string | null
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          part_id?: string
          quantity_confirmed?: number | null
          quantity_required?: number
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assembly_group_hardware_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "assembly_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_group_hardware_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      assembly_group_items_log: {
        Row: {
          group_id: string
          id: string
          item_id: string
          item_type: string
          location: string | null
          scanned_at: string | null
          scanned_by: string | null
        }
        Insert: {
          group_id: string
          id?: string
          item_id: string
          item_type: string
          location?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
        }
        Update: {
          group_id?: string
          id?: string
          item_id?: string
          item_type?: string
          location?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assembly_group_items_log_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "assembly_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      assembly_groups: {
        Row: {
          code: string
          color: string | null
          conference_status: string | null
          created_at: string | null
          description: string | null
          exception_authorized_by: string | null
          exception_justification: string | null
          id: string
          is_locked: boolean | null
          loading_status: string | null
          lock_reason: string | null
          module_id: string | null
          name: string | null
          project_id: string
          sealed_at: string | null
          sealed_by: string | null
          separation_status: string | null
          storage_location: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          color?: string | null
          conference_status?: string | null
          created_at?: string | null
          description?: string | null
          exception_authorized_by?: string | null
          exception_justification?: string | null
          id?: string
          is_locked?: boolean | null
          loading_status?: string | null
          lock_reason?: string | null
          module_id?: string | null
          name?: string | null
          project_id: string
          sealed_at?: string | null
          sealed_by?: string | null
          separation_status?: string | null
          storage_location?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          color?: string | null
          conference_status?: string | null
          created_at?: string | null
          description?: string | null
          exception_authorized_by?: string | null
          exception_justification?: string | null
          id?: string
          is_locked?: boolean | null
          loading_status?: string | null
          lock_reason?: string | null
          module_id?: string | null
          name?: string | null
          project_id?: string
          sealed_at?: string | null
          sealed_by?: string | null
          separation_status?: string | null
          storage_location?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assembly_groups_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_groups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_items: {
        Row: {
          budget_id: string
          category: string | null
          confidence: number | null
          id: string
          is_confirmed: boolean | null
          name: string | null
          quantity: number | null
          source: string | null
          total_price: number | null
          unit: string | null
          unit_price: number | null
        }
        Insert: {
          budget_id: string
          category?: string | null
          confidence?: number | null
          id?: string
          is_confirmed?: boolean | null
          name?: string | null
          quantity?: number | null
          source?: string | null
          total_price?: number | null
          unit?: string | null
          unit_price?: number | null
        }
        Update: {
          budget_id?: string
          category?: string | null
          confidence?: number | null
          id?: string
          is_confirmed?: boolean | null
          name?: string | null
          quantity?: number | null
          source?: string | null
          total_price?: number | null
          unit?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          analysis_mode: string | null
          company_id: string
          confidence: number | null
          created_at: string | null
          created_by: string | null
          id: string
          metadata: Json | null
          project_id: string
          raw_ai_response: Json | null
          source_file: string | null
          status: string | null
          total_value: number | null
        }
        Insert: {
          analysis_mode?: string | null
          company_id: string
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          metadata?: Json | null
          project_id: string
          raw_ai_response?: Json | null
          source_file?: string | null
          status?: string | null
          total_value?: number | null
        }
        Update: {
          analysis_mode?: string | null
          company_id?: string
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string
          raw_ai_response?: Json | null
          source_file?: string | null
          status?: string | null
          total_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          document: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_outbox: {
        Row: {
          attachment_path: string | null
          attempt_count: number
          channel: string
          company_id: string
          created_at: string
          created_by: string
          id: string
          last_error: string | null
          message_text: string
          outsourcing_order_id: string | null
          provider_message_id: string | null
          recipient: string
          sent_at: string | null
          status: string
        }
        Insert: {
          attachment_path?: string | null
          attempt_count?: number
          channel: string
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          last_error?: string | null
          message_text: string
          outsourcing_order_id?: string | null
          provider_message_id?: string | null
          recipient: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          attachment_path?: string | null
          attempt_count?: number
          channel?: string
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          last_error?: string | null
          message_text?: string
          outsourcing_order_id?: string | null
          provider_message_id?: string | null
          recipient?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_outbox_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_outbox_outsourcing_order_id_fkey"
            columns: ["outsourcing_order_id"]
            isOneToOne: false
            referencedRelation: "outsourcing_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      cut_plans: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          is_official: boolean | null
          kerf_mm: number | null
          metadata: Json | null
          project_id: string
          sheet_height_mm: number | null
          sheet_width_mm: number | null
          source: string | null
          total_cuts: number | null
          total_pieces: number | null
          total_sheets: number | null
          trim_mm: number | null
          utilization_percent: number | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_official?: boolean | null
          kerf_mm?: number | null
          metadata?: Json | null
          project_id: string
          sheet_height_mm?: number | null
          sheet_width_mm?: number | null
          source?: string | null
          total_cuts?: number | null
          total_pieces?: number | null
          total_sheets?: number | null
          trim_mm?: number | null
          utilization_percent?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_official?: boolean | null
          kerf_mm?: number | null
          metadata?: Json | null
          project_id?: string
          sheet_height_mm?: number | null
          sheet_width_mm?: number | null
          source?: string | null
          total_cuts?: number | null
          total_pieces?: number | null
          total_sheets?: number | null
          trim_mm?: number | null
          utilization_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cut_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cut_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cut_sheets: {
        Row: {
          color: string | null
          cut_plan_id: string
          id: string
          material: string | null
          placements: Json | null
          remainders: Json | null
          sheet_number: number | null
          thickness_mm: number | null
          utilization_percent: number | null
        }
        Insert: {
          color?: string | null
          cut_plan_id: string
          id?: string
          material?: string | null
          placements?: Json | null
          remainders?: Json | null
          sheet_number?: number | null
          thickness_mm?: number | null
          utilization_percent?: number | null
        }
        Update: {
          color?: string | null
          cut_plan_id?: string
          id?: string
          material?: string | null
          placements?: Json | null
          remainders?: Json | null
          sheet_number?: number | null
          thickness_mm?: number | null
          utilization_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cut_sheets_cut_plan_id_fkey"
            columns: ["cut_plan_id"]
            isOneToOne: false
            referencedRelation: "cut_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      engineering_validations: {
        Row: {
          created_at: string | null
          file_id: string | null
          file_type: string
          id: string
          notes: string | null
          part_id: string | null
          project_id: string
          updated_at: string | null
          validation_status: string | null
        }
        Insert: {
          created_at?: string | null
          file_id?: string | null
          file_type: string
          id?: string
          notes?: string | null
          part_id?: string | null
          project_id: string
          updated_at?: string | null
          validation_status?: string | null
        }
        Update: {
          created_at?: string | null
          file_id?: string | null
          file_type?: string
          id?: string
          notes?: string | null
          part_id?: string | null
          project_id?: string
          updated_at?: string | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engineering_validations_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "project_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engineering_validations_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engineering_validations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_books: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          project_id: string
          status: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          project_id: string
          status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string
          status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "executive_books_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_books_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_documents: {
        Row: {
          company_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          document_date: string | null
          document_hash: string
          document_number: string | null
          file_name: string
          id: string
          ocr_confidence: number | null
          ocr_text: string | null
          status: string
          storage_path: string
          supplier_id: string | null
          total_amount: number | null
        }
        Insert: {
          company_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          document_date?: string | null
          document_hash: string
          document_number?: string | null
          file_name: string
          id?: string
          ocr_confidence?: number | null
          ocr_text?: string | null
          status?: string
          storage_path: string
          supplier_id?: string | null
          total_amount?: number | null
        }
        Update: {
          company_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          document_date?: string | null
          document_hash?: string
          document_number?: string | null
          file_name?: string
          id?: string
          ocr_confidence?: number | null
          ocr_text?: string | null
          status?: string
          storage_path?: string
          supplier_id?: string | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_logs: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          material_name: string
          metadata: Json | null
          new_balance: number
          previous_balance: number
          project_id: string | null
          quantity: number
          type: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          material_name: string
          metadata?: Json | null
          new_balance: number
          previous_balance: number
          project_id?: string | null
          quantity: number
          type: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          material_name?: string
          metadata?: Json | null
          new_balance?: number
          previous_balance?: number
          project_id?: string | null
          quantity?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      label_settings: {
        Row: {
          company_id: string
          id: string
          preset: string | null
          project_id: string
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          id?: string
          preset?: string | null
          project_id: string
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          id?: string
          preset?: string | null
          project_id?: string
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "label_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "label_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_history: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          new_status: Database["public"]["Enums"]["maintenance_status"] | null
          notes: string | null
          old_status: Database["public"]["Enums"]["maintenance_status"] | null
          request_id: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          new_status?: Database["public"]["Enums"]["maintenance_status"] | null
          notes?: string | null
          old_status?: Database["public"]["Enums"]["maintenance_status"] | null
          request_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          new_status?: Database["public"]["Enums"]["maintenance_status"] | null
          notes?: string | null
          old_status?: Database["public"]["Enums"]["maintenance_status"] | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          audio_url: string | null
          company_id: string
          created_at: string | null
          created_by: string
          deadline: string | null
          description: string
          id: string
          module_id: string | null
          part_id: string | null
          photos: string[] | null
          project_id: string
          status: Database["public"]["Enums"]["maintenance_status"]
          type: Database["public"]["Enums"]["maintenance_type"]
          urgency: Database["public"]["Enums"]["maintenance_urgency"]
        }
        Insert: {
          audio_url?: string | null
          company_id: string
          created_at?: string | null
          created_by: string
          deadline?: string | null
          description: string
          id?: string
          module_id?: string | null
          part_id?: string | null
          photos?: string[] | null
          project_id: string
          status?: Database["public"]["Enums"]["maintenance_status"]
          type?: Database["public"]["Enums"]["maintenance_type"]
          urgency?: Database["public"]["Enums"]["maintenance_urgency"]
        }
        Update: {
          audio_url?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string
          deadline?: string | null
          description?: string
          id?: string
          module_id?: string | null
          part_id?: string | null
          photos?: string[] | null
          project_id?: string
          status?: Database["public"]["Enums"]["maintenance_status"]
          type?: Database["public"]["Enums"]["maintenance_type"]
          urgency?: Database["public"]["Enums"]["maintenance_urgency"]
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          company_id: string | null
          created_at: string
          data_source: string | null
          depth_mm: number | null
          environment: string | null
          height_mm: number | null
          id: string
          id_xml: string | null
          is_completed: boolean | null
          metadata: Json
          name: string
          project_id: string
          quantity: number
          sequence: number | null
          width_mm: number | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          data_source?: string | null
          depth_mm?: number | null
          environment?: string | null
          height_mm?: number | null
          id?: string
          id_xml?: string | null
          is_completed?: boolean | null
          metadata?: Json
          name: string
          project_id: string
          quantity?: number
          sequence?: number | null
          width_mm?: number | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          data_source?: string | null
          depth_mm?: number | null
          environment?: string | null
          height_mm?: number | null
          id?: string
          id_xml?: string | null
          is_completed?: boolean | null
          metadata?: Json
          name?: string
          project_id?: string
          quantity?: number
          sequence?: number | null
          width_mm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "modules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          project_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          project_id?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          project_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_login_logs: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          operator_code: string | null
          profile_id: string | null
          status: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          operator_code?: string | null
          profile_id?: string | null
          status: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          operator_code?: string | null
          profile_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_login_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_login_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_secrets: {
        Row: {
          created_at: string | null
          profile_id: string
          secret_password: string
        }
        Insert: {
          created_at?: string | null
          profile_id: string
          secret_password: string
        }
        Update: {
          created_at?: string | null
          profile_id?: string
          secret_password?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_secrets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      outsourcing_orders: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          freight_amount: number
          id: string
          message_text: string | null
          order_number: string
          project_id: string | null
          requested_due_date: string | null
          sent_at: string | null
          status: string
          supplier_id: string
          updated_at: string
          xml_file_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          freight_amount?: number
          id?: string
          message_text?: string | null
          order_number: string
          project_id?: string | null
          requested_due_date?: string | null
          sent_at?: string | null
          status?: string
          supplier_id: string
          updated_at?: string
          xml_file_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          freight_amount?: number
          id?: string
          message_text?: string | null
          order_number?: string
          project_id?: string | null
          requested_due_date?: string | null
          sent_at?: string | null
          status?: string
          supplier_id?: string
          updated_at?: string
          xml_file_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outsourcing_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outsourcing_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outsourcing_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outsourcing_orders_xml_file_id_fkey"
            columns: ["xml_file_id"]
            isOneToOne: false
            referencedRelation: "project_files"
            referencedColumns: ["id"]
          },
        ]
      }
      part_drillings: {
        Row: {
          created_at: string | null
          diameter_mm: number
          face: string
          id: string
          is_confirmed: boolean | null
          origin: string | null
          part_id: string
          project_id: string
          updated_at: string | null
          x_mm: number
          y_mm: number
          z_mm: number | null
        }
        Insert: {
          created_at?: string | null
          diameter_mm: number
          face: string
          id?: string
          is_confirmed?: boolean | null
          origin?: string | null
          part_id: string
          project_id: string
          updated_at?: string | null
          x_mm: number
          y_mm: number
          z_mm?: number | null
        }
        Update: {
          created_at?: string | null
          diameter_mm?: number
          face?: string
          id?: string
          is_confirmed?: boolean | null
          origin?: string | null
          part_id?: string
          project_id?: string
          updated_at?: string | null
          x_mm?: number
          y_mm?: number
          z_mm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "part_drillings_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_drillings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          assembly_group_id: string | null
          color: string | null
          company_id: string | null
          created_at: string
          cutting_edge_released: boolean | null
          data_source: string | null
          edge_banding: string | null
          edge_bottom: number | null
          edge_left: number | null
          edge_name_front: string | null
          edge_name_general: string | null
          edge_right: number | null
          edge_top: number | null
          id: string
          id_xml: string | null
          is_completed: boolean | null
          kind: string
          length_mm: number | null
          machining_blocked: boolean | null
          material: string | null
          metadata: Json | null
          module_id: string | null
          module_sequence: number | null
          name: string
          parent_id_xml: string | null
          piece_code: string | null
          piece_sequence: number | null
          project_id: string
          quantity: number
          quantity_raw: number | null
          repetition: number | null
          storage_location: string | null
          supplier: string | null
          thickness_mm: number | null
          unit: string | null
          visibility_type: string | null
          width_mm: number | null
        }
        Insert: {
          assembly_group_id?: string | null
          color?: string | null
          company_id?: string | null
          created_at?: string
          cutting_edge_released?: boolean | null
          data_source?: string | null
          edge_banding?: string | null
          edge_bottom?: number | null
          edge_left?: number | null
          edge_name_front?: string | null
          edge_name_general?: string | null
          edge_right?: number | null
          edge_top?: number | null
          id?: string
          id_xml?: string | null
          is_completed?: boolean | null
          kind?: string
          length_mm?: number | null
          machining_blocked?: boolean | null
          material?: string | null
          metadata?: Json | null
          module_id?: string | null
          module_sequence?: number | null
          name: string
          parent_id_xml?: string | null
          piece_code?: string | null
          piece_sequence?: number | null
          project_id: string
          quantity?: number
          quantity_raw?: number | null
          repetition?: number | null
          storage_location?: string | null
          supplier?: string | null
          thickness_mm?: number | null
          unit?: string | null
          visibility_type?: string | null
          width_mm?: number | null
        }
        Update: {
          assembly_group_id?: string | null
          color?: string | null
          company_id?: string | null
          created_at?: string
          cutting_edge_released?: boolean | null
          data_source?: string | null
          edge_banding?: string | null
          edge_bottom?: number | null
          edge_left?: number | null
          edge_name_front?: string | null
          edge_name_general?: string | null
          edge_right?: number | null
          edge_top?: number | null
          id?: string
          id_xml?: string | null
          is_completed?: boolean | null
          kind?: string
          length_mm?: number | null
          machining_blocked?: boolean | null
          material?: string | null
          metadata?: Json | null
          module_id?: string | null
          module_sequence?: number | null
          name?: string
          parent_id_xml?: string | null
          piece_code?: string | null
          piece_sequence?: number | null
          project_id?: string
          quantity?: number
          quantity_raw?: number | null
          repetition?: number | null
          storage_location?: string | null
          supplier?: string | null
          thickness_mm?: number | null
          unit?: string | null
          visibility_type?: string | null
          width_mm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "parts_assembly_group_id_fkey"
            columns: ["assembly_group_id"]
            isOneToOne: false
            referencedRelation: "assembly_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parts_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      physical_pilot_checks: {
        Row: {
          company_id: string
          created_at: string | null
          evidence_url: string | null
          gate_id: string
          id: string
          module_id: string | null
          notes: string | null
          operator_name: string
          project_id: string
          status: string | null
          validated_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          evidence_url?: string | null
          gate_id: string
          id?: string
          module_id?: string | null
          notes?: string | null
          operator_name: string
          project_id: string
          status?: string | null
          validated_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          evidence_url?: string | null
          gate_id?: string
          id?: string
          module_id?: string | null
          notes?: string | null
          operator_name?: string
          project_id?: string
          status?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "physical_pilot_checks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "physical_pilot_checks_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "physical_pilot_checks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_configs: {
        Row: {
          company_id: string
          cost_per_m2: number
          created_at: string | null
          edge_cost_per_m: number
          id: string
          markup_percent: number
          material_name: string
        }
        Insert: {
          company_id: string
          cost_per_m2?: number
          created_at?: string | null
          edge_cost_per_m?: number
          id?: string
          markup_percent?: number
          material_name: string
        }
        Update: {
          company_id?: string
          cost_per_m2?: number
          created_at?: string | null
          edge_cost_per_m?: number
          id?: string
          markup_percent?: number
          material_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      production_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          metadata: Json | null
          notes: string | null
          project_id: string
          status_from: string | null
          status_to: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          project_id: string
          status_from?: string | null
          status_to?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          project_id?: string
          status_from?: string | null
          status_to?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      production_steps: {
        Row: {
          company_id: string | null
          completed_at: string | null
          id: string
          module_id: string | null
          notes: string | null
          operator_id: string | null
          part_id: string | null
          physical_id: string | null
          project_id: string
          started_at: string | null
          status: string
          step_type: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          completed_at?: string | null
          id?: string
          module_id?: string | null
          notes?: string | null
          operator_id?: string | null
          part_id?: string | null
          physical_id?: string | null
          project_id: string
          started_at?: string | null
          status?: string
          step_type: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          completed_at?: string | null
          id?: string
          module_id?: string | null
          notes?: string | null
          operator_id?: string | null
          part_id?: string | null
          physical_id?: string | null
          project_id?: string
          started_at?: string | null
          status?: string
          step_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_steps_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_steps_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_steps_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_steps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string | null
          failed_attempts: number | null
          first_login_at: string | null
          full_name: string | null
          id: string
          locked_until: string | null
          must_change_password: boolean | null
          operator_code: string | null
          pin_hash: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          failed_attempts?: number | null
          first_login_at?: string | null
          full_name?: string | null
          id: string
          locked_until?: string | null
          must_change_password?: boolean | null
          operator_code?: string | null
          pin_hash?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          failed_attempts?: number | null
          first_login_at?: string | null
          full_name?: string | null
          id?: string
          locked_until?: string | null
          must_change_password?: boolean | null
          operator_code?: string | null
          pin_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_appointments: {
        Row: {
          arrival_time: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: string
          notes: string | null
          project_id: string
          scheduled_at: string
          status: string
        }
        Insert: {
          arrival_time?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          notes?: string | null
          project_id: string
          scheduled_at: string
          status?: string
        }
        Update: {
          arrival_time?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          notes?: string | null
          project_id?: string
          scheduled_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_appointments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_distribution: {
        Row: {
          area: string
          created_at: string | null
          id: string
          item_count: number | null
          metadata: Json | null
          project_id: string | null
          source_file_id: string | null
          source_type: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          area: string
          created_at?: string | null
          id?: string
          item_count?: number | null
          metadata?: Json | null
          project_id?: string | null
          source_file_id?: string | null
          source_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          area?: string
          created_at?: string | null
          id?: string
          item_count?: number | null
          metadata?: Json | null
          project_id?: string | null
          source_file_id?: string | null
          source_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_distribution_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_distribution_source_file_id_fkey"
            columns: ["source_file_id"]
            isOneToOne: false
            referencedRelation: "project_files"
            referencedColumns: ["id"]
          },
        ]
      }
      project_environments: {
        Row: {
          created_at: string
          id: string
          name: string
          project_id: string
          sequence: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          project_id: string
          sequence?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          sequence?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_environments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_estimates: {
        Row: {
          created_at: string | null
          id: string
          items: Json
          project_id: string
          status: string
          total_value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          items?: Json
          project_id: string
          status?: string
          total_value?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          items?: Json
          project_id?: string
          status?: string
          total_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_files: {
        Row: {
          created_at: string
          file_name: string
          file_type: string | null
          id: string
          project_id: string
          size_bytes: number | null
          storage_path: string | null
          storage_status: string | null
          summary: Json | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_type?: string | null
          id?: string
          project_id: string
          size_bytes?: number | null
          storage_path?: string | null
          storage_status?: string | null
          summary?: Json | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_type?: string | null
          id?: string
          project_id?: string
          size_bytes?: number | null
          storage_path?: string | null
          storage_status?: string | null
          summary?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_import_sessions: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          files: string[] | null
          id: string
          planned_paths: string[] | null
          project_id: string | null
          status: string
          step: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          files?: string[] | null
          id?: string
          planned_paths?: string[] | null
          project_id?: string | null
          status: string
          step: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          files?: string[] | null
          id?: string
          planned_paths?: string[] | null
          project_id?: string | null
          status?: string
          step?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_import_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_import_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_package_validations: {
        Row: {
          company_id: string
          error_code: string | null
          id: string
          item_id: string | null
          message: string | null
          status: string | null
          version_id: string
        }
        Insert: {
          company_id: string
          error_code?: string | null
          id?: string
          item_id?: string | null
          message?: string | null
          status?: string | null
          version_id: string
        }
        Update: {
          company_id?: string
          error_code?: string | null
          id?: string
          item_id?: string | null
          message?: string | null
          status?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_package_validations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_package_validations_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "project_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      project_quotes: {
        Row: {
          company_id: string
          created_at: string | null
          data: Json
          id: string
          project_id: string
          status: string
          total_value: number
          updated_at: string | null
          version: number | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          data?: Json
          id?: string
          project_id: string
          status: string
          total_value?: number
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          data?: Json
          id?: string
          project_id?: string
          status?: string
          total_value?: number
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_quotes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_sites: {
        Row: {
          city: string
          complement: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          district: string | null
          id: string
          number: string
          postal_code: string | null
          project_id: string
          reference: string | null
          state: string
          street: string
        }
        Insert: {
          city: string
          complement?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          district?: string | null
          id?: string
          number: string
          postal_code?: string | null
          project_id: string
          reference?: string | null
          state: string
          street: string
        }
        Update: {
          city?: string
          complement?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          district?: string | null
          id?: string
          number?: string
          postal_code?: string | null
          project_id?: string
          reference?: string | null
          state?: string
          street?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_sites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_version_files: {
        Row: {
          company_id: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          version_id: string
        }
        Insert: {
          company_id: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          version_id: string
        }
        Update: {
          company_id?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_version_files_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_version_files_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "project_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      project_version_items: {
        Row: {
          color: string | null
          company_id: string
          depth_mm: number | null
          engineering_status: string | null
          environment_id: string | null
          group_code: string | null
          height_mm: number | null
          id: string
          material: string | null
          module_id: string
          module_name: string | null
          plugin_version: string | null
          position_x: number | null
          position_y: number | null
          position_z: number | null
          project_id: string
          tags: string[] | null
          thickness_mm: number | null
          validation_notes: string | null
          version_id: string
          width_mm: number | null
        }
        Insert: {
          color?: string | null
          company_id: string
          depth_mm?: number | null
          engineering_status?: string | null
          environment_id?: string | null
          group_code?: string | null
          height_mm?: number | null
          id?: string
          material?: string | null
          module_id: string
          module_name?: string | null
          plugin_version?: string | null
          position_x?: number | null
          position_y?: number | null
          position_z?: number | null
          project_id: string
          tags?: string[] | null
          thickness_mm?: number | null
          validation_notes?: string | null
          version_id: string
          width_mm?: number | null
        }
        Update: {
          color?: string | null
          company_id?: string
          depth_mm?: number | null
          engineering_status?: string | null
          environment_id?: string | null
          group_code?: string | null
          height_mm?: number | null
          id?: string
          material?: string | null
          module_id?: string
          module_name?: string | null
          plugin_version?: string | null
          position_x?: number | null
          position_y?: number | null
          position_z?: number | null
          project_id?: string
          tags?: string[] | null
          thickness_mm?: number | null
          validation_notes?: string | null
          version_id?: string
          width_mm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_version_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_version_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_version_items_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "project_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      project_versions: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          pdf_file_url: string | null
          project_id: string
          skp_file_url: string | null
          status: string | null
          thumbnail_url: string | null
          version_number: number
          xml_file_url: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          pdf_file_url?: string | null
          project_id: string
          skp_file_url?: string | null
          status?: string | null
          thumbnail_url?: string | null
          version_number: number
          xml_file_url?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          pdf_file_url?: string | null
          project_id?: string
          skp_file_url?: string | null
          status?: string | null
          thumbnail_url?: string | null
          version_number?: number
          xml_file_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          assembly_notes: string | null
          assembly_photos: Json | null
          client_id: string | null
          client_name: string | null
          commercial_approved: boolean | null
          company_id: string
          created_at: string | null
          created_by: string | null
          cutting_status: string | null
          distribution_completed_at: string | null
          environment: string | null
          id: string
          ingestion_completed_at: string | null
          is_cutting_edge_released: boolean | null
          is_machining_assembly_blocked: boolean | null
          is_test: boolean | null
          is_validated: boolean
          machining_blocked: boolean | null
          machining_status: string | null
          name: string
          notes: string | null
          official_cut_plan_validated: boolean | null
          operational_status:
            | Database["public"]["Enums"]["project_operational_status"]
            | null
          status: string | null
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          assembly_notes?: string | null
          assembly_photos?: Json | null
          client_id?: string | null
          client_name?: string | null
          commercial_approved?: boolean | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          cutting_status?: string | null
          distribution_completed_at?: string | null
          environment?: string | null
          id?: string
          ingestion_completed_at?: string | null
          is_cutting_edge_released?: boolean | null
          is_machining_assembly_blocked?: boolean | null
          is_test?: boolean | null
          is_validated?: boolean
          machining_blocked?: boolean | null
          machining_status?: string | null
          name: string
          notes?: string | null
          official_cut_plan_validated?: boolean | null
          operational_status?:
            | Database["public"]["Enums"]["project_operational_status"]
            | null
          status?: string | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          assembly_notes?: string | null
          assembly_photos?: Json | null
          client_id?: string | null
          client_name?: string | null
          commercial_approved?: boolean | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          cutting_status?: string | null
          distribution_completed_at?: string | null
          environment?: string | null
          id?: string
          ingestion_completed_at?: string | null
          is_cutting_edge_released?: boolean | null
          is_machining_assembly_blocked?: boolean | null
          is_test?: boolean | null
          is_validated?: boolean
          machining_blocked?: boolean | null
          machining_status?: string | null
          name?: string
          notes?: string | null
          official_cut_plan_validated?: boolean | null
          operational_status?:
            | Database["public"]["Enums"]["project_operational_status"]
            | null
          status?: string | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_volume_items: {
        Row: {
          id: string
          module_id: string
          volume_id: string
        }
        Insert: {
          id?: string
          module_id: string
          volume_id: string
        }
        Update: {
          id?: string
          module_id?: string
          volume_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_volume_items_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_volumes: {
        Row: {
          code: string
          created_at: string | null
          delivered_at: string | null
          driver_name: string | null
          group_id: string | null
          id: string
          loaded_at: string | null
          metadata: Json | null
          name: string
          photo_url: string | null
          project_id: string
          responsible_id: string | null
          scanned_at: string | null
          status: string
          updated_at: string | null
          vehicle_plate: string | null
          weight_kg: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          delivered_at?: string | null
          driver_name?: string | null
          group_id?: string | null
          id?: string
          loaded_at?: string | null
          metadata?: Json | null
          name: string
          photo_url?: string | null
          project_id: string
          responsible_id?: string | null
          scanned_at?: string | null
          status?: string
          updated_at?: string | null
          vehicle_plate?: string | null
          weight_kg?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          delivered_at?: string | null
          driver_name?: string | null
          group_id?: string | null
          id?: string
          loaded_at?: string | null
          metadata?: Json | null
          name?: string
          photo_url?: string | null
          project_id?: string
          responsible_id?: string | null
          scanned_at?: string | null
          status?: string
          updated_at?: string | null
          vehicle_plate?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipping_volumes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "assembly_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_volumes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      store_credit_accounts: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          current_balance: number
          id: string
          opening_balance: number
          supplier_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          current_balance?: number
          id?: string
          opening_balance?: number
          supplier_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          current_balance?: number
          id?: string
          opening_balance?: number
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_credit_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_credit_accounts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      store_credit_transactions: {
        Row: {
          account_id: string
          amount: number
          company_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string
          document_id: string | null
          id: string
          idempotency_key: string
          kind: string
          new_balance: number
          notes: string | null
          previous_balance: number
          reversal_of: string | null
          status: string
        }
        Insert: {
          account_id: string
          amount: number
          company_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by: string
          document_id?: string | null
          id?: string
          idempotency_key?: string
          kind: string
          new_balance?: number
          notes?: string | null
          previous_balance?: number
          reversal_of?: string | null
          status?: string
        }
        Update: {
          account_id?: string
          amount?: number
          company_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string
          document_id?: string | null
          id?: string
          idempotency_key?: string
          kind?: string
          new_balance?: number
          notes?: string | null
          previous_balance?: number
          reversal_of?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_credit_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "store_credit_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_credit_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_credit_transactions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "financial_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_credit_transactions_reversal_of_fkey"
            columns: ["reversal_of"]
            isOneToOne: false
            referencedRelation: "store_credit_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_offers: {
        Row: {
          brand: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          normalized_product: string
          package_quantity: number
          product_name: string
          shipping_cost: number
          source_document_id: string | null
          supplier_id: string
          unit: string
          unit_price: number
          valid_until: string | null
        }
        Insert: {
          brand?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          normalized_product: string
          package_quantity?: number
          product_name: string
          shipping_cost?: number
          source_document_id?: string | null
          supplier_id: string
          unit: string
          unit_price: number
          valid_until?: string | null
        }
        Update: {
          brand?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          normalized_product?: string
          package_quantity?: number
          product_name?: string
          shipping_cost?: number
          source_document_id?: string | null
          supplier_id?: string
          unit?: string
          unit_price?: number
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_offers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_offers_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "financial_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_offers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_prices: {
        Row: {
          availability: boolean | null
          company_id: string
          id: string
          last_update: string | null
          lead_time_days: number | null
          material_name: string
          price_per_unit: number
          shipping_cost: number | null
          supplier_name: string
        }
        Insert: {
          availability?: boolean | null
          company_id: string
          id?: string
          last_update?: string | null
          lead_time_days?: number | null
          material_name: string
          price_per_unit: number
          shipping_cost?: number | null
          supplier_name: string
        }
        Update: {
          availability?: boolean | null
          company_id?: string
          id?: string
          last_update?: string | null
          lead_time_days?: number | null
          material_name?: string
          price_per_unit?: number
          shipping_cost?: number | null
          supplier_name?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          active: boolean
          average_lead_days: number | null
          company_id: string
          contact_name: string | null
          created_at: string
          created_by: string | null
          id: string
          legal_name: string | null
          name: string
          services: string[]
          tax_document: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          active?: boolean
          average_lead_days?: number | null
          company_id: string
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          legal_name?: string | null
          name: string
          services?: string[]
          tax_document?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          active?: boolean
          average_lead_days?: number | null
          company_id?: string
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          legal_name?: string | null
          name?: string
          services?: string[]
          tax_document?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      validation_checks: {
        Row: {
          check_type: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          evidence_file_id: string | null
          evidence_source: string | null
          id: string
          is_completed: boolean
          notes: string | null
          project_id: string
          updated_at: string
        }
        Insert: {
          check_type: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          evidence_file_id?: string | null
          evidence_source?: string | null
          id?: string
          is_completed?: boolean
          notes?: string | null
          project_id: string
          updated_at?: string
        }
        Update: {
          check_type?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          evidence_file_id?: string | null
          evidence_source?: string | null
          id?: string
          is_completed?: boolean
          notes?: string | null
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_checks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      visual_analysis_findings: {
        Row: {
          bounding_box: Json | null
          confidence: number | null
          created_at: string
          finding_type: string
          id: string
          normalized_value: Json | null
          original_text: string | null
          page_number: number | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          session_id: string
        }
        Insert: {
          bounding_box?: Json | null
          confidence?: number | null
          created_at?: string
          finding_type: string
          id?: string
          normalized_value?: Json | null
          original_text?: string | null
          page_number?: number | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id: string
        }
        Update: {
          bounding_box?: Json | null
          confidence?: number | null
          created_at?: string
          finding_type?: string
          id?: string
          normalized_value?: Json | null
          original_text?: string | null
          page_number?: number | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visual_analysis_findings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "visual_analysis_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      visual_analysis_sessions: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          file_hash: string | null
          file_name: string
          id: string
          manufacturing_authority: boolean
          method: string
          project_id: string | null
          purpose: string
          status: string
          storage_path: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          file_hash?: string | null
          file_name: string
          id?: string
          manufacturing_authority?: boolean
          method?: string
          project_id?: string | null
          purpose?: string
          status?: string
          storage_path: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          file_hash?: string | null
          file_name?: string
          id?: string
          manufacturing_authority?: boolean
          method?: string
          project_id?: string | null
          purpose?: string
          status?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "visual_analysis_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visual_analysis_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      visual_identifications: {
        Row: {
          confidence_level: string | null
          created_at: string | null
          created_by: string | null
          id: string
          module_id: string | null
          observation: string | null
          part_id: string | null
          project_id: string
          source_file: string | null
          updated_at: string | null
          visual_reference: string | null
        }
        Insert: {
          confidence_level?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          module_id?: string | null
          observation?: string | null
          part_id?: string | null
          project_id: string
          source_file?: string | null
          updated_at?: string | null
          visual_reference?: string | null
        }
        Update: {
          confidence_level?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          module_id?: string | null
          observation?: string | null
          part_id?: string | null
          project_id?: string
          source_file?: string | null
          updated_at?: string | null
          visual_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visual_identifications_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visual_identifications_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visual_identifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_commercial: { Args: never; Returns: boolean }
      can_manage_projects: { Args: never; Returns: boolean }
      check_must_change_password: {
        Args: { _user_id: string }
        Returns: boolean
      }
      confirm_store_credit_transaction: {
        Args: { _transaction_id: string }
        Returns: number
      }
      create_complete_client_project:
        | {
            Args: {
              _client: Json
              _environments: Json
              _project: Json
              _site: Json
            }
            Returns: string
          }
        | {
            Args: {
              _client: Json
              _files: Json
              _loose_parts: Json
              _modules: Json
              _project: Json
              _site: Json
            }
            Returns: string
          }
      current_company_id: { Args: never; Returns: string }
      discard_import_session: {
        Args: { _session_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_client_project: {
        Args: {
          _files: Json
          _loose_parts: Json
          _modules: Json
          _project: Json
          _project_id: string
        }
        Returns: string
      }
      import_client_project_v2: {
        Args: { _files: Json[]; _project: Json; _project_id: string }
        Returns: string
      }
      import_legacy_store_credits: { Args: { _payload: Json }; Returns: Json }
      industrial_bypass_persist_closet: {
        Args: {
          _company_id: string
          _name: string
          _project_id: string
          _user_id: string
        }
        Returns: undefined
      }
      industrial_bypass_persist_closet_v11: {
        Args: {
          _company_id: string
          _name: string
          _project_id: string
          _user_id: string
        }
        Returns: undefined
      }
      ingest_and_distribute_project: {
        Args: { _loose_parts: Json[]; _modules: Json[]; _project_id: string }
        Returns: undefined
      }
      initialize_production_tracking: {
        Args: { p_company_id: string; p_project_id: string; p_steps: Json }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      mark_import_cleanup_required: {
        Args: { _session_id: string }
        Returns: undefined
      }
      persist_industrial_project_bypass: {
        Args: {
          _client_name: string
          _company_id: string
          _name: string
          _project_id: string
          _user_id: string
        }
        Returns: undefined
      }
      persist_industrial_project_bypass_v2: {
        Args: {
          _client_name: string
          _company_id: string
          _name: string
          _project_id: string
          _storage_path: string
          _user_id: string
          _xml_size: number
        }
        Returns: undefined
      }
      persist_industrial_project_bypass_v3: {
        Args: {
          _client_name: string
          _company_id: string
          _name: string
          _project_id: string
          _user_id: string
        }
        Returns: undefined
      }
      prepare_store_credit_purchase: {
        Args: {
          _account_id: string
          _amount: number
          _document_id: string
          _idempotency_key?: string
        }
        Returns: string
      }
      promote_test_project: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      release_project_machining: {
        Args: { _project_id: string }
        Returns: undefined
      }
      save_official_cut_plan: {
        Args: {
          p_company_id: string
          p_metadata?: Json
          p_project_id: string
          p_source: string
          p_total_cuts: number
          p_total_pieces: number
          p_total_sheets: number
          p_utilization_percent: number
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "escritorio"
        | "fabrica"
        | "montador"
        | "auditor"
        | "projetista"
        | "comercial"
      maintenance_status:
        | "aberto"
        | "em_analise"
        | "producao"
        | "enviado"
        | "concluido"
      maintenance_type:
        | "defeito"
        | "dano_transporte"
        | "erro_projeto"
        | "erro_montagem"
        | "outros"
      maintenance_urgency: "baixa" | "media" | "alta" | "critica"
      part_kind:
        | "peca"
        | "chapa"
        | "ferragem"
        | "acessorio"
        | "servico"
        | "outro"
      project_operational_status:
        | "recebido"
        | "processando"
        | "alimentado"
        | "conferencia_pendente"
        | "divergencia_encontrada"
        | "pronto_para_producao"
        | "em_producao"
        | "finalizado"
      shipping_status:
        | "aguardando"
        | "conferido"
        | "bloqueado"
        | "carregado"
        | "entregue"
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
      app_role: [
        "admin",
        "escritorio",
        "fabrica",
        "montador",
        "auditor",
        "projetista",
        "comercial",
      ],
      maintenance_status: [
        "aberto",
        "em_analise",
        "producao",
        "enviado",
        "concluido",
      ],
      maintenance_type: [
        "defeito",
        "dano_transporte",
        "erro_projeto",
        "erro_montagem",
        "outros",
      ],
      maintenance_urgency: ["baixa", "media", "alta", "critica"],
      part_kind: ["peca", "chapa", "ferragem", "acessorio", "servico", "outro"],
      project_operational_status: [
        "recebido",
        "processando",
        "alimentado",
        "conferencia_pendente",
        "divergencia_encontrada",
        "pronto_para_producao",
        "em_producao",
        "finalizado",
      ],
      shipping_status: [
        "aguardando",
        "conferido",
        "bloqueado",
        "carregado",
        "entregue",
      ],
    },
  },
} as const
