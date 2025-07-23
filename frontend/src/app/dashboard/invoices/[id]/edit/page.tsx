'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getInvoiceWithItems, InvoiceWithItems } from '@/lib/invoices';
import InvoiceForm from '@/components/InvoiceForm';
import toast from 'react-hot-toast';

export default function EditInvoicePage() {
  const { id } = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceWithItems | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadInvoice();
    }
  }, [id]);

  const loadInvoice = async () => {
    try {
      const data = await getInvoiceWithItems(id as string);
      setInvoice(data);
    } catch (error) {
      console.error('Error loading invoice:', error);
      toast.error('Erreur lors du chargement de la facture');
      router.push('/dashboard/invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    router.push(`/dashboard/invoices/${id}`);
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
    <InvoiceForm 
      invoice={invoice} 
      onSuccess={handleSuccess} 
    />
  );
}
