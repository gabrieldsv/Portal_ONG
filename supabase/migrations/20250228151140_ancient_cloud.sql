/*
  # Initial Schema for ONG Amar Sem Limites

  1. New Tables
    - `students` - Stores student information
    - `guardians` - Stores information about student guardians/parents
    - `courses` - Stores course information
    - `enrollments` - Tracks student enrollment in courses
    - `attendance_students` - Tracks student attendance
    - `attendance_teachers` - Tracks teacher attendance
    - `lesson_plans` - Stores lesson plans created by teachers
    - `social_assistance_records` - Stores social assistance records
    - `health_records` - Stores health records (dental, psychological, nutritional, medical)
    - `teachers` - Stores teacher information
    
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  birth_date date NOT NULL,
  age integer NOT NULL,
  address text NOT NULL,
  cpf text UNIQUE NOT NULL,
  nis text,
  phone text NOT NULL,
  email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read students"
  ON students
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert students"
  ON students
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update students"
  ON students
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete students"
  ON students
  FOR DELETE
  TO authenticated
  USING (true);

-- Guardians table
CREATE TABLE IF NOT EXISTS guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  cpf text NOT NULL,
  phone text NOT NULL,
  email text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read guardians"
  ON guardians
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert guardians"
  ON guardians
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update guardians"
  ON guardians
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete guardians"
  ON guardians
  FOR DELETE
  TO authenticated
  USING (true);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  workload_hours integer NOT NULL,
  executive_manager text NOT NULL,
  volunteer_manager text NOT NULL,
  educational_advisor text NOT NULL,
  shift text NOT NULL CHECK (shift IN ('morning', 'afternoon', 'evening')),
  available_spots integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read courses"
  ON courses
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert courses"
  ON courses
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update courses"
  ON courses
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete courses"
  ON courses
  FOR DELETE
  TO authenticated
  USING (true);

-- Enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrollment_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'locked', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, course_id)
);

ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read enrollments"
  ON enrollments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert enrollments"
  ON enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update enrollments"
  ON enrollments
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete enrollments"
  ON enrollments
  FOR DELETE
  TO authenticated
  USING (true);

-- Student Attendance table
CREATE TABLE IF NOT EXISTS attendance_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('present', 'absent')),
  absence_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(enrollment_id, date)
);

ALTER TABLE attendance_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read student attendance"
  ON attendance_students
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert student attendance"
  ON attendance_students
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update student attendance"
  ON attendance_students
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete student attendance"
  ON attendance_students
  FOR DELETE
  TO authenticated
  USING (true);

-- Teachers table
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  cpf text UNIQUE NOT NULL,
  phone text NOT NULL,
  email text,
  specialty text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read teachers"
  ON teachers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert teachers"
  ON teachers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update teachers"
  ON teachers
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete teachers"
  ON teachers
  FOR DELETE
  TO authenticated
  USING (true);

-- Teacher Attendance table
CREATE TABLE IF NOT EXISTS attendance_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  date date NOT NULL,
  check_in time,
  check_out time,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(teacher_id, date)
);

ALTER TABLE attendance_teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read teacher attendance"
  ON attendance_teachers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert teacher attendance"
  ON attendance_teachers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update teacher attendance"
  ON attendance_teachers
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete teacher attendance"
  ON attendance_teachers
  FOR DELETE
  TO authenticated
  USING (true);

-- Lesson Plans table
CREATE TABLE IF NOT EXISTS lesson_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  date date NOT NULL,
  content text NOT NULL,
  objectives text NOT NULL,
  resources text NOT NULL,
  evaluation text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read lesson plans"
  ON lesson_plans
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert lesson plans"
  ON lesson_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update lesson plans"
  ON lesson_plans
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete lesson plans"
  ON lesson_plans
  FOR DELETE
  TO authenticated
  USING (true);

-- Social Assistance Records table
CREATE TABLE IF NOT EXISTS social_assistance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date date NOT NULL,
  identified_needs text[] NOT NULL,
  referrals text[] NOT NULL,
  notes text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE social_assistance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read social assistance records"
  ON social_assistance_records
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert social assistance records"
  ON social_assistance_records
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update social assistance records"
  ON social_assistance_records
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete social assistance records"
  ON social_assistance_records
  FOR DELETE
  TO authenticated
  USING (true);

-- Health Records table
CREATE TABLE IF NOT EXISTS health_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  record_type text NOT NULL CHECK (record_type IN ('dental', 'psychological', 'nutritional', 'medical')),
  date date NOT NULL,
  professional_name text NOT NULL,
  notes text NOT NULL,
  
  -- Dental specific fields
  dental_history text,
  hygiene_habits text,
  previous_treatments text,
  
  -- Psychological specific fields
  emotional_history text,
  behavior_assessment text,
  diagnosis text,
  referrals text,
  observations text,
  
  -- Nutritional specific fields
  nutritional_assessment text,
  eating_habits text,
  bmi numeric,
  suggested_meal_plan text,
  
  -- Medical specific fields
  clinical_history text,
  allergies text[],
  medications text[],
  preexisting_conditions text[],
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read health records"
  ON health_records
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert health records"
  ON health_records
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update health records"
  ON health_records
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete health records"
  ON health_records
  FOR DELETE
  TO authenticated
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables to update updated_at
CREATE TRIGGER update_students_modtime
BEFORE UPDATE ON students
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_guardians_modtime
BEFORE UPDATE ON guardians
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_courses_modtime
BEFORE UPDATE ON courses
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_enrollments_modtime
BEFORE UPDATE ON enrollments
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_attendance_students_modtime
BEFORE UPDATE ON attendance_students
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_teachers_modtime
BEFORE UPDATE ON teachers
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_attendance_teachers_modtime
BEFORE UPDATE ON attendance_teachers
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_lesson_plans_modtime
BEFORE UPDATE ON lesson_plans
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_social_assistance_records_modtime
BEFORE UPDATE ON social_assistance_records
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_health_records_modtime
BEFORE UPDATE ON health_records
FOR EACH ROW EXECUTE FUNCTION update_modified_column();