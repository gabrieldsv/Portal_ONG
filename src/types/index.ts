export interface Student {
  id: string;
  full_name: string;
  birth_date: string;
  age: number;
  address: string;
  cpf: string;
  nis: string;
  phone: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Guardian {
  id: string;
  student_id: string;
  full_name: string;
  cpf: string;
  phone: string;
  email: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  workload_hours: number;
  executive_manager: string;
  volunteer_manager: string;
  educational_advisor: string;
  shift: 'morning' | 'afternoon' | 'evening';
  available_spots: number;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrollment_date: string;
  status: 'active' | 'locked' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  enrollment_id: string;
  date: string;
  status: 'present' | 'absent';
  absence_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface TeacherAttendance {
  id: string;
  teacher_id: string;
  date: string;
  check_in: string;
  check_out: string;
  created_at: string;
  updated_at: string;
}

export interface LessonPlan {
  id: string;
  teacher_id: string;
  course_id: string;
  date: string;
  content: string;
  objectives: string;
  resources: string;
  evaluation: string;
  created_at: string;
  updated_at: string;
}

export interface SocialAssistanceRecord {
  id: string;
  student_id: string;
  date: string;
  identified_needs: string[];
  referrals: string[];
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface HealthRecord {
  id: string;
  student_id: string;
  record_type: 'dental' | 'psychological' | 'nutritional' | 'medical';
  date: string;
  professional_name: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DentalRecord extends HealthRecord {
  dental_history: string;
  hygiene_habits: string;
  previous_treatments: string;
}

export interface PsychologicalRecord extends HealthRecord {
  emotional_history: string;
  behavior_assessment: string;
  diagnosis: string;
  referrals: string;
  observations: string;
}

export interface NutritionalRecord extends HealthRecord {
  nutritional_assessment: string;
  eating_habits: string;
  bmi: number;
  suggested_meal_plan: string;
}

export interface MedicalRecord extends HealthRecord {
  clinical_history: string;
  allergies: string[];
  medications: string[];
  preexisting_conditions: string[];
}

export interface Teacher {
  id: string;
  full_name: string;
  cpf: string;
  phone: string;
  email: string;
  specialty: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'teacher' | 'social_worker' | 'health_professional';
  created_at: string;
}