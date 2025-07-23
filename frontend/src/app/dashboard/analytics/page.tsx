'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getAccountingSummary, getMonthlyData, getCategoryBreakdown } from '@/lib/accounting';
import { getUserInvoices } from '@/lib/invoices';
import { getUserQuotes } from '@/lib/quotes';
import { calculateAnnualContributions } from '@/lib/socialContributions';
import { supabase } from '@/lib/supabase';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { format, startOfYear, endOfYear, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ChartBarIcon,
  CurrencyEuroIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  UsersIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface AnalyticsData {
  revenue: {
    current: number;
    previous: number;
    growth: number;
  };
  expenses: {
    current: number;
    previous: number;
    growth: number;
  };
  profit: {
    current: number;
    previous: number;
    growth: number;
  };
  invoices: {
    count: number;
    averageAmount: number;
    paidRate: number;
  };
  quotes: {
    count: number;
    conversionRate: number;
    averageAmount: number;
  };
  clients: {
    total: number;
    active: number;
    new: number;
  };
  monthlyData: any[];
  revenueCategories: any[];
  expenseCategories: any[];
  topClients: any[];
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { canAccessFeature } = useSubscription();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('year');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user, selectedPeriod, selectedYear]);

  const loadAnalytics = async () => {
    if (!user) return;

    if (!canAccessFeature('analytics')) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const currentYear = selectedYear;
      const previousYear = currentYear - 1;
      
      const currentStart = `${currentYear}-01-01`;
      const currentEnd = `${currentYear}-12-31`;
      const previousStart = `${previousYear}-01-01`;
      const previousEnd = `${previousYear}-12-31`;

      const [
        currentSummary,
        previousSummary,
        monthlyData,
        revenueCategories,
        expenseCategories,
        invoices,
        quotes,
        clients,
        topClients
      ] = await Promise.all([
        getAccountingSummary(user.id, currentStart, currentEnd),
        getAccountingSummary(user.id, previousStart, previousEnd),
        getMonthlyData(user.id, currentYear),
        getCategoryBreakdown(user.id, 'income', currentStart, currentEnd),
        getCategoryBreakdown(user.id, 'expense', currentStart, currentEnd),
        getUserInvoices(user.id, { startDate: currentStart, endDate: currentEnd }),
        getUserQuotes(user.id, { startDate: currentStart, endDate: currentEnd }),
        loadClientsAnalytics(user.id, currentStart, currentEnd),
        loadTopClients(user.id, currentStart, currentEnd)
      ]);

      // Calculate growth rates
      const revenueGrowth = previousSummary.totalIncome > 0 
        ? ((currentSummary.totalIncome - previousSummary.totalIncome) / previousSummary.totalIncome) * 100
        : 0;
      
      const expenseGrowth = previousSummary.totalExpenses > 0 
        ? ((currentSummary.totalExpenses - previousSummary.totalExpenses) / previousSummary.totalExpenses) * 100
        : 0;
      
      const profitGrowth = previousSummary.netResult > 0 
        ? ((currentSummary.netResult - previousSummary.netResult) / previousSummary.netResult) * 100
        : 0;

      // Invoice analytics
      const paidInvoices = invoices.filter(i => i.status === 'paid');
      const paidRate = invoices.length > 0 ? (paidInvoices.length / invoices.length) * 100 : 0;
      const averageInvoiceAmount = invoices.length > 0 
        ? invoices.reduce((sum, inv) => sum + inv.total_amount, 0) / invoices.length
        : 0;

      // Quote analytics
      const acceptedQuotes = quotes.filter(q => q.status === 'accepted');
      const conversionRate = quotes.length > 0 ? (acceptedQuotes.length / quotes.length) * 100 : 0;
      const averageQuoteAmount = quotes.length > 0 
        ? quotes.reduce((sum, quote) => sum + quote.total_amount, 0) / quotes.length
        : 0;

      setAnalytics({
        revenue: {
          current: currentSummary.totalIncome,
          previous: previousSummary.totalIncome,
          growth: revenueGrowth
        },
        expenses: {
          current: currentSummary.totalExpenses,
          previous: previousSummary.totalExpenses,
          growth: expenseGrowth
        },
        profit: {
          current: currentSummary.netResult,
          previous: previousSummary.netResult,
          growth: profitGrowth
        },
        invoices: {
          count: invoices.length,
          averageAmount: averageInvoiceAmount,
          paidRate: paidRate
        },
        quotes: {
          count: quotes.length,
          conversionRate: conversionRate,
          averageAmount: averageQuoteAmount
        },
        clients: clients,
        monthlyData: monthlyData,
        revenueCategories: revenueCategories,
        expenseCategories: expenseCategories,
        topClients: topClients
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClientsAnalytics = async (userId: string, startDate: string, endDate: string) => {
    const { data: clients } = await supabase
      .from('clients')
      .select('*, invoices(*)')
      .eq('user_id', userId);

    const totalClients = clients?.length || 0;
    const activeClients = clients?.filter(c => 
      c.invoices?.some((inv: any) => inv.issue_date >= startDate && inv.issue_date <= endDate)
    ).length || 0;

    const { data: newClients } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    return {
      total: totalClients,
      active: activeClients,
      new: newClients?.length || 0
    };
  };

  const loadTopClients = async (userId: string, startDate: string, endDate: string) => {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*, clients(*)')
      .eq('user_id', userId)
      .gte('issue_date', startDate)
      .lte('issue_date', endDate)
      .eq('status', 'paid');

    const clientRevenue = new Map();
    
    invoices?.forEach((invoice: any) => {
      const clientId = invoice.client_id;
      const clientName = invoice.clients?.company_name || 
                        `${invoice.clients?.first_name} ${invoice.clients?.last_name}`;
      
      if (!clientRevenue.has(clientId)) {
        clientRevenue.set(clientId, {
          name: clientName,
          revenue: 0,
          invoices: 0
        });
      }
      
      const client = clientRevenue.get(clientId);
      client.revenue += invoice.total_amount;
      client.invoices += 1;
    });

    return Array.from(clientRevenue.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? 'text-success-600' : 'text-error-600';
  };

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? 
      <ArrowUpIcon className="w-4 h-4" /> : 
      <ArrowDownIcon className="w-4 h-4" />;
  };

  // Chart configurations
  const monthlyRevenueData = {
    labels: analytics?.monthlyData.map(d => d.month) || [],
    datasets: [
      {
        label: 'Recettes',
        data: analytics?.monthlyData.map(d => d.income) || [],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.1
      },
      {
        label: 'Dépenses',
        data: analytics?.monthlyData.map(d => d.expenses) || [],
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.1
      }
    ]
  };

  const profitData = {
    labels: analytics?.monthlyData.map(d => d.month) || [],
    datasets: [
      {
        label: 'Résultat net',
        data: analytics?.monthlyData.map(d => d.netResult) || [],
        backgroundColor: analytics?.monthlyData.map(d => 
          d.netResult >= 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)'
        ) || [],
        borderColor: analytics?.monthlyData.map(d => 
          d.netResult >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
        ) || [],
        borderWidth: 1
      }
    ]
  };

  const expenseCategoriesData = {
    labels: analytics?.expenseCategories.map(c => c.category) || [],
    datasets: [
      {
        data: analytics?.expenseCategories.map(c => c.amount) || [],
        backgroundColor: [
          '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', 
          '#8b5cf6', '#ec4899', '#64748b', '#06b6d4', '#10b981'
        ],
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!canAccessFeature('analytics')) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="text-center py-12">
            <ChartBarIcon className="mx-auto w-12 h-12 text-secondary-400" />
            <h3 className="mt-2 text-sm font-medium text-secondary-900">
              Fonctionnalité Premium
            </h3>
            <p className="mt-1 text-sm text-secondary-500">
              Les analyses détaillées sont disponibles avec un abonnement payant.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Analyses</h1>
          <p className="text-secondary-600">
            Analysez les performances de votre activité
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="form-input"
          >
            {Array.from({ length: 3 }, (_, i) => {
              const year = new Date().getFullYear() - i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-500">Chiffre d'affaires</p>
                  <p className="text-2xl font-bold text-secondary-900">
                    {formatCurrency(analytics.revenue.current)}
                  </p>
                </div>
                <div className="p-2 bg-success-100 rounded-lg">
                  <CurrencyEuroIcon className="w-5 h-5 text-success-600" />
                </div>
              </div>
              <div className={`flex items-center mt-2 ${getGrowthColor(analytics.revenue.growth)}`}>
                {getGrowthIcon(analytics.revenue.growth)}
                <span className="ml-1 text-sm font-medium">
                  {formatPercentage(analytics.revenue.growth)}
                </span>
                <span className="ml-2 text-sm text-secondary-500">vs {selectedYear - 1}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-500">Dépenses</p>
                  <p className="text-2xl font-bold text-secondary-900">
                    {formatCurrency(analytics.expenses.current)}
                  </p>
                </div>
                <div className="p-2 bg-error-100 rounded-lg">
                  <TrendingDownIcon className="w-5 h-5 text-error-600" />
                </div>
              </div>
              <div className={`flex items-center mt-2 ${getGrowthColor(analytics.expenses.growth)}`}>
                {getGrowthIcon(analytics.expenses.growth)}
                <span className="ml-1 text-sm font-medium">
                  {formatPercentage(analytics.expenses.growth)}
                </span>
                <span className="ml-2 text-sm text-secondary-500">vs {selectedYear - 1}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-500">Résultat net</p>
                  <p className={`text-2xl font-bold ${analytics.profit.current >= 0 ? 'text-success-600' : 'text-error-600'}`}>
                    {formatCurrency(analytics.profit.current)}
                  </p>
                </div>
                <div className="p-2 bg-primary-100 rounded-lg">
                  <TrendingUpIcon className="w-5 h-5 text-primary-600" />
                </div>
              </div>
              <div className={`flex items-center mt-2 ${getGrowthColor(analytics.profit.growth)}`}>
                {getGrowthIcon(analytics.profit.growth)}
                <span className="ml-1 text-sm font-medium">
                  {formatPercentage(analytics.profit.growth)}
                </span>
                <span className="ml-2 text-sm text-secondary-500">vs {selectedYear - 1}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-500">Clients actifs</p>
                  <p className="text-2xl font-bold text-secondary-900">
                    {analytics.clients.active}
                  </p>
                </div>
                <div className="p-2 bg-warning-100 rounded-lg">
                  <UsersIcon className="w-5 h-5 text-warning-600" />
                </div>
              </div>
              <div className="flex items-center mt-2">
                <span className="text-sm text-secondary-500">
                  {analytics.clients.new} nouveaux cette année
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-secondary-900">
              Évolution mensuelle
            </h3>
          </div>
          <div className="card-body">
            <div className="h-80">
              <Line data={monthlyRevenueData} options={chartOptions} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-secondary-900">
              Résultat mensuel
            </h3>
          </div>
          <div className="card-body">
            <div className="h-80">
              <Bar data={profitData} options={barChartOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Business Metrics */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-secondary-900">
                Performance commerciale
              </h3>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                  <div className="flex items-center">
                    <DocumentTextIcon className="w-5 h-5 text-primary-600 mr-2" />
                    <span className="text-secondary-900">Factures émises</span>
                  </div>
                  <span className="font-bold text-secondary-900">
                    {analytics.invoices.count}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                  <div className="flex items-center">
                    <CurrencyEuroIcon className="w-5 h-5 text-success-600 mr-2" />
                    <span className="text-secondary-900">Montant moyen facture</span>
                  </div>
                  <span className="font-bold text-secondary-900">
                    {formatCurrency(analytics.invoices.averageAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                  <div className="flex items-center">
                    <EyeIcon className="w-5 h-5 text-warning-600 mr-2" />
                    <span className="text-secondary-900">Taux de paiement</span>
                  </div>
                  <span className="font-bold text-secondary-900">
                    {analytics.invoices.paidRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                  <div className="flex items-center">
                    <DocumentTextIcon className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="text-secondary-900">Devis émis</span>
                  </div>
                  <span className="font-bold text-secondary-900">
                    {analytics.quotes.count}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                  <div className="flex items-center">
                    <FunnelIcon className="w-5 h-5 text-purple-600 mr-2" />
                    <span className="text-secondary-900">Taux de conversion</span>
                  </div>
                  <span className="font-bold text-secondary-900">
                    {analytics.quotes.conversionRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-secondary-900">
                Top 5 clients
              </h3>
            </div>
            <div className="card-body">
              {analytics.topClients.length > 0 ? (
                <div className="space-y-3">
                  {analytics.topClients.map((client, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-secondary-900">{client.name}</h4>
                        <p className="text-sm text-secondary-600">{client.invoices} facture(s)</p>
                      </div>
                      <span className="font-bold text-secondary-900">
                        {formatCurrency(client.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UsersIcon className="mx-auto w-12 h-12 text-secondary-400" />
                  <p className="mt-2 text-sm text-secondary-500">
                    Aucun client avec des factures payées
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expense Categories */}
      {analytics && analytics.expenseCategories.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-secondary-900">
              Répartition des dépenses
            </h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-80">
                <Doughnut data={expenseCategoriesData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
              <div className="space-y-3">
                {analytics.expenseCategories.map((category, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-secondary-900">{category.category}</h4>
                      <p className="text-sm text-secondary-600">{category.transactions} transaction(s)</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-secondary-900">
                        {formatCurrency(category.amount)}
                      </span>
                      <p className="text-sm text-secondary-600">
                        {category.percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
