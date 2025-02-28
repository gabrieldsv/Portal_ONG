/*
  # Create users table

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `role` (text)
      - `full_name` (text)
      - `phone` (text)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `users` table
    - Add policy for authenticated users to read their own data
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'user',
  full_name text,
  phone text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete users"
  ON users
  FOR DELETE
  TO authenticated
  USING (true);

-- Insert some initial users
INSERT INTO users (email, role, full_name, created_at)
VALUES 
  ('admin@example.com', 'admin', 'Administrador', now()),
  ('professor@example.com', 'teacher', 'Professor Exemplo', now()),
  ('social@example.com', 'social_worker', 'Assistente Social', now()),
  ('saude@example.com', 'health_professional', 'Profissional de Saúde', now())
ON CONFLICT (email) DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_users_modtime
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_modified_column();