import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, DollarSign, Loader2, Check, Users, Edit2, Trash2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface HouseExpense {
  id: string;
  house_id: string;
  created_by: string;
  title: string;
  amount: number;
  expense_type: 'fixed' | 'floating';
  recurrence_days: number | null;
  created_at: string;
}

interface ExpensePayment {
  id: string;
  expense_id: string;
  user_id: string;
  amount_owed: number;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
}

interface ExpenseWithPayments {
  expense: HouseExpense;
  payments: ExpensePayment[];
  myPayment?: ExpensePayment;
  totalMembers: number;
}

type ExpenseType = 'fixed' | 'floating';

export function HouseExpensesScreen() {
  const { user } = useAuth();
  const { id: houseId } = useParams<{ id: string }>();
  const [fixedExpenses, setFixedExpenses] = useState<ExpenseWithPayments[]>([]);
  const [floatingExpenses, setFloatingExpenses] = useState<ExpenseWithPayments[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewExpense, setShowNewExpense] = useState(false);
  const [newExpenseType, setNewExpenseType] = useState<ExpenseType>('floating');
  const [newExpenseTitle, setNewExpenseTitle] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseRecurrence, setNewExpenseRecurrence] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<HouseExpense | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  useEffect(() => {
    if (user && houseId) {
      loadExpenses();
      const cleanup = subscribeToExpenses();
      return cleanup;
    }
  }, [user, houseId]);

  const loadExpenses = async () => {
    if (!houseId || !user) return;

    try {
      const { data: expensesData, error: expensesError } = await supabase
        .from('house_expenses')
        .select('*')
        .eq('house_id', houseId)
        .order('created_at', { ascending: false });

      if (expensesError) throw expensesError;

      const { data: membersData, error: membersError } = await supabase
        .from('house_members')
        .select('user_id')
        .eq('house_id', houseId);

      if (membersError) throw membersError;

      const totalMembers = membersData?.length || 0;

      const expensesWithPayments = await Promise.all(
        (expensesData || []).map(async (expense: HouseExpense) => {
          const { data: paymentsData } = await supabase
            .from('house_expense_payments')
            .select('*')
            .eq('expense_id', expense.id);

          const payments = paymentsData || [];
          const myPayment = payments.find((p: ExpensePayment) => p.user_id === user.id);
          const allPaid = payments.length > 0 && payments.every((p: ExpensePayment) => p.is_paid);

          if (allPaid) {
            return null;
          }

          if (expense.expense_type === 'fixed' && !myPayment) {
            return null;
          }

          return {
            expense,
            payments,
            myPayment,
            totalMembers,
          };
        })
      );

      const activeExpenses = expensesWithPayments.filter((e): e is ExpenseWithPayments => e !== null);

      setFixedExpenses(activeExpenses.filter((e) => e.expense.expense_type === 'fixed'));
      setFloatingExpenses(activeExpenses.filter((e) => e.expense.expense_type === 'floating'));
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToExpenses = () => {
    if (!houseId) return;

    const expensesChannel = supabase
      .channel(`house_expenses:${houseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'house_expenses',
          filter: `house_id=eq.${houseId}`,
        },
        () => {
          loadExpenses();
        }
      )
      .subscribe();

    const paymentsChannel = supabase
      .channel(`house_expense_payments:${houseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'house_expense_payments',
        },
        () => {
          loadExpenses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(expensesChannel);
      supabase.removeChannel(paymentsChannel);
    };
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newExpenseTitle.trim() || !newExpenseAmount || !houseId || !user) return;

    const amount = parseFloat(newExpenseAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor, insira um valor válido maior que 0.');
      return;
    }

    const recurrenceDays = newExpenseRecurrence ? parseInt(newExpenseRecurrence) : null;
    if (recurrenceDays !== null && (isNaN(recurrenceDays) || recurrenceDays <= 0)) {
      alert('Por favor, insira um intervalo de recorrência válido.');
      return;
    }

    setSubmitting(true);

    try {
      const { data: membersData, error: membersError } = await supabase
        .from('house_members')
        .select('user_id')
        .eq('house_id', houseId);

      if (membersError) throw membersError;

      const members = membersData || [];
      const totalMembers = members.length;

      if (totalMembers === 0) {
        alert('Não há membros na casa.');
        setSubmitting(false);
        return;
      }

      const { data: expenseData, error: expenseError } = await supabase
        .from('house_expenses')
        .insert({
          house_id: houseId,
          created_by: user.id,
          title: newExpenseTitle.trim(),
          amount,
          expense_type: newExpenseType,
          recurrence_days: recurrenceDays,
        })
        .select('*')
        .single();

      if (expenseError) throw expenseError;

      if (newExpenseType === 'floating') {
        const amountPerPerson = amount / totalMembers;

        const paymentsToCreate = members.map((member) => ({
          expense_id: expenseData.id,
          user_id: member.user_id,
          amount_owed: amountPerPerson,
        }));

        const { error: paymentsError } = await supabase
          .from('house_expense_payments')
          .insert(paymentsToCreate);

        if (paymentsError) throw paymentsError;
      } else {
        const { error: paymentsError } = await supabase
          .from('house_expense_payments')
          .insert({
            expense_id: expenseData.id,
            user_id: user.id,
            amount_owed: amount,
          });

        if (paymentsError) throw paymentsError;
      }

      setNewExpenseTitle('');
      setNewExpenseAmount('');
      setNewExpenseRecurrence('');
      setShowNewExpense(false);
      await loadExpenses();
    } catch (error) {
      console.error('Error creating expense:', error);
      alert('Erro ao criar despesa. Por favor, tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingExpense || !editTitle.trim() || !editAmount) return;

    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor, insira um valor válido maior que 0.');
      return;
    }

    setSubmitting(true);

    try {
      const { error: updateError } = await supabase
        .from('house_expenses')
        .update({
          title: editTitle.trim(),
          amount,
        })
        .eq('id', editingExpense.id);

      if (updateError) throw updateError;

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('house_expense_payments')
        .select('*')
        .eq('expense_id', editingExpense.id);

      if (paymentsError) throw paymentsError;

      const payments = paymentsData || [];

      console.log('Total payments to update:', payments.length, 'Expense type:', editingExpense.expense_type);

      if (editingExpense.expense_type === 'floating') {
        const totalMembers = payments.length;
        const amountPerPerson = amount / totalMembers;
        console.log('Floating expense - amount per person:', amountPerPerson);

        const updatePromises = payments.map(async (payment) => {
          const { data: updatedPayment, error: paymentUpdateError } = await supabase
            .from('house_expense_payments')
            .update({ amount_owed: amountPerPerson })
            .eq('id', payment.id)
            .select();

          console.log('Updated floating payment:', payment.id, 'result:', { data: updatedPayment, error: paymentUpdateError });

          if (paymentUpdateError) {
            console.error('Error updating payment:', payment.id, paymentUpdateError);
            throw paymentUpdateError;
          }

          return updatedPayment;
        });

        await Promise.all(updatePromises);
      } else {
        console.log('Fixed expense - amount:', amount);

        const updatePromises = payments.map(async (payment) => {
          const { data: updatedPayment, error: paymentUpdateError } = await supabase
            .from('house_expense_payments')
            .update({ amount_owed: amount })
            .eq('id', payment.id)
            .select();

          console.log('Updated fixed payment:', payment.id, 'result:', { data: updatedPayment, error: paymentUpdateError });

          if (paymentUpdateError) {
            console.error('Error updating payment:', payment.id, paymentUpdateError);
            throw paymentUpdateError;
          }

          return updatedPayment;
        });

        await Promise.all(updatePromises);
      }

      console.log('All house expense payments updated successfully');

      setEditingExpense(null);
      setEditTitle('');
      setEditAmount('');
      await loadExpenses();
    } catch (error) {
      console.error('Error editing expense:', error);
      alert('Erro ao editar despesa. Por favor, tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    setSubmitting(true);
    setConfirmingDelete(null);

    try {
      const { error } = await supabase
        .from('house_expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      await loadExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Erro ao eliminar despesa. Por favor, tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayExpense = async (paymentId: string) => {
    setConfirmingPayment(null);

    try {
      const { error } = await supabase
        .from('house_expense_payments')
        .update({
          is_paid: true,
          paid_at: new Date().toISOString(),
        })
        .eq('id', paymentId);

      if (error) throw error;

      await loadExpenses();
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      alert('Erro ao registar pagamento. Por favor, tente novamente.');
    }
  };

  const renderExpenseCard = (item: ExpenseWithPayments) => {
    const { expense, myPayment, payments, totalMembers } = item;
    const paidCount = payments.filter((p) => p.is_paid).length;
    const isFloating = expense.expense_type === 'floating';
    const isCreator = expense.created_by === user?.id;

    return (
      <div key={expense.id} className="space-y-2">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-white">{expense.title}</h3>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    isFloating
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'bg-green-600/20 text-green-400'
                  }`}
                >
                  {isFloating ? 'Flutuante' : 'Fixa'}
                </span>
              </div>

              <div className="flex flex-wrap gap-4 text-sm mb-2">
                <div className="flex items-center gap-2 text-green-400 font-semibold">
                  <DollarSign className="w-4 h-4" />
                  <span>Total: {expense.amount.toFixed(2)} €</span>
                </div>

                {myPayment && (
                  <div className="flex items-center gap-2 text-blue-400 font-semibold">
                    <DollarSign className="w-4 h-4" />
                    <span>Sua parte: {myPayment.amount_owed.toFixed(2)} €</span>
                  </div>
                )}

                {isFloating && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Users className="w-4 h-4" />
                    <span>
                      Pagaram: {paidCount}/{totalMembers}
                    </span>
                  </div>
                )}
              </div>

              {myPayment?.is_paid && (
                <div className="text-xs text-green-400 font-medium">
                  ✓ Você já pagou sua parte
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isCreator && (
                <>
                  <button
                    onClick={() => {
                      setEditingExpense(expense);
                      setEditTitle(expense.title);
                      setEditAmount(expense.amount.toString());
                    }}
                    className="p-2 text-blue-400 hover:text-blue-300 hover:bg-slate-700 rounded-lg transition-colors"
                    title="Editar despesa"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setConfirmingDelete(expense.id)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-slate-700 rounded-lg transition-colors"
                    title="Eliminar despesa"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </>
              )}

              {myPayment && !myPayment.is_paid && (
                <button
                  onClick={() => setConfirmingPayment(myPayment.id)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Registar Pagamento
                </button>
              )}
            </div>
          </div>
        </div>

        {confirmingPayment === myPayment?.id && (
          <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-xl p-4 animate-in slide-in-from-top duration-200">
            <p className="text-yellow-400 font-semibold mb-3">
              ⚠️ Tem a certeza que pagou {myPayment.amount_owed.toFixed(2)} € desta despesa?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handlePayExpense(myPayment.id)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
              >
                <Check className="w-4 h-4" />
                Sim, Confirmar
              </button>
              <button
                onClick={() => setConfirmingPayment(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {confirmingDelete === expense.id && (
          <div className="bg-red-900/20 border border-red-600/50 rounded-xl p-4 animate-in slide-in-from-top duration-200">
            <p className="text-red-400 font-semibold mb-3">
              ⚠️ Tem a certeza que deseja eliminar esta despesa? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDeleteExpense(expense.id)}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {submitting ? 'A eliminar...' : 'Sim, Eliminar'}
              </button>
              <button
                onClick={() => setConfirmingDelete(null)}
                disabled={submitting}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Despesas da Casa</h2>
        <button
          onClick={() => setShowNewExpense(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Despesa
        </button>
      </div>

      {showNewExpense && (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Criar Despesa da Casa</h3>
            <button
              onClick={() => {
                setShowNewExpense(false);
                setNewExpenseTitle('');
                setNewExpenseAmount('');
                setNewExpenseRecurrence('');
              }}
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleCreateExpense} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Tipo de Despesa
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setNewExpenseType('fixed')}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                    newExpenseType === 'fixed'
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Fixa
                </button>
                <button
                  type="button"
                  onClick={() => setNewExpenseType('floating')}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                    newExpenseType === 'floating'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Flutuante
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {newExpenseType === 'fixed'
                  ? 'Despesa fixa: valor pessoal constante (ex: Renda individual)'
                  : 'Despesa flutuante: valor dividido entre todos os membros (ex: Eletricidade)'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Título
              </label>
              <input
                type="text"
                value={newExpenseTitle}
                onChange={(e) => setNewExpenseTitle(e.target.value)}
                placeholder="Ex: Renda, Eletricidade, Água"
                disabled={submitting}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-600 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Valor {newExpenseType === 'fixed' ? '(Seu)' : 'Total'} (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={newExpenseAmount}
                onChange={(e) => setNewExpenseAmount(e.target.value)}
                placeholder="Ex: 500.00"
                disabled={submitting}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-600 disabled:cursor-not-allowed"
              />
              {newExpenseType === 'floating' && (
                <p className="mt-1 text-xs text-slate-400">
                  O valor será dividido igualmente entre todos os membros
                </p>
              )}
              {newExpenseType === 'fixed' && (
                <p className="mt-1 text-xs text-slate-400">
                  Este valor é apenas para você
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Recorrência (Opcional)
              </label>
              <input
                type="number"
                value={newExpenseRecurrence}
                onChange={(e) => setNewExpenseRecurrence(e.target.value)}
                placeholder="Número de dias (ex: 30 para mensal)"
                disabled={submitting}
                min="1"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-600 disabled:cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-slate-400">
                Deixe em branco se não quiser criar automaticamente
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting || !newExpenseTitle.trim() || !newExpenseAmount}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                {submitting ? 'A criar...' : 'Criar Despesa'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewExpense(false);
                  setNewExpenseTitle('');
                  setNewExpenseAmount('');
                  setNewExpenseRecurrence('');
                }}
                disabled={submitting}
                className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {editingExpense && (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Editar Despesa</h3>
            <button
              onClick={() => {
                setEditingExpense(null);
                setEditTitle('');
                setEditAmount('');
              }}
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleEditExpense} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Título
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                disabled={submitting}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-600 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Valor Total (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                disabled={submitting}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-600 disabled:cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-slate-400">
                A alteração do valor recalculará automaticamente as parcelas dos membros
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting || !editTitle.trim() || !editAmount}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                {submitting ? 'A guardar...' : 'Guardar Alterações'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingExpense(null);
                  setEditTitle('');
                  setEditAmount('');
                }}
                disabled={submitting}
                className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            Despesas Fixas
          </h3>
          {fixedExpenses.length === 0 ? (
            <div className="text-center py-8 bg-slate-800 rounded-xl">
              <p className="text-slate-400">Nenhuma despesa fixa pendente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fixedExpenses.map(renderExpenseCard)}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
            Despesas Flutuantes
          </h3>
          {floatingExpenses.length === 0 ? (
            <div className="text-center py-8 bg-slate-800 rounded-xl">
              <p className="text-slate-400">Nenhuma despesa flutuante pendente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {floatingExpenses.map(renderExpenseCard)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
