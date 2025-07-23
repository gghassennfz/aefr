'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getInvoiceWithItems, InvoiceWithItems, updateInvoiceStatus, markInvoiceAsPaid, sendPaymentReminder } from '@/lib/invoices';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import {
  PencilIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  EnvelopeIcon,
  EyeIcon,
  PrinterIcon,
  ShareIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, business } = useAuth();
  const [invoice, setInvoice] = useState<InvoiceWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('');

  useEffect(() => {
    if (id) {
      loadInvoice();
    }
  }, [id]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const data = await getInvoiceWithItems(id as string);
      setInvoice(data);
      setPaymentAmount(data?.total_amount || 0);
    } catch (error) {
      console.error('Error loading invoice:', error);
      toast.error('Erreur lors du chargement de la facture');
      router.push('/dashboard/invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!invoice) return;

    setActionLoading(newStatus);
    try {
      await updateInvoiceStatus(invoice.id, newStatus);
      await loadInvoice();
      toast.success('Statut mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du statut');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!invoice) return;

    setActionLoading('paid');
    try {
      await markInvoiceAsPaid(invoice.id, paymentAmount, paymentMethod);
      await loadInvoice();
      setShowPaymentModal(false);
      toast.success('Facture marquée comme payée');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendReminder = async () => {
    if (!invoice) return;

    setActionLoading('reminder');
    try {
      await sendPaymentReminder(invoice.id);
      await loadInvoice();
      toast.success('Rappel envoyé');
    } catch (error) {
      toast.error('Erreur lors de l\'envoi du rappel');
    } finally {
      setActionLoading(null);
    }
  };

  const downloadPDF = () => {
    if (!invoice) return;
    window.open(`/api/invoices/${invoice.id}/pdf`, '_blank');
  };

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

  const isOverdue = () => {
    return invoice?.status === 'sent' && invoice?.due_date && new Date(invoice.due_date) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-8">
        <p className="text-secondary-500">Facture non trouvée</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="btn-outline"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Retour
          </button>
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">
              {invoice.invoice_number}
            </h1>
            <p className="text-secondary-600">
              {getClientName(invoice.clients)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge(invoice.status)}
          {isOverdue() && (
            <ExclamationTriangleIcon className="w-5 h-5 text-error-600" />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={downloadPDF}
          className="btn-outline"
        >
          <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
          PDF
        </button>
        
        <button
          onClick={() => window.print()}
          className="btn-outline"
        >
          <PrinterIcon className="w-4 h-4 mr-2" />
          Imprimer
        </button>

        {invoice.status === 'draft' && (
          <button
            onClick={() => handleStatusChange('sent')}
            disabled={actionLoading === 'sent'}
            className="btn-primary"
          >
            {actionLoading === 'sent' ? (
              <div className="flex items-center">
                <div className="loading-spinner mr-2"></div>
                Envoi...
              </div>
            ) : (
              <>
                <PaperAirplaneIcon className="w-4 h-4 mr-2" />
                Envoyer
              </>
            )}
          </button>
        )}

        {invoice.status === 'sent' && (
          <>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="btn-success"
            >
              <CheckCircleIcon className="w-4 h-4 mr-2" />
              Marquer comme payée
            </button>
            <button
              onClick={handleSendReminder}
              disabled={actionLoading === 'reminder'}
              className="btn-outline"
            >
              {actionLoading === 'reminder' ? (
                <div className="flex items-center">
                  <div className="loading-spinner mr-2"></div>
                  Envoi...
                </div>
              ) : (
                <>
                  <EnvelopeIcon className="w-4 h-4 mr-2" />
                  Envoyer rappel
                </>
              )}
            </button>
          </>
        )}

        <Link
          href={`/dashboard/invoices/${invoice.id}/edit`}
          className="btn-outline"
        >
          <PencilIcon className="w-4 h-4 mr-2" />
          Modifier
        </Link>
      </div>

      {/* Invoice Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Info */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-secondary-900">
                Informations de la facture
              </h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-secondary-900">Numéro</h4>
                  <p className="text-secondary-600">{invoice.invoice_number}</p>
                </div>
                <div>
                  <h4 className="font-medium text-secondary-900">Date d'émission</h4>
                  <p className="text-secondary-600">
                    {format(new Date(invoice.issue_date), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-secondary-900">Date d'échéance</h4>
                  <p className="text-secondary-600">
                    {invoice.due_date 
                      ? format(new Date(invoice.due_date), 'dd MMMM yyyy', { locale: fr })
                      : 'Non spécifiée'
                    }
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-secondary-900">Statut</h4>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(invoice.status)}
                    {isOverdue() && (
                      <span className="text-sm text-error-600">(En retard)</span>
                    )}
                  </div>
                </div>
                {invoice.title && (
                  <div className="md:col-span-2">
                    <h4 className="font-medium text-secondary-900">Titre</h4>
                    <p className="text-secondary-600">{invoice.title}</p>
                  </div>
                )}
                {invoice.description && (
                  <div className="md:col-span-2">
                    <h4 className="font-medium text-secondary-900">Description</h4>
                    <p className="text-secondary-600">{invoice.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-secondary-900">
                Articles et services
              </h3>
            </div>
            <div className="card-body">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="table-header">
                    <tr>
                      <th className="table-header-cell">Description</th>
                      <th className="table-header-cell">Quantité</th>
                      <th className="table-header-cell">Prix unitaire HT</th>
                      <th className="table-header-cell">TVA</th>
                      <th className="table-header-cell">Total HT</th>
                      <th className="table-header-cell">Total TTC</th>
                    </tr>
                  </thead>
                  <tbody className="table-body">
                    {invoice.invoice_items.map((item, index) => (
                      <tr key={index}>
                        <td className="table-cell">{item.description}</td>
                        <td className="table-cell">{item.quantity}</td>
                        <td className="table-cell">{item.unit_price.toFixed(2)} €</td>
                        <td className="table-cell">{(item.vat_rate * 100).toFixed(1)}%</td>
                        <td className="table-cell">{item.total_ht.toFixed(2)} €</td>
                        <td className="table-cell">{item.total_ttc.toFixed(2)} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="card">
            <div className="card-body">
              <div className="max-w-md ml-auto space-y-2">
                <div className="flex justify-between">
                  <span className="text-secondary-600">Sous-total HT :</span>
                  <span className="font-medium">{invoice.subtotal.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-600">TVA :</span>
                  <span className="font-medium">{invoice.vat_amount.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-secondary-200 pt-2">
                  <span>Total TTC :</span>
                  <span>{invoice.total_amount.toFixed(2)} €</span>
                </div>
                {invoice.status === 'paid' && (
                  <div className="flex justify-between text-success-600">
                    <span>Montant payé :</span>
                    <span>{invoice.paid_amount.toFixed(2)} €</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {(invoice.notes || invoice.terms_conditions) && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-secondary-900">
                  Notes et conditions
                </h3>
              </div>
              <div className="card-body space-y-4">
                {invoice.notes && (
                  <div>
                    <h4 className="font-medium text-secondary-900">Notes</h4>
                    <p className="text-secondary-600">{invoice.notes}</p>
                  </div>
                )}
                {invoice.terms_conditions && (
                  <div>
                    <h4 className="font-medium text-secondary-900">Conditions de paiement</h4>
                    <p className="text-secondary-600">{invoice.terms_conditions}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Info */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-secondary-900">
                Client
              </h3>
            </div>
            <div className="card-body">
              {invoice.clients ? (
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-secondary-900">
                      {getClientName(invoice.clients)}
                    </h4>
                    {invoice.clients.email && (
                      <p className="text-sm text-secondary-600">{invoice.clients.email}</p>
                    )}
                  </div>
                  {invoice.clients.address && (
                    <div>
                      <h5 className="font-medium text-secondary-900">Adresse</h5>
                      <p className="text-sm text-secondary-600">
                        {invoice.clients.address}
                        {invoice.clients.postal_code && `, ${invoice.clients.postal_code}`}
                        {invoice.clients.city && ` ${invoice.clients.city}`}
                      </p>
                    </div>
                  )}
                  {invoice.clients.phone && (
                    <div>
                      <h5 className="font-medium text-secondary-900">Téléphone</h5>
                      <p className="text-sm text-secondary-600">{invoice.clients.phone}</p>
                    </div>
                  )}
                  {invoice.clients.siret && (
                    <div>
                      <h5 className="font-medium text-secondary-900">SIRET</h5>
                      <p className="text-sm text-secondary-600">{invoice.clients.siret}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-secondary-500">Client supprimé</p>
              )}
            </div>
          </div>

          {/* Payment Info */}
          {invoice.status === 'paid' && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-secondary-900">
                  Paiement
                </h3>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-secondary-900">Date de paiement</h4>
                    <p className="text-secondary-600">
                      {invoice.payment_date 
                        ? format(new Date(invoice.payment_date), 'dd MMMM yyyy', { locale: fr })
                        : 'Non spécifiée'
                      }
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-secondary-900">Montant payé</h4>
                    <p className="text-secondary-600">{invoice.paid_amount.toFixed(2)} €</p>
                  </div>
                  {invoice.payment_method && (
                    <div>
                      <h4 className="font-medium text-secondary-900">Méthode de paiement</h4>
                      <p className="text-secondary-600">{invoice.payment_method}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Reminders */}
          {invoice.reminder_count > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-secondary-900">
                  Rappels
                </h3>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-secondary-900">Nombre de rappels</h4>
                    <p className="text-secondary-600">{invoice.reminder_count}</p>
                  </div>
                  {invoice.last_reminder_sent && (
                    <div>
                      <h4 className="font-medium text-secondary-900">Dernier rappel</h4>
                      <p className="text-secondary-600">
                        {format(new Date(invoice.last_reminder_sent), 'dd MMMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">
              Marquer comme payée
            </h3>
            <div className="space-y-4">
              <div>
                <label className="form-label">Montant payé</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="form-input"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="form-label">Méthode de paiement</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="form-input"
                >
                  <option value="">Sélectionnez une méthode</option>
                  <option value="virement">Virement bancaire</option>
                  <option value="cheque">Chèque</option>
                  <option value="especes">Espèces</option>
                  <option value="carte">Carte bancaire</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="btn-outline"
              >
                Annuler
              </button>
              <button
                onClick={handleMarkAsPaid}
                disabled={actionLoading === 'paid'}
                className="btn-success"
              >
                {actionLoading === 'paid' ? 'Traitement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
