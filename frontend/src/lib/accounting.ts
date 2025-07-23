import { supabase } from './supabase';
import { Database } from './database.types';

type Transaction = Database['public']['Tables']['transactions']['Row'];
type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];
type TransactionUpdate = Database['public']['Tables']['transactions']['Update'];

export interface TransactionFormData {
  type: 'income' | 'expense';
  category: string;
  subcategory?: string;
  description: string;
  amount: number;
  vat_amount?: number;
  date: string;
  payment_method?: string;
  receipt_url?: string;
  notes?: string;
  is_deductible?: boolean;
}

export interface AccountingSummary {
  totalIncome: number;
  totalExpenses: number;
  netResult: number;
  totalVatCollected: number;
  totalVatPaid: number;
  deductibleExpenses: number;
  nonDeductibleExpenses: number;
  socialContributions: number;
}

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  netResult: number;
}

export interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
  transactions: number;
}

// Default expense categories for French auto-entrepreneurs
export const DEFAULT_EXPENSE_CATEGORIES = [
  {
    name: 'Fournitures de bureau',
    description: 'Matériel et fournitures de bureau',
    is_deductible: true,
    subcategories: ['Papeterie', 'Matériel informatique', 'Mobilier']
  },
  {
    name: 'Frais de déplacement',
    description: 'Transport, hébergement, repas professionnels',
    is_deductible: true,
    subcategories: ['Transport', 'Hébergement', 'Repas', 'Carburant']
  },
  {
    name: 'Formation',
    description: 'Formations professionnelles',
    is_deductible: true,
    subcategories: ['Formations', 'Livres', 'Conférences']
  },
  {
    name: 'Assurances',
    description: 'Assurance professionnelle, RC, etc.',
    is_deductible: true,
    subcategories: ['Assurance RC', 'Assurance matériel', 'Mutuelle']
  },
  {
    name: 'Frais bancaires',
    description: 'Commissions, frais de virement',
    is_deductible: true,
    subcategories: ['Frais de tenue de compte', 'Commissions', 'Virements']
  },
  {
    name: 'Téléphonie/Internet',
    description: 'Abonnements téléphone et internet professionnels',
    is_deductible: true,
    subcategories: ['Téléphone', 'Internet', 'Hébergement web']
  },
  {
    name: 'Logiciels/Abonnements',
    description: 'Outils et logiciels professionnels',
    is_deductible: true,
    subcategories: ['Logiciels', 'SaaS', 'Licences']
  },
  {
    name: 'Marketing/Publicité',
    description: 'Frais de communication et publicité',
    is_deductible: true,
    subcategories: ['Publicité en ligne', 'Communication', 'Site web']
  },
  {
    name: 'Sous-traitance',
    description: 'Prestations externes',
    is_deductible: true,
    subcategories: ['Freelances', 'Prestations', 'Conseil']
  },
  {
    name: 'Charges sociales',
    description: 'Cotisations URSSAF',
    is_deductible: false,
    subcategories: ['URSSAF', 'Retraite', 'Maladie']
  },
  {
    name: 'Autres',
    description: 'Autres dépenses',
    is_deductible: true,
    subcategories: ['Divers']
  }
];

export const INCOME_CATEGORIES = [
  'Prestations de services',
  'Vente de produits',
  'Consultation',
  'Formation',
  'Licence/Royalties',
  'Autre'
];

export const PAYMENT_METHODS = [
  'Virement bancaire',
  'Chèque',
  'Espèces',
  'Carte bancaire',
  'Prélèvement',
  'PayPal',
  'Autre'
];

// Create transaction
export const createTransaction = async (userId: string, data: TransactionFormData): Promise<string> => {
  const { data: transaction, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: data.type,
      category: data.category,
      subcategory: data.subcategory,
      description: data.description,
      amount: data.amount,
      vat_amount: data.vat_amount || 0,
      date: data.date,
      payment_method: data.payment_method,
      receipt_url: data.receipt_url,
      notes: data.notes,
      is_deductible: data.is_deductible || false
    })
    .select()
    .single();

  if (error) throw error;
  return transaction.id;
};

// Update transaction
export const updateTransaction = async (transactionId: string, data: Partial<TransactionFormData>): Promise<void> => {
  const { error } = await supabase
    .from('transactions')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', transactionId);

  if (error) throw error;
};

// Get user transactions
export const getUserTransactions = async (userId: string, filters?: {
  type?: 'income' | 'expense';
  category?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): Promise<Transaction[]> => {
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  if (filters?.startDate) {
    query = query.gte('date', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte('date', filters.endDate);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  return data || [];
};

// Get transaction by ID
export const getTransactionById = async (transactionId: string): Promise<Transaction | null> => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (error) throw error;
  return data;
};

// Delete transaction
export const deleteTransaction = async (transactionId: string): Promise<void> => {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId);

  if (error) throw error;
};

// Get accounting summary
export const getAccountingSummary = async (userId: string, startDate?: string, endDate?: string): Promise<AccountingSummary> => {
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId);

  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);

  const { data: transactions, error } = await query;
  if (error) throw error;

  const summary: AccountingSummary = {
    totalIncome: 0,
    totalExpenses: 0,
    netResult: 0,
    totalVatCollected: 0,
    totalVatPaid: 0,
    deductibleExpenses: 0,
    nonDeductibleExpenses: 0,
    socialContributions: 0
  };

  transactions?.forEach(transaction => {
    if (transaction.type === 'income') {
      summary.totalIncome += transaction.amount;
      summary.totalVatCollected += transaction.vat_amount || 0;
    } else {
      summary.totalExpenses += transaction.amount;
      summary.totalVatPaid += transaction.vat_amount || 0;
      
      if (transaction.is_deductible) {
        summary.deductibleExpenses += transaction.amount;
      } else {
        summary.nonDeductibleExpenses += transaction.amount;
      }

      if (transaction.category === 'Charges sociales') {
        summary.socialContributions += transaction.amount;
      }
    }
  });

  summary.netResult = summary.totalIncome - summary.totalExpenses;

  return summary;
};

