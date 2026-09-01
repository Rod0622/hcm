/* Hand-maintained database types — keep in sync with supabase/migrations. */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type RequestType = "pto" | "unpaid" | "offset";
export type RequestStatus = "pending" | "approved" | "denied" | "cancelled";
export type Role = "admin" | "employee";

export type Profile = {
  id: string;
  username: string;
  full_name: string;
  role: Role;
  date_hired: string | null;
  active: boolean;
  created_at: string;
};

export type PtoRequest = {
  id: string;
  user_id: string;
  type: RequestType;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  proof_path: string | null;
  offset_date: string | null;
  status: RequestStatus;
  admin_note: string | null;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
};

export type Announcement = {
  id: string;
  title: string;
  body: string | null;
  media_path: string | null;
  media_type: "image" | "video" | null;
  created_by: string | null;
  expires_at: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export type AppSettings = {
  id: boolean;
  cutoff_anchor: string;
  cutoff_days: number;
  hours_per_cutoff: number;
  pay_delay_days: number;
  monthly_accrual: number;
};

export type Balance = {
  accrued: number;
  used: number;
  pending: number;
  available: number;
};

export type CalendarEntry = {
  id: string;
  user_id: string;
  full_name: string;
  type: RequestType;
  status: RequestStatus;
  start_date: string;
  end_date: string;
  offset_date: string | null;
};

export type DirectoryEntry = { id: string; full_name: string; username: string };

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & Pick<Profile, "id" | "username" | "full_name">;
        Update: Partial<Profile>;
        Relationships: [];
      };
      pto_requests: {
        Row: PtoRequest;
        Insert: Partial<PtoRequest> &
          Pick<PtoRequest, "user_id" | "type" | "start_date" | "end_date">;
        Update: Partial<PtoRequest>;
        Relationships: [
          {
            foreignKeyName: "pto_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      announcements: {
        Row: Announcement;
        Insert: Partial<Announcement> & Pick<Announcement, "title">;
        Update: Partial<Announcement>;
        Relationships: [];
      };
      app_settings: {
        Row: AppSettings;
        Insert: Partial<AppSettings>;
        Update: Partial<AppSettings>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      business_days: { Args: { d1: string; d2: string }; Returns: number };
      accrued_credits: { Args: { hired: string }; Returns: number };
      pto_balance: { Args: { target: string }; Returns: Balance[] };
      calendar_entries: {
        Args: { from_date: string; to_date: string };
        Returns: CalendarEntry[];
      };
      employee_directory: { Args: Record<string, never>; Returns: DirectoryEntry[] };
    };
    Enums: {
      pto_request_type: RequestType;
      pto_request_status: RequestStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
