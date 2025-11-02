import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { MessageCircle, CheckSquare, DollarSign, ScrollText, Calendar } from 'lucide-react';

export function HouseFooter() {
  const navigate = useNavigate();
  const { id: houseId } = useParams<{ id: string }>();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === `/casa/${houseId}${path}`;
  };

  const navItems = [
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
    <div className="bg-slate-800 border-t border-slate-700">
      <div className="flex items-center justify-around px-4 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(`/casa/${houseId}${item.path}`)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
