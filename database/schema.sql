-- BillsFac Database Schema for Supabase PostgreSQL
-- Schema pour Application SaaS Auto-Entrepreneurs Français

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');
CREATE TYPE transaction_type AS ENUM ('income', 'expense');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'unpaid');
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role user_role DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business information table
CREATE TABLE businesses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    siret TEXT UNIQUE,
    siren TEXT,
    legal_form TEXT,
    activity_code TEXT,
    address TEXT,
    postal_code TEXT,
    city TEXT,
    phone TEXT,
    website TEXT,
    logo_url TEXT,
    vat_number TEXT,
    vat_rate DECIMAL(5,4) DEFAULT 0.20,
    social_security_number TEXT,
    urssaf_number TEXT,
    auto_entrepreneur_regime BOOLEAN DEFAULT true,
    quarterly_declaration BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clients table
CREATE TABLE clients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    company_name TEXT,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    postal_code TEXT,
    city TEXT,
    country TEXT DEFAULT 'France',
    siret TEXT,
    vat_number TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products/Services table
CREATE TABLE products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    unit_price DECIMAL(10,2) NOT NULL,
    unit TEXT DEFAULT 'unité',
    vat_rate DECIMAL(5,4) DEFAULT 0.20,
    category TEXT,
    is_service BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quotes table
CREATE TABLE quotes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    quote_number TEXT UNIQUE NOT NULL,
    title TEXT,
    description TEXT,
    issue_date DATE NOT NULL,
    expiry_date DATE,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status quote_status DEFAULT 'draft',
    notes TEXT,
    terms_conditions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quote items table
CREATE TABLE quote_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    vat_rate DECIMAL(5,4) NOT NULL DEFAULT 0.20,
    total_ht DECIMAL(10,2) NOT NULL,
    total_ttc DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table
CREATE TABLE invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
    invoice_number TEXT UNIQUE NOT NULL,
    title TEXT,
    description TEXT,
    issue_date DATE NOT NULL,
    due_date DATE,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status invoice_status DEFAULT 'draft',
    payment_method TEXT,
    payment_date DATE,
    notes TEXT,
    terms_conditions TEXT,
    pdf_url TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    last_reminder_sent TIMESTAMP WITH TIME ZONE,
    reminder_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice items table
CREATE TABLE invoice_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    vat_rate DECIMAL(5,4) NOT NULL DEFAULT 0.20,
    total_ht DECIMAL(10,2) NOT NULL,
    total_ttc DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table (for accounting)
CREATE TABLE transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    type transaction_type NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    vat_amount DECIMAL(10,2) DEFAULT 0,
    date DATE NOT NULL,
    payment_method TEXT,
    receipt_url TEXT,
    notes TEXT,
    is_deductible BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expense categories table
CREATE TABLE expense_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_deductible BOOLEAN DEFAULT true,
    parent_category_id UUID REFERENCES expense_categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tax declarations table
CREATE TABLE tax_declarations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    quarter INTEGER,
    year INTEGER NOT NULL,
    total_revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_expenses DECIMAL(10,2) NOT NULL DEFAULT 0,
    social_contributions DECIMAL(10,2) NOT NULL DEFAULT 0,
    vat_collected DECIMAL(10,2) NOT NULL DEFAULT 0,
    vat_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
    net_result DECIMAL(10,2) NOT NULL DEFAULT 0,
    declaration_data JSONB,
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fiscal calendar events table
CREATE TABLE fiscal_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    event_type TEXT NOT NULL, -- 'urssaf', 'tva', 'impot', etc.
    is_recurring BOOLEAN DEFAULT true,
    applies_to TEXT[], -- Array of regime types this applies to
    reminder_days INTEGER[] DEFAULT '{30,15,7,1}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User notifications table
CREATE TABLE notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'invoice_overdue', 'tax_deadline', 'payment_received', etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    sent_via_email BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table (Stripe integration)
CREATE TABLE subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT UNIQUE NOT NULL,
    stripe_customer_id TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    plan_price DECIMAL(10,2) NOT NULL,
    billing_cycle TEXT NOT NULL, -- 'monthly', 'yearly'
    status subscription_status NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings table
CREATE TABLE user_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    invoice_template TEXT DEFAULT 'default',
    invoice_numbering_prefix TEXT DEFAULT 'FAC',
    invoice_numbering_format TEXT DEFAULT 'YYYY-NNNN',
    quote_numbering_prefix TEXT DEFAULT 'DEV',
    quote_numbering_format TEXT DEFAULT 'YYYY-NNNN',
    default_payment_terms INTEGER DEFAULT 30,
    default_language TEXT DEFAULT 'fr',
    timezone TEXT DEFAULT 'Europe/Paris',
    email_notifications BOOLEAN DEFAULT true,
    reminder_settings JSONB DEFAULT '{"enabled": true, "days": [30, 15, 7, 1]}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_quotes_user_id ON quotes(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Create functions for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tax_declarations_updated_at BEFORE UPDATE ON tax_declarations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage own business" ON businesses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own clients" ON clients FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own products" ON products FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own quotes" ON quotes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own quote items" ON quote_items FOR ALL USING (auth.uid() IN (SELECT user_id FROM quotes WHERE quotes.id = quote_items.quote_id));
CREATE POLICY "Users can manage own invoices" ON invoices FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own invoice items" ON invoice_items FOR ALL USING (auth.uid() IN (SELECT user_id FROM invoices WHERE invoices.id = invoice_items.invoice_id));
CREATE POLICY "Users can manage own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own tax declarations" ON tax_declarations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own subscriptions" ON subscriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own settings" ON user_settings FOR ALL USING (auth.uid() = user_id);

-- Insert default expense categories
INSERT INTO expense_categories (name, description, is_deductible) VALUES
('Fournitures de bureau', 'Matériel et fournitures de bureau', true),
('Frais de déplacement', 'Transport, hébergement, repas professionnels', true),
('Formation', 'Formations professionnelles', true),
('Assurances', 'Assurance professionnelle, RC, etc.', true),
('Frais bancaires', 'Commissions, frais de virement', true),
('Téléphonie/Internet', 'Abonnements téléphone et internet professionnels', true),
('Logiciels/Abonnements', 'Outils et logiciels professionnels', true),
('Marketing/Publicité', 'Frais de communication et publicité', true),
('Sous-traitance', 'Prestations externes', true),
('Charges sociales', 'Cotisations URSSAF', false);

-- Insert common fiscal events
INSERT INTO fiscal_events (name, description, due_date, event_type, is_recurring, applies_to) VALUES
('Déclaration URSSAF trimestrielle', 'Déclaration et paiement des cotisations sociales', '2024-04-30', 'urssaf', true, '{"auto-entrepreneur"}'),
('Déclaration URSSAF mensuelle', 'Déclaration et paiement des cotisations sociales', '2024-01-31', 'urssaf', true, '{"auto-entrepreneur"}'),
('TVA trimestrielle', 'Déclaration de TVA', '2024-04-30', 'tva', true, '{"entreprise"}'),
('Déclaration revenus', 'Déclaration annuelle des revenus', '2024-05-31', 'impot', true, '{"auto-entrepreneur", "entreprise"}');
