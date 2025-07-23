import { supabase } from './supabase';
import { Database } from './database.types';

type Quote = Database['public']['Tables']['quotes']['Row'];
type QuoteInsert = Database['public']['Tables']['quotes']['Insert'];
type QuoteUpdate = Database['public']['Tables']['quotes']['Update'];
type QuoteItem = Database['public']['Tables']['quote_items']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];

export interface QuoteWithItems extends Quote {
  quote_items: QuoteItem[];
  clients: Client | null;
}

export interface QuoteFormData {
  client_id: string;
  title?: string;
  description?: string;
  issue_date: string;
  expiry_date?: string;
  notes?: string;
  terms_conditions?: string;
  items: {
    description: string;
    quantity: number;
    unit_price: number;
    vat_rate: number;
  }[];
}

// Generate next quote number
export const generateQuoteNumber = async (userId: string): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const prefix = 'DEV';
  
  // Get the last quote number for this year
  const { data: lastQuote } = await supabase
    .from('quotes')
    .select('quote_number')
    .eq('user_id', userId)
    .like('quote_number', `${prefix}-${currentYear}-%`)
    .order('quote_number', { ascending: false })
    .limit(1);

  let nextNumber = 1;
  if (lastQuote && lastQuote.length > 0) {
    const lastNumber = lastQuote[0].quote_number;
    const numberPart = lastNumber.split('-')[2];
    nextNumber = parseInt(numberPart) + 1;
  }

  return `${prefix}-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
};

// Calculate quote totals
export const calculateQuoteTotals = (items: QuoteFormData['items']) => {
  let subtotal = 0;
  let vatAmount = 0;

  items.forEach(item => {
    const itemTotal = item.quantity * item.unit_price;
    subtotal += itemTotal;
    vatAmount += itemTotal * item.vat_rate;
  });

  return {
    subtotal,
    vatAmount,
    total: subtotal + vatAmount
  };
};

// Create quote
export const createQuote = async (userId: string, data: QuoteFormData): Promise<string> => {
  const quoteNumber = await generateQuoteNumber(userId);
  const totals = calculateQuoteTotals(data.items);
  
  // Create quote
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .insert({
      user_id: userId,
      client_id: data.client_id,
      quote_number: quoteNumber,
      title: data.title,
      description: data.description,
      issue_date: data.issue_date,
      expiry_date: data.expiry_date,
      subtotal: totals.subtotal,
      vat_amount: totals.vatAmount,
      total_amount: totals.total,
      notes: data.notes,
      terms_conditions: data.terms_conditions,
      status: 'draft'
    })
    .select()
    .single();

  if (quoteError) throw quoteError;

  // Create quote items
  const quoteItems = data.items.map(item => ({
    quote_id: quote.id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    vat_rate: item.vat_rate,
    total_ht: item.quantity * item.unit_price,
    total_ttc: item.quantity * item.unit_price * (1 + item.vat_rate)
  }));

  const { error: itemsError } = await supabase
    .from('quote_items')
    .insert(quoteItems);

  if (itemsError) throw itemsError;

  return quote.id;
};

// Update quote
export const updateQuote = async (quoteId: string, data: Partial<QuoteFormData>): Promise<void> => {
  const totals = data.items ? calculateQuoteTotals(data.items) : undefined;
  
  const updateData: QuoteUpdate = {
    title: data.title,
    description: data.description,
    issue_date: data.issue_date,
    expiry_date: data.expiry_date,
    notes: data.notes,
    terms_conditions: data.terms_conditions,
    updated_at: new Date().toISOString()
  };

  if (totals) {
    updateData.subtotal = totals.subtotal;
    updateData.vat_amount = totals.vatAmount;
    updateData.total_amount = totals.total;
  }

  const { error: quoteError } = await supabase
    .from('quotes')
    .update(updateData)
    .eq('id', quoteId);

  if (quoteError) throw quoteError;

  // Update items if provided
  if (data.items) {
    // Delete existing items
    await supabase
      .from('quote_items')
      .delete()
      .eq('quote_id', quoteId);

    // Insert new items
    const quoteItems = data.items.map(item => ({
      quote_id: quoteId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      vat_rate: item.vat_rate,
      total_ht: item.quantity * item.unit_price,
      total_ttc: item.quantity * item.unit_price * (1 + item.vat_rate)
    }));

    const { error: itemsError } = await supabase
      .from('quote_items')
      .insert(quoteItems);

    if (itemsError) throw itemsError;
  }
};

// Get quote with items
export const getQuoteWithItems = async (quoteId: string): Promise<QuoteWithItems | null> => {
  const { data, error } = await supabase
    .from('quotes')
    .select(`
      *,
      quote_items(*),
      clients(*)
    `)
    .eq('id', quoteId)
    .single();

  if (error) throw error;
  return data as QuoteWithItems;
};

// Get user quotes
export const getUserQuotes = async (userId: string, filters?: {
  status?: string;
  client_id?: string;
  limit?: number;
  offset?: number;
}): Promise<QuoteWithItems[]> => {
  let query = supabase
    .from('quotes')
    .select(`
      *,
      quote_items(*),
      clients(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.client_id) {
    query = query.eq('client_id', filters.client_id);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  return data as QuoteWithItems[];
};

