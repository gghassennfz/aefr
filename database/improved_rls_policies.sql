-- Improved RLS policies for BillsFac Supabase
-- This fixes authentication issues and profile creation problems

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own business" ON businesses;
DROP POLICY IF EXISTS "Users can create own business" ON businesses;
DROP POLICY IF EXISTS "Users can update own business" ON businesses;
DROP POLICY IF EXISTS "Users can manage own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can manage own quotes" ON quotes;
DROP POLICY IF EXISTS "Users can manage own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can manage own clients" ON clients;

-- PROFILES TABLE POLICIES
-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Allow users to create their own profile (critical for signup)
CREATE POLICY "Users can create own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Allow users to delete their own profile
CREATE POLICY "Users can delete own profile" ON profiles
    FOR DELETE USING (auth.uid() = id);

-- BUSINESSES TABLE POLICIES
-- Allow users to view their businesses
CREATE POLICY "Users can view own businesses" ON businesses
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to create businesses
CREATE POLICY "Users can create own businesses" ON businesses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their businesses
CREATE POLICY "Users can update own businesses" ON businesses
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their businesses
CREATE POLICY "Users can delete own businesses" ON businesses
    FOR DELETE USING (auth.uid() = user_id);

-- CLIENTS TABLE POLICIES
CREATE POLICY "Users can manage own clients" ON clients
    FOR ALL USING (auth.uid() = user_id);

-- INVOICES TABLE POLICIES
CREATE POLICY "Users can manage own invoices" ON invoices
    FOR ALL USING (auth.uid() = user_id);

-- QUOTES TABLE POLICIES
CREATE POLICY "Users can manage own quotes" ON quotes
    FOR ALL USING (auth.uid() = user_id);

-- TRANSACTIONS TABLE POLICIES
CREATE POLICY "Users can manage own transactions" ON transactions
    FOR ALL USING (auth.uid() = user_id);

-- Enable realtime for all tables (optional but useful)
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE businesses;
ALTER PUBLICATION supabase_realtime ADD TABLE clients;
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE quotes;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions for anon users (for signup process)
GRANT USAGE ON SCHEMA public TO anon;
GRANT INSERT ON profiles TO anon;
GRANT INSERT ON businesses TO anon;
