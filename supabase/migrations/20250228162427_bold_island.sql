/*
  # Create events table

  1. New Tables
    - `events`
      - `id` (uuid, primary key)
      - `title` (text, not null)
      - `description` (text)
      - `date` (date, not null)
      - `time` (text)
      - `location` (text)
      - `created_at` (timestamptz)
  2. Security
    - Enable RLS on `events` table
    - Add policies for authenticated users to manage events
*/

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  date date NOT NULL,
  time text,
  location text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read events"
  ON events
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete events"
  ON events
  FOR DELETE
  TO authenticated
  USING (true);

-- Create a function to create the events table if it doesn't exist
CREATE OR REPLACE FUNCTION create_events_table()
RETURNS void AS $$
BEGIN
  -- Check if the events table already exists
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'events'
  ) THEN
    -- Create the events table
    EXECUTE '
      CREATE TABLE events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title text NOT NULL,
        description text,
        date date NOT NULL,
        time text,
        location text,
        created_at timestamptz DEFAULT now()
      );

      ALTER TABLE events ENABLE ROW LEVEL SECURITY;

      CREATE POLICY "Users can read events"
        ON events
        FOR SELECT
        TO authenticated
        USING (true);

      CREATE POLICY "Users can insert events"
        ON events
        FOR INSERT
        TO authenticated
        WITH CHECK (true);

      CREATE POLICY "Users can update events"
        ON events
        FOR UPDATE
        TO authenticated
        USING (true);

      CREATE POLICY "Users can delete events"
        ON events
        FOR DELETE
        TO authenticated
        USING (true);
    ';
  END IF;
END;
$$ LANGUAGE plpgsql;