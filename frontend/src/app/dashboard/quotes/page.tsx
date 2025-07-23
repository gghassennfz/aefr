'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserQuotes, QuoteWithItems, updateQuoteStatus, deleteQuote, convertQuoteToInvoice } from '@/lib/quotes';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  EllipsisHorizontalIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const statusFilters = [
  { value: '', label: 'Tous' },
  { value: 'draft', label: 'Brouillons' },
  { value: 'sent', label: 'Envoyés' },
  { value: 'accepted', label: 'Acceptés' },
  { value: 'rejected', label: 'Refusés' },
  { value: 'expired', label: 'Expirés' },
];

export default function QuotesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [quotes, setQuotes] = useState<QuoteWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadQuotes();
    }
  }, [user, statusFilter]);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const data = await getUserQuotes(user!.id, {
        status: statusFilter || undefined,
        limit: 100,
      });
      setQuotes(data);
    } catch (error) {
      console.error('Error loading quotes:', error);
      toast.error('Erreur lors du chargement des devis');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (quoteId: string, newStatus: string) => {
    try {
      setActionLoading(quoteId);
      await updateQuoteStatus(quoteId, newStatus);
      await loadQuotes();
      toast.success('Statut mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du statut');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (quoteId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce devis ?')) return;

    try {
      setActionLoading(quoteId);
      await deleteQuote(quoteId);
      await loadQuotes();
      toast.success('Devis supprimé');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConvertToInvoice = async (quoteId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir convertir ce devis en facture ?')) return;

    try {
      setActionLoading(quoteId);
      const invoiceId = await convertQuoteToInvoice(quoteId);
      await loadQuotes();
      toast.success('Devis converti en facture');
      router.push(`/dashboard/invoices/${invoiceId}`);
    } catch (error) {
      toast.error('Erreur lors de la conversion');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredQuotes = quotes
    .filter(quote => {
      const matchesSearch = searchTerm === '' || 
        quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.clients?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.clients?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.clients?.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.issue_date).getTime();
          bValue = new Date(b.issue_date).getTime();
          break;
        case 'amount':
          aValue = a.total_amount;
          bValue = b.total_amount;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a.created_at;
          bValue = b.created_at;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="status-draft">Brouillon</span>;
      case 'sent':
        return <span className="status-sent">Envoyé</span>;
      case 'accepted':
        return <span className="status-paid">Accepté</span>;
      case 'rejected':
        return <span className="status-cancelled">Refusé</span>;
      case 'expired':
        return <span className="status-overdue">Expiré</span>;
      default:
        return <span className="status-draft">{status}</span>;
    }
  };

  const getClientName = (client: any) => {
    if (!client) return 'Client supprimé';
    return client.company_name || `${client.first_name} ${client.last_name}`;
  };

  const isExpired = (quote: QuoteWithItems) => {
    return quote.expiry_date && new Date(quote.expiry_date) < new Date();
  };

  const isExpiringSoon = (quote: QuoteWithItems) => {
    if (!quote.expiry_date) return false;
    const daysUntilExpiry = Math.ceil((new Date(quote.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Devis</h1>
          <p className="text-secondary-600">
            Gérez vos devis et convertissez-les en factures
          </p>
        </div>
        <Link href="/dashboard/quotes/new" className="btn-primary">
          <PlusIcon className="w-4 h-4 mr-2" />
          Nouveau devis
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-500">Total</p>
                <p className="text-2xl font-semibold text-secondary-900">
                  {quotes.length}
                </p>
              </div>
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-primary-600">
                  {quotes.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-500">Acceptés</p>
                <p className="text-2xl font-semibold text-success-600">
                  {quotes.filter(q => q.status === 'accepted').length}
                </p>
              </div>
              <div className="w-8 h-8 bg-success-100 rounded-full flex items-center justify-center">
                <CheckCircleIcon className="w-4 h-4 text-success-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-500">En attente</p>
                <p className="text-2xl font-semibold text-warning-600">
                  {quotes.filter(q => q.status === 'sent').length}
                </p>
              </div>
              <div className="w-8 h-8 bg-warning-100 rounded-full flex items-center justify-center">
                <PaperAirplaneIcon className="w-4 h-4 text-warning-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-500">Expirés</p>
                <p className="text-2xl font-semibold text-error-600">
                  {quotes.filter(q => isExpired(q)).length}
                </p>
              </div>
              <div className="w-8 h-8 bg-error-100 rounded-full flex items-center justify-center">
                <ExclamationTriangleIcon className="w-4 h-4 text-error-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
                <input
                  type="text"
                  placeholder="Rechercher par numéro ou client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-input"
              >
                {statusFilters.map(filter => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field as 'date' | 'amount' | 'status');
                  setSortOrder(order as 'asc' | 'desc');
                }}
                className="form-input"
              >
                <option value="date-desc">Date (plus récent)</option>
                <option value="date-asc">Date (plus ancien)</option>
                <option value="amount-desc">Montant (plus élevé)</option>
                <option value="amount-asc">Montant (plus faible)</option>
                <option value="status-asc">Statut (A-Z)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Quotes Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">
                  <input
                    type="checkbox"
                    className="rounded border-secondary-300"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedQuotes(filteredQuotes.map(q => q.id));
                      } else {
                        setSelectedQuotes([]);
                      }
                    }}
                  />
                </th>
                <th className="table-header-cell">Numéro</th>
                <th className="table-header-cell">Client</th>
                <th className="table-header-cell">Date</th>
                <th className="table-header-cell">Expiration</th>
                <th className="table-header-cell">Montant</th>
                <th className="table-header-cell">Statut</th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8">
                    <div className="text-secondary-500">
                      {searchTerm || statusFilter ? 'Aucun devis trouvé' : 'Aucun devis créé'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((quote) => (
                  <tr key={quote.id} className="table-row">
                    <td className="table-cell">
                      <input
                        type="checkbox"
                        className="rounded border-secondary-300"
                        checked={selectedQuotes.includes(quote.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedQuotes([...selectedQuotes, quote.id]);
                          } else {
                            setSelectedQuotes(selectedQuotes.filter(id => id !== quote.id));
                          }
                        }}
                      />
                    </td>
                    <td className="table-cell">
                      <Link
                        href={`/dashboard/quotes/${quote.id}`}
                        className="font-medium text-primary-600 hover:text-primary-700"
                      >
                        {quote.quote_number}
                      </Link>
                    </td>
                    <td className="table-cell">
                      <div>
                        <div className="font-medium text-secondary-900">
                          {getClientName(quote.clients)}
                        </div>
                        {quote.clients?.email && (
                          <div className="text-sm text-secondary-500">
                            {quote.clients.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      {format(new Date(quote.issue_date), 'dd/MM/yyyy')}
                    </td>
                    <td className="table-cell">
                      {quote.expiry_date ? (
                        <div className={`${isExpired(quote) ? 'text-error-600' : isExpiringSoon(quote) ? 'text-warning-600' : ''}`}>
                          {format(new Date(quote.expiry_date), 'dd/MM/yyyy')}
                          {isExpiringSoon(quote) && (
                            <div className="text-xs text-warning-600">Expire bientôt</div>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="font-medium">
                        {quote.total_amount.toLocaleString('fr-FR')} €
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(quote.status)}
                        {isExpired(quote) && quote.status !== 'expired' && (
                          <ExclamationTriangleIcon className="w-4 h-4 text-error-600" />
                        )}
                        {isExpiringSoon(quote) && (
                          <ExclamationTriangleIcon className="w-4 h-4 text-warning-600" />
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/dashboard/quotes/${quote.id}`}
                          className="text-secondary-400 hover:text-secondary-600"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/dashboard/quotes/${quote.id}/edit`}
                          className="text-secondary-400 hover:text-secondary-600"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Link>
                        
                        {/* Actions Menu */}
                        <Menu as="div" className="relative">
                          <Menu.Button className="text-secondary-400 hover:text-secondary-600">
                            <EllipsisHorizontalIcon className="w-4 h-4" />
                          </Menu.Button>
                          <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                          >
                            <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                              {quote.status === 'draft' && (
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={() => handleStatusChange(quote.id, 'sent')}
                                      disabled={actionLoading === quote.id}
                                      className={`${active ? 'bg-secondary-50' : ''} block px-4 py-2 text-sm text-secondary-700 w-full text-left`}
                                    >
                                      {actionLoading === quote.id ? 'Envoi...' : 'Envoyer'}
                                    </button>
                                  )}
                                </Menu.Item>
                              )}
                              {quote.status === 'sent' && (
                                <>
                                  <Menu.Item>
                                    {({ active }) => (
                                      <button
                                        onClick={() => handleStatusChange(quote.id, 'accepted')}
                                        disabled={actionLoading === quote.id}
                                        className={`${active ? 'bg-secondary-50' : ''} block px-4 py-2 text-sm text-secondary-700 w-full text-left`}
                                      >
                                        Marquer comme accepté
                                      </button>
                                    )}
                                  </Menu.Item>
                                  <Menu.Item>
                                    {({ active }) => (
                                      <button
                                        onClick={() => handleStatusChange(quote.id, 'rejected')}
                                        disabled={actionLoading === quote.id}
                                        className={`${active ? 'bg-secondary-50' : ''} block px-4 py-2 text-sm text-secondary-700 w-full text-left`}
                                      >
                                        Marquer comme refusé
                                      </button>
                                    )}
                                  </Menu.Item>
                                </>
                              )}
                              {quote.status === 'accepted' && (
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={() => handleConvertToInvoice(quote.id)}
                                      disabled={actionLoading === quote.id}
                                      className={`${active ? 'bg-secondary-50' : ''} block px-4 py-2 text-sm text-success-700 w-full text-left`}
                                    >
                                      {actionLoading === quote.id ? 'Conversion...' : 'Convertir en facture'}
                                    </button>
                                  )}
                                </Menu.Item>
                              )}
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() => window.open(`/api/quotes/${quote.id}/pdf`, '_blank')}
                                    className={`${active ? 'bg-secondary-50' : ''} block px-4 py-2 text-sm text-secondary-700 w-full text-left`}
                                  >
                                    Télécharger PDF
                                  </button>
                                )}
                              </Menu.Item>
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() => handleDelete(quote.id)}
                                    disabled={actionLoading === quote.id}
                                    className={`${active ? 'bg-secondary-50' : ''} block px-4 py-2 text-sm text-error-600 w-full text-left`}
                                  >
                                    Supprimer
                                  </button>
                                )}
                              </Menu.Item>
                            </Menu.Items>
                          </Transition>
                        </Menu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
