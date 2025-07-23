-- Fix RLS policies to allow authenticated users to create profiles and businesses
-- Run this in your Supabase SQL Editor

-- Enable RLS on profiles table (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can create own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Enable RLS on businesses table (if not already enabled)
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own business" ON businesses;
DROP POLICY IF EXISTS "Users can create own business" ON businesses;
DROP POLICY IF EXISTS "Users can update own business" ON businesses;

-- Create new policies for businesses
CREATE POLICY "Users can view own business" ON businesses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own business" ON businesses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own business" ON businesses
    FOR UPDATE USING (auth.uid() = user_id);

-- Also add policies for other tables that might need them
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Invoices policies
DROP POLICY IF EXISTS "Users can manage own invoices" ON invoices;
CREATE POLICY "Users can manage own invoices" ON invoices
    FOR ALL USING (auth.uid() = user_id);

-- Quotes policies  
DROP POLICY IF EXISTS "Users can manage own quotes" ON quotes;
CREATE POLICY "Users can manage own quotes" ON quotes
    FOR ALL USING (auth.uid() = user_id);

-- Transactions policies
DROP POLICY IF EXISTS "Users can manage own transactions" ON transactions;
CREATE POLICY "Users can manage own transactions" ON transactions
    FOR ALL USING (auth.uid() = user_id);

