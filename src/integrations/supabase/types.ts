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
          created_at: string
          data_source: string | null
          depth_mm: number | null
          environment: string | null
          height_mm: number | null
          id: string
          is_completed: boolean | null
          name: string
          project_id: string
          quantity: number
          width_mm: number | null
        }
        Insert: {
          created_at?: string
          data_source?: string | null
          depth_mm?: number | null
          environment?: string | null
          height_mm?: number | null
          id?: string
          is_completed?: boolean | null
          name: string
          project_id: string
          quantity?: number
          width_mm?: number | null
        }
        Update: {
          created_at?: string
          data_source?: string | null
          depth_mm?: number | null
          environment?: string | null
          height_mm?: number | null
          id?: string
          is_completed?: boolean | null
          name?: string
          project_id?: string
          quantity?: number
          width_mm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "modules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
          created_at: string
          cutting_edge_released: boolean | null
          data_source: string | null
          edge_banding: string | null
          id: string
          is_completed: boolean | null
          kind: string
          length_mm: number | null
          machining_blocked: boolean | null
          material: string | null
          module_id: string | null
          name: string
          project_id: string
          quantity: number
          thickness_mm: number | null
          unit: string | null
          visibility_type: string | null
          width_mm: number | null
        }
        Insert: {
          assembly_group_id?: string | null
          created_at?: string
          cutting_edge_released?: boolean | null
          data_source?: string | null
          edge_banding?: string | null
          id?: string
          is_completed?: boolean | null
          kind?: string
          length_mm?: number | null
          machining_blocked?: boolean | null
          material?: string | null
          module_id?: string | null
          name: string
          project_id: string
          quantity?: number
          thickness_mm?: number | null
          unit?: string | null
          visibility_type?: string | null
          width_mm?: number | null
        }
        Update: {
          assembly_group_id?: string | null
          created_at?: string
          cutting_edge_released?: boolean | null
          data_source?: string | null
          edge_banding?: string | null
          id?: string
          is_completed?: boolean | null
          kind?: string
          length_mm?: number | null
          machining_blocked?: boolean | null
          material?: string | null
          module_id?: string | null
          name?: string
          project_id?: string
          quantity?: number
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
          completed_at: string | null
          id: string
          module_id: string | null
          notes: string | null
          operator_id: string | null
          part_id: string | null
          project_id: string
          started_at: string | null
          status: string
          step_type: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          id?: string
          module_id?: string | null
          notes?: string | null
          operator_id?: string | null
          part_id?: string | null
          project_id: string
          started_at?: string | null
          status?: string
          step_type: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          id?: string
          module_id?: string | null
          notes?: string | null
          operator_id?: string | null
          part_id?: string | null
          project_id?: string
          started_at?: string | null
          status?: string
          step_type?: string
          updated_at?: string | null
        }
        Relationships: [
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
          full_name: string | null
          id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
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
      project_files: {
        Row: {
          created_at: string
          file_name: string
          file_type: string | null
          id: string
          project_id: string
          size_bytes: number | null
          summary: Json | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_type?: string | null
          id?: string
          project_id: string
          size_bytes?: number | null
          summary?: Json | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_type?: string | null
          id?: string
          project_id?: string
          size_bytes?: number | null
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
      projects: {
        Row: {
          client_name: string | null
          company_id: string
          created_at: string | null
          cutting_status: string | null
          environment: string | null
          id: string
          is_cutting_edge_released: boolean | null
          is_machining_assembly_blocked: boolean | null
          machining_status: string | null
          name: string
          notes: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          client_name?: string | null
          company_id: string
          created_at?: string | null
          cutting_status?: string | null
          environment?: string | null
          id?: string
          is_cutting_edge_released?: boolean | null
          is_machining_assembly_blocked?: boolean | null
          machining_status?: string | null
          name: string
          notes?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          client_name?: string | null
          company_id?: string
          created_at?: string | null
          cutting_status?: string | null
          environment?: string | null
          id?: string
          is_cutting_edge_released?: boolean | null
          is_machining_assembly_blocked?: boolean | null
          machining_status?: string | null
          name?: string
          notes?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
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
      user_roles: {
        Row: {
          id: string
          role: any
          user_id: string
        }
        Insert: {
          id?: string
          role: any
          user_id: string
        }
        Update: {
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
      current_company_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: any
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "escritorio" | "fabrica" | "montador"
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
      app_role: ["admin", "escritorio", "fabrica", "montador"],
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
