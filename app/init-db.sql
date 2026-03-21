-- Initialize database for HelixPSA with row-level security

-- Enable Row Level Security extension if needed
-- This is included by default in PostgreSQL 9.5+

-- Note: RLS policies will be added after Drizzle creates the tables
-- This file is for initial database setup

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create helper function for RLS policies
CREATE OR REPLACE FUNCTION current_organization_id()
RETURNS UUID AS $$
BEGIN
    -- This will be used in RLS policies to filter by organization
    -- The org_id should come from the session/JWT token
    RETURN current_setting('app.current_organization_id', true)::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;