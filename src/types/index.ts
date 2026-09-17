import type { Role } from "@prisma/client";

export type SafeUser = {
  id: number;
  username: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: Date;
};

export type PatientWithStats = {
  id: number;
  full_name: string;
  birth_date: Date | null;
  phone: string | null;
  created_at: Date;
  last_visit: Date | null;
  total_payment: number;
};

export type VisitWithRelations = {
  id: number;
  patient_id: number;
  doctor_id: number;
  diagnosis: string | null;
  visit_date: Date;
  performed_work: string | null;
  payment_amount: number | null;
  complications: string | null;
  additional_info: string | null;
  created_at: Date;
  patient: { id: number; full_name: string };
  doctor: { id: number; full_name: string };
};
