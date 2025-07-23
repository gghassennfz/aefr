'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  DocumentTextIcon,
  CurrencyEuroIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DashboardStats {
  totalRevenue: number;
  totalInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  monthlyRevenue: number;
  monthlyInvoices: number;
}

interface RecentInvoice {
  id: string;
  invoice_number: string;
  client_name: string;
  total_amount: number;
  status: string;
  issue_date: string;
  due_date: string;
}

export default function DashboardPage() {
  const { user, business } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    overdueInvoices: 0,
    monthlyRevenue: 0,
    monthlyInvoices: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      
      // Charger les statistiques des factures
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user?.id);

      if (invoicesError) throw invoicesError;

      // Calculer les statistiques
      const totalRevenue = invoicesData
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.total_amount, 0);

      const totalInvoices = invoicesData.length;
      const paidInvoices = invoicesData.filter(inv => inv.status === 'paid').length;
      const overdueInvoices = invoicesData.filter(inv => inv.status === 'overdue').length;

      const monthlyInvoices = invoicesData.filter(inv => {
        const issueDate = new Date(inv.issue_date);
        return issueDate.getFullYear() === currentYear && 
               issueDate.getMonth() + 1 === currentMonth;
      });

      const monthlyRevenue = monthlyInvoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.total_amount, 0);

      setStats({
        totalRevenue,
        totalInvoices,
        paidInvoices,
        overdueInvoices,
        monthlyRevenue,
        monthlyInvoices: monthlyInvoices.length,
      });

      // Charger les factures récentes avec les informations clients
      const { data: recentInvoicesData, error: recentError } = await supabase
        .from('invoices')
        .select(`
          *,
          clients!invoices_client_id_fkey (
            company_name,
            first_name,
            last_name
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      const formattedRecentInvoices = recentInvoicesData.map(invoice => ({
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        client_name: invoice.clients 
          ? invoice.clients.company_name || `${invoice.clients.first_name} ${invoice.clients.last_name}`
          : 'Client supprimé',
        total_amount: invoice.total_amount,
        status: invoice.status,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
      }));

      setRecentInvoices(formattedRecentInvoices);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="status-paid">Payée</span>;
      case 'sent':
        return <span className="status-sent">Envoyée</span>;
      case 'overdue':
        return <span className="status-overdue">En retard</span>;
      case 'draft':
        return <span className="status-draft">Brouillon</span>;
      case 'cancelled':
        return <span className="status-cancelled">Annulée</span>;
      default:
        return <span className="status-draft">{status}</span>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-success-600';
      case 'sent':
        return 'text-primary-600';
      case 'overdue':
        return 'text-error-600';
      case 'draft':
        return 'text-secondary-600';
      case 'cancelled':
        return 'text-secondary-600';
      default:
        return 'text-secondary-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Tableau de bord</h1>
          <p className="text-secondary-600">
            Aperçu de votre activité d'auto-entrepreneur
          </p>
        </div>
        <div className="flex space-x-3">
          <Link href="/dashboard/quotes/new" className="btn-outline">
            <PlusIcon className="w-4 h-4 mr-2" />
            Nouveau devis
          </Link>
          <Link href="/dashboard/invoices/new" className="btn-primary">
            <PlusIcon className="w-4 h-4 mr-2" />
            Nouvelle facture
          </Link>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyEuroIcon className="w-8 h-8 text-success-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-secondary-500">Chiffre d'affaires total</h3>
                <p className="text-2xl font-semibold text-secondary-900">
                  {stats.totalRevenue.toLocaleString('fr-FR')} €
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="w-8 h-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-secondary-500">Factures totales</h3>
                <p className="text-2xl font-semibold text-secondary-900">
                  {stats.totalInvoices}
                </p>
                <p className="text-sm text-success-600">{stats.paidInvoices} payées</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="w-8 h-8 text-warning-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-secondary-500">Ce mois</h3>
                <p className="text-2xl font-semibold text-secondary-900">
                  {stats.monthlyRevenue.toLocaleString('fr-FR')} €
                </p>
                <p className="text-sm text-secondary-600">{stats.monthlyInvoices} factures</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="w-8 h-8 text-error-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-secondary-500">Factures en retard</h3>
                <p className="text-2xl font-semibold text-error-600">
                  {stats.overdueInvoices}
                </p>
                {stats.overdueInvoices > 0 && (
                  <Link href="/dashboard/invoices?status=overdue" className="text-sm text-error-600 hover:text-error-700">
                    Voir les factures →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Factures récentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <div className="card-header">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-secondary-900">Factures récentes</h3>
              <Link href="/dashboard/invoices" className="text-sm text-primary-600 hover:text-primary-700">
                Voir tout
              </Link>
            </div>
          </div>
          <div className="card-body">
            {recentInvoices.length === 0 ? (
              <div className="text-center py-6">
                <DocumentTextIcon className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
                <p className="text-secondary-500">Aucune facture pour le moment</p>
                <Link href="/dashboard/invoices/new" className="btn-primary mt-4">
                  Créer votre première facture
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-secondary-900">
                          {invoice.invoice_number}
                        </h4>
                        {getStatusBadge(invoice.status)}
                      </div>
                      <p className="text-sm text-secondary-600">{invoice.client_name}</p>
                      <p className="text-sm text-secondary-500">
                        {format(new Date(invoice.issue_date), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold text-secondary-900">
                        {invoice.total_amount.toLocaleString('fr-FR')} €
                      </p>
                      <Link 
                        href={`/dashboard/invoices/${invoice.id}`}
                        className="text-sm text-primary-600 hover:text-primary-700 flex items-center mt-1"
                      >
                        <EyeIcon className="w-4 h-4 mr-1" />
                        Voir
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Notifications et alertes */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-secondary-900">Notifications</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {stats.overdueInvoices > 0 && (
                <div className="p-4 bg-error-50 border border-error-200 rounded-lg">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="w-5 h-5 text-error-600 mr-3" />
                    <div>
                      <p className="font-medium text-error-900">
                        {stats.overdueInvoices} facture(s) en retard
                      </p>
                      <p className="text-sm text-error-700">
                        Pensez à relancer vos clients
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {!business?.siret && (
                <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="w-5 h-5 text-warning-600 mr-3" />
                    <div>
                      <p className="font-medium text-warning-900">
                        Profil incomplet
                      </p>
                      <p className="text-sm text-warning-700">
                        Complétez vos informations d'entreprise
                      </p>
                      <Link href="/dashboard/profile" className="text-sm text-warning-600 hover:text-warning-700 mt-1 inline-block">
                        Compléter mon profil →
                      </Link>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
                <div className="flex items-center">
                  <ChartBarIcon className="w-5 h-5 text-primary-600 mr-3" />
                  <div>
                    <p className="font-medium text-primary-900">
                      Prochaine déclaration URSSAF
                    </p>
                    <p className="text-sm text-primary-700">
                      Dans 15 jours
                    </p>
                    <Link href="/dashboard/calendar" className="text-sm text-primary-600 hover:text-primary-700 mt-1 inline-block">
                      Voir le calendrier →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
