import TransactionForm from '@/components/TransactionForm';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function NewTransactionPage() {
  return (
    <ProtectedRoute>
      <TransactionForm />
    </ProtectedRoute>
  );
}
