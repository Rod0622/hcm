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
      access_grants: {
        Row: {
          app_id: string
          application_id: string | null
          candidate_id: string
          created_at: string
          granted_by: string | null
          id: string
          provisioned_at: string
          status: string
          tenant_id: string
        }
        Insert: {
          app_id: string
          application_id?: string | null
          candidate_id: string
          created_at?: string
          granted_by?: string | null
          id?: string
          provisioned_at?: string
          status?: string
          tenant_id: string
        }
        Update: {
          app_id?: string
          application_id?: string | null
          candidate_id?: string
          created_at?: string
          granted_by?: string | null
          id?: string
          provisioned_at?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_grants_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "software_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_grants_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_grants_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_grants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          matched_keywords: Json
          missing_keywords: Json
          opening_id: string
          resume_filename: string | null
          resume_path: string | null
          resume_text: string | null
          score: number | null
          status: string
          tenant_id: string
          uploaded_by: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          matched_keywords?: Json
          missing_keywords?: Json
          opening_id: string
          resume_filename?: string | null
          resume_path?: string | null
          resume_text?: string | null
          score?: number | null
          status?: string
          tenant_id: string
          uploaded_by?: string | null
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          matched_keywords?: Json
          missing_keywords?: Json
          opening_id?: string
          resume_filename?: string | null
          resume_path?: string | null
          resume_text?: string | null
          score?: number | null
          status?: string
          tenant_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_opening_id_fkey"
            columns: ["opening_id"]
            isOneToOne: false
            referencedRelation: "job_openings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          assignee_rule: string | null
          assignee_user_id: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          due_at: string | null
          escalate_after: string | null
          id: string
          kind: string
          requested_for_worker_id: string | null
          run_step_id: string | null
          status: string
          subject: string
          tenant_id: string
        }
        Insert: {
          assignee_rule?: string | null
          assignee_user_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          due_at?: string | null
          escalate_after?: string | null
          id?: string
          kind?: string
          requested_for_worker_id?: string | null
          run_step_id?: string | null
          status?: string
          subject: string
          tenant_id: string
        }
        Update: {
          assignee_rule?: string | null
          assignee_user_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          due_at?: string | null
          escalate_after?: string | null
          id?: string
          kind?: string
          requested_for_worker_id?: string | null
          run_step_id?: string | null
          status?: string
          subject?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_requested_for_worker_id_fkey"
            columns: ["requested_for_worker_id"]
            isOneToOne: false
            referencedRelation: "pto_balances"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "approvals_requested_for_worker_id_fkey"
            columns: ["requested_for_worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_run_step_id_fkey"
            columns: ["run_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_run_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_label: string
          actor_user_id: string | null
          created_at: string
          id: number
          new_data: Json | null
          object_id: string | null
          object_type: string | null
          old_data: Json | null
          source: string
          tenant_id: string
        }
        Insert: {
          action: string
          actor_label?: string
          actor_user_id?: string | null
          created_at?: string
          id?: never
          new_data?: Json | null
          object_id?: string | null
          object_type?: string | null
          old_data?: Json | null
          source?: string
          tenant_id: string
        }
        Update: {
          action?: string
          actor_label?: string
          actor_user_id?: string | null
          created_at?: string
          id?: never
          new_data?: Json | null
          object_id?: string | null
          object_type?: string | null
          old_data?: Json | null
          source?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          source: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          source?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          source?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      compensation_records: {
        Row: {
          approved_by: string | null
          base_amount: number | null
          components: Json
          created_at: string
          currency: string | null
          effective_date: string
          event: string
          frequency: string | null
          id: string
          reason: string | null
          tenant_id: string
          worker_id: string
        }
        Insert: {
          approved_by?: string | null
          base_amount?: number | null
          components?: Json
          created_at?: string
          currency?: string | null
          effective_date: string
          event?: string
          frequency?: string | null
          id?: string
          reason?: string | null
          tenant_id: string
          worker_id: string
        }
        Update: {
          approved_by?: string | null
          base_amount?: number | null
          components?: Json
          created_at?: string
          currency?: string | null
          effective_date?: string
          event?: string
          frequency?: string | null
          id?: string
          reason?: string | null
          tenant_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compensation_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compensation_records_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "pto_balances"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "compensation_records_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_packs: {
        Row: {
          country_code: string
          created_at: string
          id: string
          legal_entity_id: string | null
          name: string
          status: string
          tenant_id: string
          version: string
        }
        Insert: {
          country_code: string
          created_at?: string
          id?: string
          legal_entity_id?: string | null
          name: string
          status?: string
          tenant_id: string
          version?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          id?: string
          legal_entity_id?: string | null
          name?: string
          status?: string
          tenant_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_packs_legal_entity_id_fkey"
            columns: ["legal_entity_id"]
            isOneToOne: false
            referencedRelation: "legal_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_packs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_requirements: {
        Row: {
          applies_to: string
          blocks_payroll: boolean
          config: Json
          created_at: string
          id: string
          key: string
          kind: string
          name: string
          pack_id: string
          recurrence: string | null
          severity: string
          tenant_id: string
        }
        Insert: {
          applies_to?: string
          blocks_payroll?: boolean
          config?: Json
          created_at?: string
          id?: string
          key: string
          kind: string
          name: string
          pack_id: string
          recurrence?: string | null
          severity?: string
          tenant_id: string
        }
        Update: {
          applies_to?: string
          blocks_payroll?: boolean
          config?: Json
          created_at?: string
          id?: string
          key?: string
          kind?: string
          name?: string
          pack_id?: string
          recurrence?: string | null
          severity?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_requirements_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "compliance_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_requirements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_statuses: {
        Row: {
          created_at: string
          due_on: string | null
          evidence: Json
          id: string
          owner_user_id: string | null
          requirement_id: string
          satisfied_at: string | null
          status: string
          subject_id: string
          subject_type: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          due_on?: string | null
          evidence?: Json
          id?: string
          owner_user_id?: string | null
          requirement_id: string
          satisfied_at?: string | null
          status?: string
          subject_id: string
          subject_type: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          due_on?: string | null
          evidence?: Json
          id?: string
          owner_user_id?: string | null
          requirement_id?: string
          satisfied_at?: string | null
          status?: string
          subject_id?: string
          subject_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_statuses_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "compliance_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_statuses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          expires_on: string | null
          id: string
          kind: string
          metadata: Json
          name: string
          person_id: string | null
          status: string
          storage_path: string | null
          tenant_id: string
          worker_id: string | null
        }
        Insert: {
          created_at?: string
          expires_on?: string | null
          id?: string
          kind?: string
          metadata?: Json
          name: string
          person_id?: string | null
          status?: string
          storage_path?: string | null
          tenant_id: string
          worker_id?: string | null
        }
        Update: {
          created_at?: string
          expires_on?: string | null
          id?: string
          kind?: string
          metadata?: Json
          name?: string
          person_id?: string | null
          status?: string
          storage_path?: string | null
          tenant_id?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "pto_balances"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "documents_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_events: {
        Row: {
          event_type: string
          id: number
          object_id: string | null
          object_type: string
          occurred_at: string
          payload: Json
          processed_at: string | null
          tenant_id: string
        }
        Insert: {
          event_type: string
          id?: never
          object_id?: string | null
          object_type: string
          occurred_at?: string
          payload?: Json
          processed_at?: string | null
          tenant_id: string
        }
        Update: {
          event_type?: string
          id?: never
          object_id?: string | null
          object_type?: string
          occurred_at?: string
          payload?: Json
          processed_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      field_definitions: {
        Row: {
          archived_at: string | null
          created_at: string
          field_type: string
          id: string
          key: string
          label: string
          object_id: string
          options: Json
          position: number
          required: string
          tenant_id: string
          validation: Json
          visibility: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          field_type: string
          id?: string
          key: string
          label: string
          object_id: string
          options?: Json
          position?: number
          required?: string
          tenant_id: string
          validation?: Json
          visibility?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          field_type?: string
          id?: string
          key?: string
          label?: string
          object_id?: string
          options?: Json
          position?: number
          required?: string
          tenant_id?: string
          validation?: Json
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_definitions_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "object_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      field_values: {
        Row: {
          field_id: string
          id: string
          record_id: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          value: Json | null
        }
        Insert: {
          field_id: string
          id?: string
          record_id: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          value?: Json | null
        }
        Update: {
          field_id?: string
          id?: string
          record_id?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "field_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "field_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_values_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_accounts: {
        Row: {
          config: Json
          connected_at: string | null
          connected_by: string | null
          created_at: string
          id: string
          provider: string
          secret_ref: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          config?: Json
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string
          id?: string
          provider: string
          secret_ref?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          config?: Json
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string
          id?: string
          provider?: string
          secret_ref?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_openings: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          headcount: number
          id: string
          keywords: Json
          legal_entity_id: string | null
          location_id: string | null
          org_unit_id: string | null
          status: string
          tenant_id: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          headcount?: number
          id?: string
          keywords?: Json
          legal_entity_id?: string | null
          location_id?: string | null
          org_unit_id?: string | null
          status?: string
          tenant_id: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          headcount?: number
          id?: string
          keywords?: Json
          legal_entity_id?: string | null
          location_id?: string | null
          org_unit_id?: string | null
          status?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_openings_legal_entity_id_fkey"
            columns: ["legal_entity_id"]
            isOneToOne: false
            referencedRelation: "legal_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_openings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_openings_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_openings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_policies: {
        Row: {
          accrual_per_month: number
          country_code: string
          created_at: string
          id: string
          leave_type: string
          name: string
          tenant_id: string
        }
        Insert: {
          accrual_per_month: number
          country_code: string
          created_at?: string
          id?: string
          leave_type?: string
          name: string
          tenant_id: string
        }
        Update: {
          accrual_per_month?: number
          country_code?: string
          created_at?: string
          id?: string
          leave_type?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approver_worker_id: string | null
          created_at: string
          days: number
          decided_at: string | null
          decided_by: string | null
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          start_date: string
          status: string
          tenant_id: string
          worker_id: string
        }
        Insert: {
          approver_worker_id?: string | null
          created_at?: string
          days: number
          decided_at?: string | null
          decided_by?: string | null
          end_date: string
          id?: string
          leave_type?: string
          reason?: string | null
          start_date: string
          status?: string
          tenant_id: string
          worker_id: string
        }
        Update: {
          approver_worker_id?: string | null
          created_at?: string
          days?: number
          decided_at?: string | null
          decided_by?: string | null
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          start_date?: string
          status?: string
          tenant_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approver_worker_id_fkey"
            columns: ["approver_worker_id"]
            isOneToOne: false
            referencedRelation: "pto_balances"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "leave_requests_approver_worker_id_fkey"
            columns: ["approver_worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "pto_balances"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "leave_requests_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_entities: {
        Row: {
          country_code: string
          created_at: string
          currency: string
          id: string
          name: string
          payroll_settings: Json
          tax_registrations: Json
          tenant_id: string
        }
        Insert: {
          country_code: string
          created_at?: string
          currency: string
          id?: string
          name: string
          payroll_settings?: Json
          tax_registrations?: Json
          tenant_id: string
        }
        Update: {
          country_code?: string
          created_at?: string
          currency?: string
          id?: string
          name?: string
          payroll_settings?: Json
          tax_registrations?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_entities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          country_code: string
          created_at: string
          id: string
          legal_entity_id: string | null
          name: string
          region: string | null
          tenant_id: string
          timezone: string | null
        }
        Insert: {
          country_code: string
          created_at?: string
          id?: string
          legal_entity_id?: string | null
          name: string
          region?: string | null
          tenant_id: string
          timezone?: string | null
        }
        Update: {
          country_code?: string
          created_at?: string
          id?: string
          legal_entity_id?: string | null
          name?: string
          region?: string | null
          tenant_id?: string
          timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_legal_entity_id_fkey"
            columns: ["legal_entity_id"]
            isOneToOne: false
            referencedRelation: "legal_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: string
          created_at: string
          id: string
          payload: Json
          recipient_user_id: string | null
          run_step_id: string | null
          sent_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          payload?: Json
          recipient_user_id?: string | null
          run_step_id?: string | null
          sent_at?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          payload?: Json
          recipient_user_id?: string | null
          run_step_id?: string | null
          sent_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_run_step_id_fkey"
            columns: ["run_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_run_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      object_definitions: {
        Row: {
          config: Json
          created_at: string
          id: string
          key: string
          label: string
          source: string
          tenant_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          key: string
          label: string
          source?: string
          tenant_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          key?: string
          label?: string
          source?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "object_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          application_id: string
          base_amount: number
          created_at: string
          created_by: string | null
          currency: string
          frequency: string
          id: string
          notes: string | null
          sent_at: string
          signed_at: string | null
          signed_doc_path: string | null
          signed_filename: string | null
          start_date: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          application_id: string
          base_amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          frequency?: string
          id?: string
          notes?: string | null
          sent_at?: string
          signed_at?: string | null
          signed_doc_path?: string | null
          signed_filename?: string | null
          start_date?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          application_id?: string
          base_amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          frequency?: string
          id?: string
          notes?: string | null
          sent_at?: string
          signed_at?: string | null
          signed_doc_path?: string | null
          signed_filename?: string | null
          start_date?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      org_units: {
        Row: {
          code: string | null
          created_at: string
          id: string
          kind: string
          name: string
          parent_id: string | null
          tenant_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          kind?: string
          name: string
          parent_id?: string | null
          tenant_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          kind?: string
          name?: string
          parent_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_units_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_units_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_emails: {
        Row: {
          application_id: string | null
          body: string
          candidate_id: string | null
          created_at: string
          created_by: string | null
          error: string | null
          id: string
          kind: string
          sent_at: string | null
          status: string
          subject: string
          tenant_id: string
          to_email: string
          to_name: string | null
        }
        Insert: {
          application_id?: string | null
          body: string
          candidate_id?: string | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          kind?: string
          sent_at?: string | null
          status?: string
          subject: string
          tenant_id: string
          to_email: string
          to_name?: string | null
        }
        Update: {
          application_id?: string | null
          body?: string
          candidate_id?: string | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          kind?: string
          sent_at?: string | null
          status?: string
          subject?: string
          tenant_id?: string
          to_email?: string
          to_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outbound_emails_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_emails_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_emails_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pay_codes: {
        Row: {
          config: Json
          country_code: string | null
          created_at: string
          id: string
          key: string
          kind: string
          name: string
          taxable: boolean
          tenant_id: string
        }
        Insert: {
          config?: Json
          country_code?: string | null
          created_at?: string
          id?: string
          key: string
          kind: string
          name: string
          taxable?: boolean
          tenant_id: string
        }
        Update: {
          config?: Json
          country_code?: string | null
          created_at?: string
          id?: string
          key?: string
          kind?: string
          name?: string
          taxable?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pay_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pay_groups: {
        Row: {
          created_at: string
          currency: string
          frequency: string
          id: string
          legal_entity_id: string
          name: string
          settings: Json
          tenant_id: string
        }
        Insert: {
          created_at?: string
          currency: string
          frequency?: string
          id?: string
          legal_entity_id: string
          name: string
          settings?: Json
          tenant_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          frequency?: string
          id?: string
          legal_entity_id?: string
          name?: string
          settings?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pay_groups_legal_entity_id_fkey"
            columns: ["legal_entity_id"]
            isOneToOne: false
            referencedRelation: "legal_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pay_periods: {
        Row: {
          id: string
          pay_date: string
          pay_group_id: string
          period_end: string
          period_start: string
          status: string
          tenant_id: string
        }
        Insert: {
          id?: string
          pay_date: string
          pay_group_id: string
          period_end: string
          period_start: string
          status?: string
          tenant_id: string
        }
        Update: {
          id?: string
          pay_date?: string
          pay_group_id?: string
          period_end?: string
          period_start?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pay_periods_pay_group_id_fkey"
            columns: ["pay_group_id"]
            isOneToOne: false
            referencedRelation: "pay_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_exceptions: {
        Row: {
          code: string
          created_at: string
          id: string
          message: string
          resolved_at: string | null
          resolved_by: string | null
          run_id: string
          severity: string
          status: string
          suggested_action: string | null
          tenant_id: string
          worker_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          message: string
          resolved_at?: string | null
          resolved_by?: string | null
          run_id: string
          severity: string
          status?: string
          suggested_action?: string | null
          tenant_id: string
          worker_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          message?: string
          resolved_at?: string | null
          resolved_by?: string | null
          run_id?: string
          severity?: string
          status?: string
          suggested_action?: string | null
          tenant_id?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_exceptions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_exceptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_exceptions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "pto_balances"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "payroll_exceptions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_line_items: {
        Row: {
          amount: number
          detail: Json
          id: string
          is_retro: boolean
          line_id: string
          pay_code_id: string
          quantity: number | null
          rate: number | null
          retro_period_id: string | null
          rule_version_id: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          detail?: Json
          id?: string
          is_retro?: boolean
          line_id: string
          pay_code_id: string
          quantity?: number | null
          rate?: number | null
          retro_period_id?: string | null
          rule_version_id?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          detail?: Json
          id?: string
          is_retro?: boolean
          line_id?: string
          pay_code_id?: string
          quantity?: number | null
          rate?: number | null
          retro_period_id?: string | null
          rule_version_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_line_items_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "my_payslips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_line_items_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "payroll_run_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_line_items_pay_code_id_fkey"
            columns: ["pay_code_id"]
            isOneToOne: false
            referencedRelation: "pay_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_line_items_retro_period_id_fkey"
            columns: ["retro_period_id"]
            isOneToOne: false
            referencedRelation: "pay_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_line_items_rule_version_id_fkey"
            columns: ["rule_version_id"]
            isOneToOne: false
            referencedRelation: "payroll_rule_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_line_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_rule_sets: {
        Row: {
          country_code: string | null
          created_at: string
          id: string
          key: string
          legal_entity_id: string | null
          name: string
          scope: Json
          tenant_id: string
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          id?: string
          key: string
          legal_entity_id?: string | null
          name: string
          scope?: Json
          tenant_id: string
        }
        Update: {
          country_code?: string | null
          created_at?: string
          id?: string
          key?: string
          legal_entity_id?: string | null
          name?: string
          scope?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_rule_sets_legal_entity_id_fkey"
            columns: ["legal_entity_id"]
            isOneToOne: false
            referencedRelation: "legal_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_rule_sets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_rule_versions: {
        Row: {
          created_at: string
          effective_from: string
          effective_to: string | null
          id: string
          logic: Json
          published_at: string | null
          published_by: string | null
          rule_set_id: string
          status: string
          tenant_id: string
          version: number
        }
        Insert: {
          created_at?: string
          effective_from: string
          effective_to?: string | null
          id?: string
          logic?: Json
          published_at?: string | null
          published_by?: string | null
          rule_set_id: string
          status?: string
          tenant_id: string
          version: number
        }
        Update: {
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          logic?: Json
          published_at?: string | null
          published_by?: string | null
          rule_set_id?: string
          status?: string
          tenant_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_rule_versions_rule_set_id_fkey"
            columns: ["rule_set_id"]
            isOneToOne: false
            referencedRelation: "payroll_rule_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_rule_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_run_lines: {
        Row: {
          currency: string
          deductions: number
          employer_contributions: number
          gross: number
          id: string
          net: number
          notes: Json
          run_id: string
          status: string
          taxes: number
          tenant_id: string
          worker_id: string
        }
        Insert: {
          currency: string
          deductions?: number
          employer_contributions?: number
          gross?: number
          id?: string
          net?: number
          notes?: Json
          run_id: string
          status?: string
          taxes?: number
          tenant_id: string
          worker_id: string
        }
        Update: {
          currency?: string
          deductions?: number
          employer_contributions?: number
          gross?: number
          id?: string
          net?: number
          notes?: Json
          run_id?: string
          status?: string
          taxes?: number
          tenant_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_run_lines_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_run_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_run_lines_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "pto_balances"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "payroll_run_lines_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          approved_by: string | null
          calculated_at: string | null
          created_at: string
          id: string
          pay_group_id: string
          pay_period_id: string
          processed_at: string | null
          run_type: string
          status: string
          submitted_by: string | null
          tenant_id: string
          totals: Json
        }
        Insert: {
          approved_by?: string | null
          calculated_at?: string | null
          created_at?: string
          id?: string
          pay_group_id: string
          pay_period_id: string
          processed_at?: string | null
          run_type?: string
          status?: string
          submitted_by?: string | null
          tenant_id: string
          totals?: Json
        }
        Update: {
          approved_by?: string | null
          calculated_at?: string | null
          created_at?: string
          id?: string
          pay_group_id?: string
          pay_period_id?: string
          processed_at?: string | null
          run_type?: string
          status?: string
          submitted_by?: string | null
          tenant_id?: string
          totals?: Json
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_pay_group_id_fkey"
            columns: ["pay_group_id"]
            isOneToOne: false
            referencedRelation: "pay_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_pay_period_id_fkey"
            columns: ["pay_period_id"]
            isOneToOne: false
            referencedRelation: "pay_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string
          id: string
          personal: Json
          phone: string | null
          preferred_name: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          id?: string
          personal?: Json
          phone?: string | null
          preferred_name?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          id?: string
          personal?: Json
          phone?: string | null
          preferred_name?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_acknowledgments: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          document_id: string
          id: string
          status: string
          tenant_id: string
          worker_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          document_id: string
          id?: string
          status?: string
          tenant_id: string
          worker_id: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          document_id?: string
          id?: string
          status?: string
          tenant_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_acknowledgments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_acknowledgments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_acknowledgments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "pto_balances"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "policy_acknowledgments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          comp_band: Json
          created_at: string
          id: string
          job_family: string | null
          level: string | null
          org_unit_id: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          comp_band?: Json
          created_at?: string
          id?: string
          job_family?: string | null
          level?: string | null
          org_unit_id?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          comp_band?: Json
          created_at?: string
          id?: string
          job_family?: string | null
          level?: string | null
          org_unit_id?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rejection_batches: {
        Row: {
          application_ids: string[]
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          opening_id: string
          requested_by: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          application_ids: string[]
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          opening_id: string
          requested_by?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          application_ids?: string[]
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          opening_id?: string
          requested_by?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rejection_batches_opening_id_fkey"
            columns: ["opening_id"]
            isOneToOne: false
            referencedRelation: "job_openings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rejection_batches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      software_apps: {
        Row: {
          category: string | null
          created_at: string
          id: string
          key: string
          name: string
          sso: boolean
          tenant_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          key: string
          name: string
          sso?: boolean
          tenant_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          key?: string
          name?: string
          sso?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "software_apps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_jobs: {
        Row: {
          attempt: number
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          integration_id: string
          kind: string
          payload: Json
          result: Json
          started_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          attempt?: number
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          integration_id: string
          kind: string
          payload?: Json
          result?: Json
          started_at?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          attempt?: number
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          integration_id?: string
          kind?: string
          payload?: Json
          result?: Json
          started_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_jobs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integration_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_on: string | null
          evidence: Json
          id: string
          kind: string
          owner_user_id: string | null
          run_step_id: string | null
          status: string
          tenant_id: string
          title: string
          worker_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_on?: string | null
          evidence?: Json
          id?: string
          kind?: string
          owner_user_id?: string | null
          run_step_id?: string | null
          status?: string
          tenant_id: string
          title: string
          worker_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_on?: string | null
          evidence?: Json
          id?: string
          kind?: string
          owner_user_id?: string | null
          run_step_id?: string | null
          status?: string
          tenant_id?: string
          title?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_run_step_id_fkey"
            columns: ["run_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_run_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "pto_balances"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "tasks_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          created_at: string
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          settings: Json
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          settings?: Json
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          settings?: Json
          slug?: string
        }
        Relationships: []
      }
      workers: {
        Row: {
          created_at: string
          custom: Json
          employee_number: string | null
          hired_on: string | null
          id: string
          legal_entity_id: string | null
          location_id: string | null
          manager_worker_id: string | null
          org_unit_id: string | null
          person_id: string
          position_id: string | null
          status: string
          tenant_id: string
          terminated_on: string | null
          user_id: string | null
          work_email: string | null
          worker_type: string
        }
        Insert: {
          created_at?: string
          custom?: Json
          employee_number?: string | null
          hired_on?: string | null
          id?: string
          legal_entity_id?: string | null
          location_id?: string | null
          manager_worker_id?: string | null
          org_unit_id?: string | null
          person_id: string
          position_id?: string | null
          status?: string
          tenant_id: string
          terminated_on?: string | null
          user_id?: string | null
          work_email?: string | null
          worker_type?: string
        }
        Update: {
          created_at?: string
          custom?: Json
          employee_number?: string | null
          hired_on?: string | null
          id?: string
          legal_entity_id?: string | null
          location_id?: string | null
          manager_worker_id?: string | null
          org_unit_id?: string | null
          person_id?: string
          position_id?: string | null
          status?: string
          tenant_id?: string
          terminated_on?: string | null
          user_id?: string | null
          work_email?: string | null
          worker_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workers_legal_entity_id_fkey"
            columns: ["legal_entity_id"]
            isOneToOne: false
            referencedRelation: "legal_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workers_manager_worker_id_fkey"
            columns: ["manager_worker_id"]
            isOneToOne: false
            referencedRelation: "pto_balances"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "workers_manager_worker_id_fkey"
            columns: ["manager_worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workers_org_unit_id_fkey"
            columns: ["org_unit_id"]
            isOneToOne: false
            referencedRelation: "org_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workers_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workers_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_definitions: {
        Row: {
          created_at: string
          created_by: string | null
          current_version: number
          description: string | null
          id: string
          key: string
          name: string
          object_type: string
          status: string
          tenant_id: string
          trigger_event: string
          trigger_filter: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_version?: number
          description?: string | null
          id?: string
          key: string
          name: string
          object_type?: string
          status?: string
          tenant_id: string
          trigger_event: string
          trigger_filter?: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_version?: number
          description?: string | null
          id?: string
          key?: string
          name?: string
          object_type?: string
          status?: string
          tenant_id?: string
          trigger_event?: string
          trigger_filter?: Json
        }
        Relationships: [
          {
            foreignKeyName: "workflow_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_run_steps: {
        Row: {
          attempt: number
          error: string | null
          finished_at: string | null
          id: string
          input: Json
          max_attempts: number
          next_retry_at: string | null
          node_id: string
          node_type: string
          output: Json
          run_id: string
          started_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          attempt?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          input?: Json
          max_attempts?: number
          next_retry_at?: string | null
          node_id: string
          node_type: string
          output?: Json
          run_id: string
          started_at?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          attempt?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          input?: Json
          max_attempts?: number
          next_retry_at?: string | null
          node_id?: string
          node_type?: string
          output?: Json
          run_id?: string
          started_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_run_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_run_steps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          context: Json
          current_node: string | null
          definition_id: string
          error: string | null
          finished_at: string | null
          id: string
          started_at: string
          status: string
          subject_id: string | null
          subject_type: string
          tenant_id: string
          triggered_by_event: number | null
          version_id: string
        }
        Insert: {
          context?: Json
          current_node?: string | null
          definition_id: string
          error?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          subject_id?: string | null
          subject_type?: string
          tenant_id: string
          triggered_by_event?: number | null
          version_id: string
        }
        Update: {
          context?: Json
          current_node?: string | null
          definition_id?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          subject_id?: string | null
          subject_type?: string
          tenant_id?: string
          triggered_by_event?: number | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_triggered_by_event_fkey"
            columns: ["triggered_by_event"]
            isOneToOne: false
            referencedRelation: "domain_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "workflow_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_versions: {
        Row: {
          created_at: string
          created_by: string | null
          definition_id: string
          graph: Json
          id: string
          published_at: string | null
          tenant_id: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          definition_id: string
          graph?: Json
          id?: string
          published_at?: string | null
          tenant_id: string
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          definition_id?: string
          graph?: Json
          id?: string
          published_at?: string | null
          tenant_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflow_versions_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      my_payslips: {
        Row: {
          currency: string | null
          deductions: number | null
          gross: number | null
          id: string | null
          net: number | null
          pay_date: string | null
          pay_group: string | null
          period_end: string | null
          period_start: string | null
          run_status: string | null
          taxes: number | null
          tenant_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_run_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pto_balances: {
        Row: {
          accrual_per_month: number | null
          accrued: number | null
          balance: number | null
          country_code: string | null
          full_name: string | null
          hired_on: string | null
          pending: number | null
          tenant_id: string | null
          used: number | null
          user_id: string | null
          worker_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
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
