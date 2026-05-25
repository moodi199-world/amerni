export type UserRole = 'user' | 'worker' | 'admin';
export type TaskStatus = 'pending' | 'ai_processing' | 'waiting_for_worker' | 'in_progress' | 'completed' | 'disputed' | 'cancelled';
export type TaskCategory = 'Admin' | 'Design' | 'Research' | 'Personal' | 'Business' | 'Legal' | 'Tech' | 'Writing' | 'Other';
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'urgent';
export type VerificationLevel = 'none' | 'basic' | 'verified' | 'trusted';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  phone: string;
  role: UserRole;
  phone_verified: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export type AvailabilityStatus = 'online' | 'busy' | 'offline';

export interface WorkerProfile {
  id: string;
  user_id: string;
  full_name: string;
  bio: string;
  skills: string[];
  verification_level: VerificationLevel;
  national_id_uploaded: boolean;
  is_approved: boolean;
  total_earnings: number;
  completed_tasks: number;
  rating: number;
  is_online: boolean;
  city: string;
  nationality: string;
  phone: string;
  availability_status: AvailabilityStatus;
  task_preferences: string[];
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'task_accepted' | 'new_message' | 'task_completed' | 'new_task' | 'info';
  title: string;
  body: string;
  task_id: string | null;
  read: boolean;
  created_at: string;
}

export type NegotiationStatus = 'pending' | 'accepted' | 'rejected';

export interface Task {
  id: string;
  user_id: string;
  worker_id: string | null;
  title: string;
  original_request: string;
  description: string;
  category: TaskCategory;
  status: TaskStatus;
  urgency: UrgencyLevel;
  estimated_price_min: number;
  estimated_price_max: number;
  client_price: number;
  worker_price: number | null;
  negotiation_status: NegotiationStatus | null;
  final_price: number | null;
  deadline: string | null;
  requires_verification: boolean;
  ai_processed: boolean;
  ai_price_min: number | null;
  ai_price_max: number | null;
  ai_price_label: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  worker?: Profile;
}

export interface TaskMessage {
  id: string;
  task_id: string;
  sender_id: string;
  content: string;
  is_system_message: boolean;
  created_at: string;
  profiles?: Profile;
}

export interface TaskFile {
  id: string;
  task_id: string;
  uploader_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  is_locked: boolean;
  lock_reason: string | null;
  unlocked_at: string | null;
  created_at: string;
}

export interface ParsedTask {
  title: string;
  category: TaskCategory;
  description: string;
  suggested_price_min: number;
  suggested_price_max: number;
  urgency: UrgencyLevel;
  requires_verification: boolean;
  estimated_hours: number;
}
