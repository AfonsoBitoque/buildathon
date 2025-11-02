import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, Home, Users, Calendar, DollarSign } from 'lucide-react';

export function HomeScreen() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center space-y-6 mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-colivin rounded-3xl shadow-colivin-lg mb-4">
            <Home className="w-12 h-12 text-white" />
          </div>

          <h1 className="text-6xl font-bold bg-gradient-colivin bg-clip-text text-transparent tracking-tight">
            Co-Livin
          </h1>

          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Gerir a sua casa partilhada nunca foi tão simples.<br />
            Tarefas, despesas, calendário e muito mais, tudo num só lugar.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center justify-center gap-3 px-8 py-5 bg-gradient-colivin hover:opacity-90 text-white font-bold rounded-2xl shadow-colivin hover:shadow-colivin-lg transform hover:scale-105 transition-all duration-200"
          >
            <LogIn className="w-6 h-6" />
            Entrar
          </button>

          <button
            onClick={() => navigate('/signup')}
            className="flex items-center justify-center gap-3 px-8 py-5 bg-white hover:bg-gray-50 text-gray-900 font-bold rounded-2xl shadow-lg border-2 border-gray-200 hover:border-colivin-cobalt-300 transform hover:scale-105 transition-all duration-200"
          >
            <UserPlus className="w-6 h-6" />
            Criar Conta
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-colivin p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Funcionalidades
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-colivin-lime-100 rounded-2xl">
                <Users className="w-7 h-7 text-colivin-lime-600" />
              </div>
              <h3 className="font-bold text-gray-900">Tarefas</h3>
              <p className="text-sm text-gray-600">
                Organize tarefas e responsabilidades entre colegas
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-colivin-cobalt-100 rounded-2xl">
                <DollarSign className="w-7 h-7 text-colivin-cobalt-600" />
              </div>
              <h3 className="font-bold text-gray-900">Despesas</h3>
              <p className="text-sm text-gray-600">
                Controle despesas partilhadas e pagamentos
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-colivin-mint-100 rounded-2xl">
                <Calendar className="w-7 h-7 text-colivin-mint-600" />
              </div>
              <h3 className="font-bold text-gray-900">Calendário</h3>
              <p className="text-sm text-gray-600">
                Agende uso de recursos comuns da casa
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Co-Livin • Viver em Comunidade, Simplificado
          </p>
        </div>
      </div>
    </div>
  );
}
