import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { MessageCircle, CheckSquare, DollarSign, ScrollText, Calendar, Home } from 'lucide-react';

export function HouseFooter() {
  const navigate = useNavigate();
  const { id: houseId } = useParams<{ id: string }>();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === `/casa/${houseId}${path}`;
  };

  const navItems = [
    {
      path: '',
      icon: Home,
      label: 'Home',
    },
    {
      path: '/home',
      icon: MessageCircle,
      label: 'Chat',
    },
    {
      path: '/tarefas',
      icon: CheckSquare,
      label: 'Tarefas',
    },
    {
      path: '/despesas',
      icon: DollarSign,
      label: 'Despesas',
    },
    {
      path: '/calendario',
      icon: Calendar,
      label: 'Calendário',
    },
    {
      path: '/regras',
      icon: ScrollText,
      label: 'Regras',
    },
  ];

  return (
    <div className="bg-white border-t-2 border-gray-200 shadow-lg">
      <div className="flex items-center justify-around px-2 py-2 max-w-7xl mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(`/casa/${houseId}${item.path}`)}
              className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl transition-all min-w-[60px] ${
                active
                  ? 'bg-gradient-colivin text-white shadow-colivin'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
              <span className="text-xs font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