// Update quote status
export const updateQuoteStatus = async (quoteId: string, status: string): Promise<void> => {
  const updateData: QuoteUpdate = {
    status: status as any,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('quotes')
    .update(updateData)
    .eq('id', quoteId);

  if (error) throw error;
};

// Delete quote
export const deleteQuote = async (quoteId: string): Promise<void> => {
  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', quoteId);

  if (error) throw error;
};

// Convert quote to invoice
export const convertQuoteToInvoice = async (quoteId: string): Promise<string> => {
  const quote = await getQuoteWithItems(quoteId);
  if (!quote) throw new Error('Quote not found');

  // Generate invoice number
  const currentYear = new Date().getFullYear();
  const prefix = 'FAC';
  
  const { data: lastInvoice } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('user_id', quote.user_id)
    .like('invoice_number', `${prefix}-${currentYear}-%`)
    .order('invoice_number', { ascending: false })
    .limit(1);

  let nextNumber = 1;
  if (lastInvoice && lastInvoice.length > 0) {
    const lastNumber = lastInvoice[0].invoice_number;
    const numberPart = lastNumber.split('-')[2];
    nextNumber = parseInt(numberPart) + 1;
  }

  const invoiceNumber = `${prefix}-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;

  // Create invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      user_id: quote.user_id,
      client_id: quote.client_id,
      quote_id: quote.id,
      invoice_number: invoiceNumber,
      title: quote.title,
      description: quote.description,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: quote.expiry_date,
      subtotal: quote.subtotal,
      vat_amount: quote.vat_amount,
      total_amount: quote.total_amount,
      notes: quote.notes,
      terms_conditions: quote.terms_conditions,
      status: 'draft'
    })
    .select()
    .single();

  if (invoiceError) throw invoiceError;

  // Create invoice items
  const invoiceItems = quote.quote_items.map(item => ({
    invoice_id: invoice.id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    vat_rate: item.vat_rate,
    total_ht: item.total_ht,
    total_ttc: item.total_ttc
  }));

  const { error: itemsError } = await supabase
    .from('invoice_items')
    .insert(invoiceItems);

  if (itemsError) throw itemsError;

  // Update quote status to accepted
  await updateQuoteStatus(quoteId, 'accepted');

  return invoice.id;
};

// Get expired quotes
export const getExpiredQuotes = async (userId: string): Promise<QuoteWithItems[]> => {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('quotes')
    .select(`
      *,
      quote_items(*),
      clients(*)
    `)
    .eq('user_id', userId)
    .in('status', ['draft', 'sent'])
    .lt('expiry_date', today);

  if (error) throw error;
  return data as QuoteWithItems[];
};

// Get quotes expiring soon
export const getQuotesExpiringSoon = async (userId: string, days: number = 7): Promise<QuoteWithItems[]> => {
  const today = new Date();
  const futureDate = new Date(today.getTime() + (days * 24 * 60 * 60 * 1000));
  
  const { data, error } = await supabase
    .from('quotes')
    .select(`
      *,
      quote_items(*),
      clients(*)
    `)
    .eq('user_id', userId)
    .in('status', ['draft', 'sent'])
    .gte('expiry_date', today.toISOString().split('T')[0])
    .lte('expiry_date', futureDate.toISOString().split('T')[0]);

  if (error) throw error;
  return data as QuoteWithItems[];
};

// Generate quote PDF data
export const generateQuotePDFData = (quote: QuoteWithItems, business: any) => {
  return {
    quote,
    business,
    client: quote.clients,
    items: quote.quote_items,
    totals: {
      subtotal: quote.subtotal,
      vatAmount: quote.vat_amount,
      total: quote.total_amount
    }
  };
};
