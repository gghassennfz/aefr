import { supabase } from './supabase';
import { Database } from './database.types';

type Invoice = Database['public']['Tables']['invoices']['Row'];
type InvoiceInsert = Database['public']['Tables']['invoices']['Insert'];
type InvoiceUpdate = Database['public']['Tables']['invoices']['Update'];
type InvoiceItem = Database['public']['Tables']['invoice_items']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];

export interface InvoiceWithItems extends Invoice {
  invoice_items: InvoiceItem[];
  clients: Client | null;
}

export interface InvoiceFormData {
  client_id: string;
  title?: string;
  description?: string;
  issue_date: string;
  due_date?: string;
  notes?: string;
  terms_conditions?: string;
  items: {
    description: string;
    quantity: number;
    unit_price: number;
    vat_rate: number;
  }[];
}

// Generate next invoice number
export const generateInvoiceNumber = async (userId: string): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const prefix = 'FAC';
  
  // Get the last invoice number for this year
  const { data: lastInvoice } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('user_id', userId)
    .like('invoice_number', `${prefix}-${currentYear}-%`)
    .order('invoice_number', { ascending: false })
    .limit(1);

  let nextNumber = 1;
  if (lastInvoice && lastInvoice.length > 0) {
    const lastNumber = lastInvoice[0].invoice_number;
    const numberPart = lastNumber.split('-')[2];
    nextNumber = parseInt(numberPart) + 1;
  }

  return `${prefix}-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
};

// Calculate invoice totals
export const calculateInvoiceTotals = (items: InvoiceFormData['items']) => {
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

// Create invoice
export const createInvoice = async (userId: string, data: InvoiceFormData): Promise<string> => {
  const invoiceNumber = await generateInvoiceNumber(userId);
  const totals = calculateInvoiceTotals(data.items);
  
  // Create invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      user_id: userId,
      client_id: data.client_id,
      invoice_number: invoiceNumber,
      title: data.title,
      description: data.description,
      issue_date: data.issue_date,
      due_date: data.due_date,
      subtotal: totals.subtotal,
      vat_amount: totals.vatAmount,
      total_amount: totals.total,
      notes: data.notes,
      terms_conditions: data.terms_conditions,
      status: 'draft'
    })
    .select()
    .single();

  if (invoiceError) throw invoiceError;

  // Create invoice items
  const invoiceItems = data.items.map(item => ({
    invoice_id: invoice.id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    vat_rate: item.vat_rate,
    total_ht: item.quantity * item.unit_price,
    total_ttc: item.quantity * item.unit_price * (1 + item.vat_rate)
  }));

  const { error: itemsError } = await supabase
    .from('invoice_items')
    .insert(invoiceItems);

  if (itemsError) throw itemsError;

  return invoice.id;
};

// Update invoice
export const updateInvoice = async (invoiceId: string, data: Partial<InvoiceFormData>): Promise<void> => {
  const totals = data.items ? calculateInvoiceTotals(data.items) : undefined;
  
  const updateData: InvoiceUpdate = {
    title: data.title,
    description: data.description,
    issue_date: data.issue_date,
    due_date: data.due_date,
    notes: data.notes,
    terms_conditions: data.terms_conditions,
    updated_at: new Date().toISOString()
  };

  if (totals) {
    updateData.subtotal = totals.subtotal;
    updateData.vat_amount = totals.vatAmount;
    updateData.total_amount = totals.total;
  }

  const { error: invoiceError } = await supabase
    .from('invoices')
    .update(updateData)
    .eq('id', invoiceId);

  if (invoiceError) throw invoiceError;

  // Update items if provided
  if (data.items) {
    // Delete existing items
    await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', invoiceId);

    // Insert new items
    const invoiceItems = data.items.map(item => ({
      invoice_id: invoiceId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      vat_rate: item.vat_rate,
      total_ht: item.quantity * item.unit_price,
      total_ttc: item.quantity * item.unit_price * (1 + item.vat_rate)
    }));

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(invoiceItems);

    if (itemsError) throw itemsError;
  }
};

// Get invoice with items
export const getInvoiceWithItems = async (invoiceId: string): Promise<InvoiceWithItems | null> => {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      invoice_items(*),
      clients(*)
    `)
    .eq('id', invoiceId)
    .single();

  if (error) throw error;
  return data as InvoiceWithItems;
};

// Get user invoices
export const getUserInvoices = async (userId: string, filters?: {
  status?: string;
  client_id?: string;
  limit?: number;
  offset?: number;
}): Promise<InvoiceWithItems[]> => {
  let query = supabase
    .from('invoices')
    .select(`
      *,
      invoice_items(*),
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
  
  return data as InvoiceWithItems[];
};

// Update invoice status
export const updateInvoiceStatus = async (invoiceId: string, status: string): Promise<void> => {
  const updateData: InvoiceUpdate = {
    status: status as any,
    updated_at: new Date().toISOString()
  };

  if (status === 'paid') {
    updateData.payment_date = new Date().toISOString().split('T')[0];
    updateData.paid_amount = 0; // Will be updated with actual amount
  }

  if (status === 'sent') {
    updateData.sent_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('invoices')
    .update(updateData)
    .eq('id', invoiceId);

  if (error) throw error;
};

// Delete invoice
export const deleteInvoice = async (invoiceId: string): Promise<void> => {
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId);

  if (error) throw error;
};

// Mark invoice as paid
export const markInvoiceAsPaid = async (invoiceId: string, paidAmount: number, paymentMethod?: string): Promise<void> => {
  const { error } = await supabase
    .from('invoices')
    .update({
      status: 'paid',
      paid_amount: paidAmount,
      payment_method: paymentMethod,
      payment_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    })
    .eq('id', invoiceId);

  if (error) throw error;
};

// Send payment reminder
export const sendPaymentReminder = async (invoiceId: string): Promise<void> => {
  const { error } = await supabase
    .from('invoices')
    .update({
      last_reminder_sent: new Date().toISOString(),
      reminder_count: supabase.sql`reminder_count + 1`,
      updated_at: new Date().toISOString()
    })
    .eq('id', invoiceId);

  if (error) throw error;
};

// Get overdue invoices
export const getOverdueInvoices = async (userId: string): Promise<InvoiceWithItems[]> => {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      invoice_items(*),
      clients(*)
    `)
    .eq('user_id', userId)
    .in('status', ['sent'])
    .lt('due_date', today);

  if (error) throw error;
  return data as InvoiceWithItems[];
};

// Generate invoice PDF data
export const generateInvoicePDFData = (invoice: InvoiceWithItems, business: any) => {
  return {
    invoice,
    business,
    client: invoice.clients,
    items: invoice.invoice_items,
    totals: {
      subtotal: invoice.subtotal,
      vatAmount: invoice.vat_amount,
      total: invoice.total_amount
    }
  };
};
