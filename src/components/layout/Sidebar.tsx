import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Users, BookOpen, Calendar, FileText, Activity, 
  Home, LogOut, Settings, User, Heart
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const Sidebar: React.FC = () => {
  const { signOut } = useAuth();

  const navItems = [
    { to: '/', icon: <Home size={20} />, label: 'Início' },
    { to: '/alunos', icon: <Users size={20} />, label: 'Alunos' },
    { to: '/cursos', icon: <BookOpen size={20} />, label: 'Cursos' },
    { to: '/frequencia', icon: <Calendar size={20} />, label: 'Frequência' },
    { to: '/assistencia-social', icon: <Heart size={20} />, label: 'Assistência Social' },
    { to: '/saude', icon: <Activity size={20} />, label: 'Saúde' },
    { to: '/relatorios', icon: <FileText size={20} />, label: 'Relatórios' },
    { to: '/perfil', icon: <User size={20} />, label: 'Perfil' },
    { to: '/configuracoes', icon: <Settings size={20} />, label: 'Configurações' },
  ];

  return (
    <aside className="bg-white w-64 min-h-screen shadow-md flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-center">
          <Heart size={32} className="text-pink-500" />
          <h1 className="ml-2 text-xl font-bold text-gray-800">Amar Sem Limites</h1>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-blue-100 text-blue-900'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={signOut}
          className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-700 rounded-md hover:bg-red-100"
        >
          <LogOut size={20} className="mr-3" />
          Sair
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;