// Get monthly data for charts
export const getMonthlyData = async (userId: string, year: number): Promise<MonthlyData[]> => {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date');

  if (error) throw error;

  const monthlyData: MonthlyData[] = [];
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  for (let i = 0; i < 12; i++) {
    const monthTransactions = transactions?.filter(t => 
      new Date(t.date).getMonth() === i
    ) || [];

    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    monthlyData.push({
      month: months[i],
      income,
      expenses,
      netResult: income - expenses
    });
  }

  return monthlyData;
};

// Get category breakdown
export const getCategoryBreakdown = async (userId: string, type: 'income' | 'expense', startDate?: string, endDate?: string): Promise<CategoryData[]> => {
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('type', type);

  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);

  const { data: transactions, error } = await query;
  if (error) throw error;

  const categoryMap = new Map<string, { amount: number; transactions: number }>();
  let totalAmount = 0;

  transactions?.forEach(transaction => {
    const category = transaction.category;
    const existing = categoryMap.get(category) || { amount: 0, transactions: 0 };
    
    categoryMap.set(category, {
      amount: existing.amount + transaction.amount,
      transactions: existing.transactions + 1
    });

    totalAmount += transaction.amount;
  });

  const categoryData: CategoryData[] = [];
  categoryMap.forEach((data, category) => {
    categoryData.push({
      category,
      amount: data.amount,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      transactions: data.transactions
    });
  });

  return categoryData.sort((a, b) => b.amount - a.amount);
};

// Calculate social contributions (simplified for auto-entrepreneurs)
export const calculateSocialContributions = (revenue: number, activityType: 'services' | 'commerce' | 'liberal' = 'services'): number => {
  // Simplified calculation - actual rates may vary
  const rates = {
    services: 0.22, // 22% for services
    commerce: 0.128, // 12.8% for commerce
    liberal: 0.22 // 22% for liberal professions
  };

  return revenue * rates[activityType];
};

// Auto-categorize transaction based on description
export const autoCategorizeTran = (description: string, amount: number): string => {
  const lowerDesc = description.toLowerCase();
  
  // Income keywords
  if (lowerDesc.includes('facture') || lowerDesc.includes('prestation') || lowerDesc.includes('service')) {
    return 'Prestations de services';
  }
  
  // Expense keywords
  if (lowerDesc.includes('urssaf') || lowerDesc.includes('cotisation') || lowerDesc.includes('social')) {
    return 'Charges sociales';
  }
  
  if (lowerDesc.includes('essence') || lowerDesc.includes('carburant') || lowerDesc.includes('transport')) {
    return 'Frais de déplacement';
  }
  
  if (lowerDesc.includes('internet') || lowerDesc.includes('téléphone') || lowerDesc.includes('mobile')) {
    return 'Téléphonie/Internet';
  }
  
  if (lowerDesc.includes('logiciel') || lowerDesc.includes('software') || lowerDesc.includes('abonnement')) {
    return 'Logiciels/Abonnements';
  }
  
  if (lowerDesc.includes('formation') || lowerDesc.includes('cours') || lowerDesc.includes('livre')) {
    return 'Formation';
  }
  
  if (lowerDesc.includes('assurance')) {
    return 'Assurances';
  }
  
  if (lowerDesc.includes('banque') || lowerDesc.includes('frais') || lowerDesc.includes('commission')) {
    return 'Frais bancaires';
  }
  
  if (lowerDesc.includes('bureau') || lowerDesc.includes('papeterie') || lowerDesc.includes('fourniture')) {
    return 'Fournitures de bureau';
  }
  
  if (lowerDesc.includes('publicité') || lowerDesc.includes('marketing') || lowerDesc.includes('communication')) {
    return 'Marketing/Publicité';
  }
  
  return 'Autres';
};

// Export transactions to CSV
export const exportTransactionsToCSV = (transactions: Transaction[]): string => {
  const headers = [
    'Date',
    'Type',
    'Catégorie',
    'Sous-catégorie',
    'Description',
    'Montant',
    'TVA',
    'Méthode de paiement',
    'Déductible',
    'Notes'
  ];

  const rows = transactions.map(transaction => [
    transaction.date,
    transaction.type === 'income' ? 'Recette' : 'Dépense',
    transaction.category,
    transaction.subcategory || '',
    transaction.description,
    transaction.amount.toFixed(2),
    (transaction.vat_amount || 0).toFixed(2),
    transaction.payment_method || '',
    transaction.is_deductible ? 'Oui' : 'Non',
    transaction.notes || ''
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  return csvContent;
};

// Generate accounting report
export const generateAccountingReport = async (userId: string, startDate: string, endDate: string) => {
  const [summary, transactions, monthlyData] = await Promise.all([
    getAccountingSummary(userId, startDate, endDate),
    getUserTransactions(userId, { startDate, endDate }),
    getMonthlyData(userId, new Date(startDate).getFullYear())
  ]);

  const incomeCategories = await getCategoryBreakdown(userId, 'income', startDate, endDate);
  const expenseCategories = await getCategoryBreakdown(userId, 'expense', startDate, endDate);

  return {
    summary,
    transactions,
    monthlyData,
    incomeCategories,
    expenseCategories,
    period: {
      startDate,
      endDate
    }
  };
};
