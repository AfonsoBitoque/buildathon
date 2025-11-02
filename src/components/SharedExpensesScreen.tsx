import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, DollarSign, Users, Loader2, Check, User, Edit2, Trash2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface SharedExpense {
  id: string;
  house_id: string;
  created_by: string;
  title: string;
  total_amount: number;
  created_at: string;
  creator?: {
    username: string;
    tag: string;
  };
}

interface ExpensePayment {
  id: string;
  expense_id: string;
  user_id: string;
  amount_owed: number;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
  shared_expense?: SharedExpense;
  debtor?: {
    username: string;
    tag: string;
  };
}

export function SharedExpensesScreen() {
  const { user } = useAuth();
  const { id: houseId } = useParams<{ id: string }>();
  const [myDebts, setMyDebts] = useState<ExpensePayment[]>([]);
  const [creditsOwed, setCreditsOwed] = useState<{ expense: SharedExpense; payments: ExpensePayment[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewExpense, setShowNewExpense] = useState(false);
  const [newExpenseTitle, setNewExpenseTitle] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<SharedExpense | null>(null);
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
      const { data: debtsData, error: debtsError } = await supabase
        .from('shared_expense_payments')
        .select('*, shared_expenses!inner(*)')
        .eq('user_id', user.id)
        .eq('is_paid', false);

      if (debtsError) throw debtsError;

      const debtsWithCreators = await Promise.all(
        (debtsData || []).map(async (debt: any) => {
          const { data: creatorData } = await supabase
            .from('users')
            .select('username, tag')
            .eq('id', debt.shared_expenses.created_by)
            .single();

          return {
            ...debt,
            shared_expense: {
              ...debt.shared_expenses,
              creator: creatorData,
            },
          };
        })
      );

      setMyDebts(debtsWithCreators);

      const { data: myExpenses, error: myExpensesError } = await supabase
        .from('shared_expenses')
        .select('*')
        .eq('house_id', houseId)
        .eq('created_by', user.id);

      if (myExpensesError) throw myExpensesError;

      const creditsData = await Promise.all(
        (myExpenses || []).map(async (expense: any) => {
          const { data: payments } = await supabase
            .from('shared_expense_payments')
            .select('*')
            .eq('expense_id', expense.id)
            .eq('is_paid', false);

          const paymentsWithDebtors = await Promise.all(
            (payments || []).map(async (payment: any) => {
              const { data: debtorData } = await supabase
                .from('users')
                .select('username, tag')
                .eq('id', payment.user_id)
                .single();

              return {
                ...payment,
                debtor: debtorData,
              };
            })
          );

          return {
            expense,
            payments: paymentsWithDebtors,
          };
        })
      );

      setCreditsOwed(creditsData.filter((item) => item.payments.length > 0));
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToExpenses = () => {
    if (!houseId) return;

    const paymentsChannel = supabase
      .channel(`shared_expense_payments:${user?.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_expense_payments',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          loadExpenses();
        }
      )
      .subscribe();

    const expensesChannel = supabase
      .channel(`shared_expenses:${houseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_expenses',
          filter: `house_id=eq.${houseId}`,
        },
        () => {
          loadExpenses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(expensesChannel);
    };
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newExpenseTitle.trim() || !newExpenseAmount || !houseId || !user) return;

    const totalAmount = parseFloat(newExpenseAmount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      alert('Por favor, insira um valor válido maior que 0.');
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

      if (totalMembers <= 1) {
        alert('Não há outros membros na casa para dividir a despesa.');
        setSubmitting(false);
        return;
      }

      const amountPerPerson = totalAmount / totalMembers;

      const { data: expenseData, error: expenseError } = await supabase
        .from('shared_expenses')
        .insert({
          house_id: houseId,
          created_by: user.id,
          title: newExpenseTitle.trim(),
          total_amount: totalAmount,
        })
        .select('id')
        .single();

      if (expenseError) throw expenseError;

      const paymentsToCreate = members
        .filter((member) => member.user_id !== user.id)
        .map((member) => ({
          expense_id: expenseData.id,
          user_id: member.user_id,
          amount_owed: amountPerPerson,
        }));

      const { error: paymentsError } = await supabase
        .from('shared_expense_payments')
        .insert(paymentsToCreate);

      if (paymentsError) throw paymentsError;

      setNewExpenseTitle('');
      setNewExpenseAmount('');
      setShowNewExpense(false);
      await loadExpenses();
    } catch (error) {
      console.error('Error creating shared expense:', error);
      alert('Erro ao criar despesa partilhada. Por favor, tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingExpense || !editTitle.trim() || !editAmount) return;

    const totalAmount = parseFloat(editAmount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      alert('Por favor, insira um valor válido maior que 0.');
      return;
    }

    setSubmitting(true);

    try {
      console.log('Updating expense:', editingExpense.id, 'with title:', editTitle.trim(), 'and amount:', totalAmount);

      const { data: updateData, error: updateError } = await supabase
        .from('shared_expenses')
        .update({
          title: editTitle.trim(),
          total_amount: totalAmount,
        })
        .eq('id', editingExpense.id)
        .select();

      console.log('Update result:', { data: updateData, error: updateError });

      if (updateError) throw updateError;

      const { data: membersData, error: membersError } = await supabase
        .from('house_members')
        .select('user_id')
        .eq('house_id', editingExpense.house_id);

      if (membersError) throw membersError;

      const allMembers = membersData || [];
      const totalHouseMembers = allMembers.length;

      console.log('Total house members (N):', totalHouseMembers);

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('shared_expense_payments')
        .select('*')
        .eq('expense_id', editingExpense.id);

      if (paymentsError) throw paymentsError;

      const payments = paymentsData || [];
      const totalDebtors = payments.length;

      console.log('Total debtors (N-1):', totalDebtors);

      if (totalHouseMembers > 0 && payments.length > 0) {
        const amountPerPerson = totalAmount / totalHouseMembers;
        console.log('========================================');
        console.log('EXPENSE RECALCULATION:');
        console.log('Total Amount:', totalAmount, '€');
        console.log('Total House Members (N):', totalHouseMembers);
        console.log('Total Debtors (N-1):', totalDebtors);
        console.log('✓ CORRECT FORMULA: Amount / N =', totalAmount, '/', totalHouseMembers, '=', amountPerPerson, '€ per person');
        console.log('✗ WRONG FORMULA: Amount / (N-1) =', totalAmount, '/', totalDebtors, '=', (totalAmount / totalDebtors).toFixed(2), '€ per person');
        console.log('Difference:', ((totalAmount / totalDebtors) - amountPerPerson).toFixed(2), '€ overcharge per person');
        console.log('========================================');

        const updatePromises = payments.map(async (payment) => {
          const { data: updatedPayment, error: paymentUpdateError } = await supabase
            .from('shared_expense_payments')
            .update({ amount_owed: amountPerPerson })
            .eq('id', payment.id)
            .select();

          console.log('Updated payment:', payment.id, 'result:', { data: updatedPayment, error: paymentUpdateError });

          if (paymentUpdateError) {
            console.error('Error updating payment:', payment.id, paymentUpdateError);
            throw paymentUpdateError;
          }

          return updatedPayment;
        });

        await Promise.all(updatePromises);
        console.log('All payments updated successfully');
      }

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
        .from('shared_expenses')
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

  const handlePayDebt = async (paymentId: string) => {
    setMyDebts((prev) => prev.filter((debt) => debt.id !== paymentId));
    setConfirmingPayment(null);

    try {
      const { error } = await supabase
        .from('shared_expense_payments')
        .update({
          is_paid: true,
          paid_at: new Date().toISOString(),
        })
        .eq('id', paymentId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      alert('Erro ao registar pagamento. Por favor, tente novamente.');
      await loadExpenses();
    }
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
        <h2 className="text-2xl font-bold text-white">Despesas Partilhadas</h2>
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
          <h3 className="text-lg font-semibold text-white mb-4">Criar Despesa Partilhada</h3>
          <form onSubmit={handleCreateExpense} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Título
              </label>
              <input
                type="text"
                value={newExpenseTitle}
                onChange={(e) => setNewExpenseTitle(e.target.value)}
                placeholder="Ex: Papel Higiénico, Detergente"
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
                value={newExpenseAmount}
                onChange={(e) => setNewExpenseAmount(e.target.value)}
                placeholder="Ex: 2.50"
                disabled={submitting}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-600 disabled:cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-slate-400">
                O valor será dividido igualmente entre todos os membros
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
            <h3 className="text-lg font-semibold text-white">Editar Despesa Partilhada</h3>
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
            <User className="w-5 h-5" />
            Minhas Dívidas
          </h3>
          {myDebts.length === 0 ? (
            <div className="text-center py-8 bg-slate-800 rounded-xl">
              <p className="text-slate-400">Não tem dívidas pendentes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myDebts.map((debt) => (
                <div key={debt.id} className="space-y-2">
                  <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-white mb-2">
                          {debt.shared_expense?.title}
                        </h4>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-2 text-green-400 font-semibold">
                            <DollarSign className="w-4 h-4" />
                            <span>{debt.amount_owed.toFixed(2)} €</span>
                          </div>
                          {debt.shared_expense?.creator && (
                            <div className="flex items-center gap-2 text-slate-400">
                              <User className="w-4 h-4" />
                              <span>
                                Pagar a: {debt.shared_expense.creator.username}#{debt.shared_expense.creator.tag}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Total da compra: {debt.shared_expense?.total_amount?.toFixed(2)} €
                        </p>
                      </div>
                      <button
                        onClick={() => setConfirmingPayment(debt.id)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                      >
                        Registar Pagamento
                      </button>
                    </div>
                  </div>

                  {confirmingPayment === debt.id && (
                    <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-xl p-4 animate-in slide-in-from-top duration-200">
                      <p className="text-yellow-400 font-semibold mb-3">
                        ⚠️ Tem a certeza que pagou {debt.amount_owed.toFixed(2)} € a {debt.shared_expense?.creator?.username}?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePayDebt(debt.id)}
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
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Créditos a Receber
          </h3>
          {creditsOwed.length === 0 ? (
            <div className="text-center py-8 bg-slate-800 rounded-xl">
              <p className="text-slate-400">Ninguém lhe deve dinheiro</p>
            </div>
          ) : (
            <div className="space-y-4">
              {creditsOwed.map(({ expense, payments }) => (
                <div key={expense.id} className="space-y-2">
                  <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-white mb-2">{expense.title}</h4>
                        <div className="text-sm text-slate-400">
                          Total da compra: <span className="text-green-400 font-semibold">{expense.total_amount.toFixed(2)} €</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingExpense(expense);
                            setEditTitle(expense.title);
                            setEditAmount(expense.total_amount.toString());
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
                      </div>
                    </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-400 mb-2">Pagamentos Pendentes:</p>
                    {payments.map((payment: any) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="text-white">
                            {payment.debtor?.username}#{payment.debtor?.tag}
                          </span>
                        </div>
                        <span className="text-green-400 font-semibold">
                          {payment.amount_owed.toFixed(2)} €
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
