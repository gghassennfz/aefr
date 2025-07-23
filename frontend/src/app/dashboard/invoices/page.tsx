'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserInvoices, InvoiceWithItems, updateInvoiceStatus, deleteInvoice, markInvoiceAsPaid } from '@/lib/invoices';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import toast from 'react-hot-toast';

const statusFilters = [
  { value: '', label: 'Tous' },
  { value: 'draft', label: 'Brouillons' },
  { value: 'sent', label: 'Envoyées' },
  { value: 'paid', label: 'Payées' },
  { value: 'overdue', label: 'En retard' },
  { value: 'cancelled', label: 'Annulées' },
];

export default function InvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      loadInvoices();
    }
  }, [user, statusFilter]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const data = await getUserInvoices(user!.id, {
        status: statusFilter || undefined,
        limit: 100,
      });
      setInvoices(data);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Erreur lors du chargement des factures');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (invoiceId: string, newStatus: string) => {
    try {
      await updateInvoiceStatus(invoiceId, newStatus);
      await loadInvoices();
      toast.success('Statut mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const handleDelete = async (invoiceId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) return;

    try {
      await deleteInvoice(invoiceId);
      await loadInvoices();
      toast.success('Facture supprimée');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleMarkAsPaid = async (invoiceId: string, amount: number) => {
    try {
      await markInvoiceAsPaid(invoiceId, amount);
      await loadInvoices();
      toast.success('Facture marquée comme payée');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const filteredInvoices = invoices
    .filter(invoice => {
      const matchesSearch = searchTerm === '' || 
        invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.clients?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.clients?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.clients?.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
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
        return <span className="status-sent">Envoyée</span>;
      case 'paid':
        return <span className="status-paid">Payée</span>;
      case 'overdue':
        return <span className="status-overdue">En retard</span>;
      case 'cancelled':
        return <span className="status-cancelled">Annulée</span>;
      default:
        return <span className="status-draft">{status}</span>;
    }
  };

  const getClientName = (client: any) => {
    if (!client) return 'Client supprimé';
    return client.company_name || `${client.first_name} ${client.last_name}`;
  };

  const isOverdue = (invoice: InvoiceWithItems) => {
    return invoice.status === 'sent' && invoice.due_date && new Date(invoice.due_date) < new Date();
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
          <h1 className="text-2xl font-bold text-secondary-900">Factures</h1>
          <p className="text-secondary-600">
            Gérez vos factures et suivez vos paiements
          </p>
        </div>
        <Link href="/dashboard/invoices/new" className="btn-primary">
          <PlusIcon className="w-4 h-4 mr-2" />
          Nouvelle facture
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
                  {invoices.length}
                </p>
              </div>
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-primary-600">
                  {invoices.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-500">Payées</p>
                <p className="text-2xl font-semibold text-success-600">
                  {invoices.filter(i => i.status === 'paid').length}
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
                  {invoices.filter(i => i.status === 'sent').length}
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
                <p className="text-sm font-medium text-secondary-500">En retard</p>
                <p className="text-2xl font-semibold text-error-600">
                  {invoices.filter(i => isOverdue(i)).length}
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

      {/* Invoices Table */}
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
                        setSelectedInvoices(filteredInvoices.map(i => i.id));
                      } else {
                        setSelectedInvoices([]);
                      }
                    }}
                  />
                </th>
                <th className="table-header-cell">Numéro</th>
                <th className="table-header-cell">Client</th>
                <th className="table-header-cell">Date</th>
                <th className="table-header-cell">Échéance</th>
                <th className="table-header-cell">Montant</th>
                <th className="table-header-cell">Statut</th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8">
                    <div className="text-secondary-500">
                      {searchTerm || statusFilter ? 'Aucune facture trouvée' : 'Aucune facture créée'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="table-row">
                    <td className="table-cell">
                      <input
                        type="checkbox"
                        className="rounded border-secondary-300"
                        checked={selectedInvoices.includes(invoice.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedInvoices([...selectedInvoices, invoice.id]);
                          } else {
                            setSelectedInvoices(selectedInvoices.filter(id => id !== invoice.id));
                          }
                        }}
                      />
                    </td>
                    <td className="table-cell">
                      <Link
                        href={`/dashboard/invoices/${invoice.id}`}
                        className="font-medium text-primary-600 hover:text-primary-700"
                      >
                        {invoice.invoice_number}
                      </Link>
                    </td>
                    <td className="table-cell">
                      <div>
                        <div className="font-medium text-secondary-900">
                          {getClientName(invoice.clients)}
                        </div>
                        {invoice.clients?.email && (
                          <div className="text-sm text-secondary-500">
                            {invoice.clients.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      {format(new Date(invoice.issue_date), 'dd/MM/yyyy')}
                    </td>
                    <td className="table-cell">
                      {invoice.due_date ? (
                        <div className={isOverdue(invoice) ? 'text-error-600' : ''}>
                          {format(new Date(invoice.due_date), 'dd/MM/yyyy')}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="font-medium">
                        {invoice.total_amount.toLocaleString('fr-FR')} €
                      </div>
                      {invoice.status === 'paid' && (
                        <div className="text-sm text-success-600">
                          Payé le {invoice.payment_date ? format(new Date(invoice.payment_date), 'dd/MM/yyyy') : ''}
                        </div>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(invoice.status)}
                        {isOverdue(invoice) && (
                          <ExclamationTriangleIcon className="w-4 h-4 text-error-600" />
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/dashboard/invoices/${invoice.id}`}
                          className="text-secondary-400 hover:text-secondary-600"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/dashboard/invoices/${invoice.id}/edit`}
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
                              {invoice.status === 'draft' && (
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={() => handleStatusChange(invoice.id, 'sent')}
                                      className={`${active ? 'bg-secondary-50' : ''} block px-4 py-2 text-sm text-secondary-700 w-full text-left`}
                                    >
                                      Envoyer
                                    </button>
                                  )}
                                </Menu.Item>
                              )}
                              {invoice.status === 'sent' && (
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={() => handleMarkAsPaid(invoice.id, invoice.total_amount)}
                                      className={`${active ? 'bg-secondary-50' : ''} block px-4 py-2 text-sm text-secondary-700 w-full text-left`}
                                    >
                                      Marquer comme payée
                                    </button>
                                  )}
                                </Menu.Item>
                              )}
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() => window.open(`/api/invoices/${invoice.id}/pdf`, '_blank')}
                                    className={`${active ? 'bg-secondary-50' : ''} block px-4 py-2 text-sm text-secondary-700 w-full text-left`}
                                  >
                                    Télécharger PDF
                                  </button>
                                )}
                              </Menu.Item>
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() => handleDelete(invoice.id)}
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
