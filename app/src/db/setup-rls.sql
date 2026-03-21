-- Row Level Security setup for HelixPSA
-- Run this after Drizzle creates the tables

-- Enable RLS on all multi-tenant tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Organizations - users can only see their own organization
CREATE POLICY "organization_isolation" ON organizations
    FOR ALL
    USING (id = current_organization_id());

-- Users - can only see users from their organization
CREATE POLICY "users_organization_isolation" ON users
    FOR ALL
    USING (organization_id = current_organization_id());

-- Clients - can only see clients from their organization
CREATE POLICY "clients_organization_isolation" ON clients
    FOR ALL
    USING (organization_id = current_organization_id());

-- Contacts - can only see contacts from their organization
CREATE POLICY "contacts_organization_isolation" ON contacts
    FOR ALL
    USING (organization_id = current_organization_id());

-- Tickets - can only see tickets from their organization
CREATE POLICY "tickets_organization_isolation" ON tickets
    FOR ALL
    USING (organization_id = current_organization_id());

-- Time entries - can only see time entries from their organization
CREATE POLICY "time_entries_organization_isolation" ON time_entries
    FOR ALL
    USING (organization_id = current_organization_id());

-- Notes - can only see notes from their organization
CREATE POLICY "notes_organization_isolation" ON notes
    FOR ALL
    USING (organization_id = current_organization_id());