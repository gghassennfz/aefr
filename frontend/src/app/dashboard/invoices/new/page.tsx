'use client';

import { useRouter } from 'next/navigation';
import InvoiceForm from '@/components/InvoiceForm';

export default function NewInvoicePage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/dashboard/invoices');
  };

  return (
    <InvoiceForm onSuccess={handleSuccess} />
  );
}
