'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import {
  getUserTransactions,
  getAccountingSummary,
  deleteTransaction,
  exportTransactionsToCSV,
  AccountingSummary
} from '@/lib/accounting';
import { Database } from '@/lib/database.types';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  PlusIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ChartBarIcon,
  BanknotesIcon,
  CreditCardIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

type Transaction = Database['public']['Tables']['transactions']['Row'];

export default function AccountingPage() {
  const { user } = useAuth();
  const { canAccessFeature } = useSubscription();
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<AccountingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    type: 'all' as 'all' | 'income' | 'expense',
    category: '',
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    search: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, filters]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [transactionsData, summaryData] = await Promise.all([
        getUserTransactions(user.id, {
          type: filters.type !== 'all' ? filters.type : undefined,
          category: filters.category || undefined,
          startDate: filters.startDate,
          endDate: filters.endDate,
          limit: itemsPerPage,
          offset: (currentPage - 1) * itemsPerPage
        }),
        getAccountingSummary(user.id, filters.startDate, filters.endDate)
      ]);

      // Filter by search term
      const filteredTransactions = transactionsData.filter(transaction =>
        transaction.description.toLowerCase().includes(filters.search.toLowerCase()) ||
        transaction.category.toLowerCase().includes(filters.search.toLowerCase()) ||
        (transaction.subcategory && transaction.subcategory.toLowerCase().includes(filters.search.toLowerCase()))
      );

      setTransactions(filteredTransactions);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (transactionId: string) => {
    try {
      await deleteTransaction(transactionId);
      toast.success('Transaction supprimée');
      loadData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Erreur lors de la suppression');
    }
    setShowDeleteConfirm(null);
  };

  const handleBulkDelete = async () => {
    if (selectedTransactions.length === 0) return;

    try {
      await Promise.all(
        selectedTransactions.map(id => deleteTransaction(id))
      );
      toast.success(`${selectedTransactions.length} transaction(s) supprimée(s)`);
      setSelectedTransactions([]);
      loadData();
    } catch (error) {
      console.error('Error bulk deleting:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleExport = () => {
    if (!canAccessFeature('export')) {
      toast.error('Fonctionnalité disponible avec un abonnement payant');
      return;
    }

    const csv = exportTransactionsToCSV(transactions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `comptabilite_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('Export réussi');
  };

  const toggleTransactionSelection = (id: string) => {
    setSelectedTransactions(prev =>
      prev.includes(id)
        ? prev.filter(tid => tid !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    setSelectedTransactions(prev =>
      prev.length === transactions.length ? [] : transactions.map(t => t.id)
    );
  };

  const getStatusBadge = (type: 'income' | 'expense') => {
    if (type === 'income') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
          <ArrowUpIcon className="w-3 h-3 mr-1" />
          Recette
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-error-100 text-error-800">
          <ArrowDownIcon className="w-3 h-3 mr-1" />
          Dépense
        </span>
      );
    }
  };

  const getAmountColor = (type: 'income' | 'expense') => {
    return type === 'income' ? 'text-success-600' : 'text-error-600';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const setPeriod = (period: 'month' | 'quarter' | 'year') => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'month':
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        break;
      case 'quarter':
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1);
        endDate = new Date(today.getFullYear(), quarter * 3 + 3, 0);
        break;
      case 'year':
        startDate = startOfYear(today);
        endDate = endOfYear(today);
        break;
    }

    setFilters(prev => ({
      ...prev,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd')
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Comptabilité</h1>
          <p className="text-secondary-600">
            Gérez vos revenus et dépenses
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleExport}
            disabled={!canAccessFeature('export')}
            className="btn-outline"
          >
            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
            Exporter
          </button>
          <button
            onClick={() => router.push('/dashboard/accounting/analytics')}
            className="btn-outline"
          >
            <ChartBarIcon className="w-4 h-4 mr-2" />
            Analyses
          </button>
          <button
            onClick={() => router.push('/dashboard/accounting/new')}
            className="btn-primary"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Nouvelle transaction
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="p-2 bg-success-100 rounded-lg">
                  <TrendingUpIcon className="w-5 h-5 text-success-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-500">Recettes</p>
                  <p className="text-2xl font-bold text-secondary-900">
                    {formatCurrency(summary.totalIncome)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="p-2 bg-error-100 rounded-lg">
                  <TrendingDownIcon className="w-5 h-5 text-error-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-500">Dépenses</p>
                  <p className="text-2xl font-bold text-secondary-900">
                    {formatCurrency(summary.totalExpenses)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <BanknotesIcon className="w-5 h-5 text-primary-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-500">Résultat net</p>
                  <p className={`text-2xl font-bold ${summary.netResult >= 0 ? 'text-success-600' : 'text-error-600'}`}>
                    {formatCurrency(summary.netResult)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="p-2 bg-warning-100 rounded-lg">
                  <CreditCardIcon className="w-5 h-5 text-warning-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-500">Charges sociales</p>
                  <p className="text-2xl font-bold text-secondary-900">
                    {formatCurrency(summary.socialContributions)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="form-label">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
                className="form-input"
              >
                <option value="all">Tous</option>
                <option value="income">Recettes</option>
                <option value="expense">Dépenses</option>
              </select>
            </div>

            <div>
              <label className="form-label">Catégorie</label>
              <input
                type="text"
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="form-input"
                placeholder="Filtrer par catégorie"
              />
            </div>

            <div>
              <label className="form-label">Date de début</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Date de fin</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Recherche</label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="form-input pl-10"
                  placeholder="Rechercher..."
                />
              </div>
            </div>

            <div className="flex items-end space-x-2">
              <button
                onClick={() => setPeriod('month')}
                className="btn-outline text-sm"
              >
                Mois
              </button>
              <button
                onClick={() => setPeriod('year')}
                className="btn-outline text-sm"
              >
                Année
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedTransactions.length > 0 && (
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-secondary-700">
                  {selectedTransactions.length} transaction(s) sélectionnée(s)
                </span>
                <button
                  onClick={handleBulkDelete}
                  className="btn-outline text-error-600 hover:text-error-700"
                >
                  <TrashIcon className="w-4 h-4 mr-2" />
                  Supprimer la sélection
                </button>
              </div>
              <button
                onClick={() => setSelectedTransactions([])}
                className="text-secondary-400 hover:text-secondary-600"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="card">
        <div className="card-header">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-secondary-900">
              Transactions
            </h3>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedTransactions.length === transactions.length && transactions.length > 0}
                onChange={toggleSelectAll}
                className="form-checkbox"
              />
              <label className="text-sm text-secondary-600">
                Tout sélectionner
              </label>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.length === transactions.length && transactions.length > 0}
                      onChange={toggleSelectAll}
                      className="form-checkbox"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Catégorie
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-secondary-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.includes(transaction.id)}
                        onChange={() => toggleTransactionSelection(transaction.id)}
                        className="form-checkbox"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                      {format(new Date(transaction.date), 'dd/MM/yyyy', { locale: fr })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(transaction.type)}
                    </td>
                    <td className="px-6 py-4 text-sm text-secondary-900 max-w-xs truncate">
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                      {transaction.category}
                      {transaction.subcategory && (
                        <span className="text-secondary-400"> • {transaction.subcategory}</span>
                      )}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${getAmountColor(transaction.type)}`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => router.push(`/dashboard/accounting/${transaction.id}`)}
                          className="text-secondary-400 hover:text-secondary-600"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/accounting/${transaction.id}/edit`)}
                          className="text-secondary-400 hover:text-primary-600"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(transaction.id)}
                          className="text-secondary-400 hover:text-error-600"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {transactions.length === 0 && (
            <div className="text-center py-12">
              <BanknotesIcon className="mx-auto w-12 h-12 text-secondary-400" />
              <h3 className="mt-2 text-sm font-medium text-secondary-900">
                Aucune transaction
              </h3>
              <p className="mt-1 text-sm text-secondary-500">
                Commencez par créer votre première transaction.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => router.push('/dashboard/accounting/new')}
                  className="btn-primary"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Nouvelle transaction
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-secondary-900 mb-4">
              Confirmer la suppression
            </h3>
            <p className="text-secondary-600 mb-6">
              Êtes-vous sûr de vouloir supprimer cette transaction ? Cette action est irréversible.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="btn-outline"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="btn-error"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
