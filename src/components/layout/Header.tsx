import React from 'react';
import { Bell, Menu, Search } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
  toggleSidebar: () => void;
  title: string;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, title }) => {
  const { user } = useAuth();

  return (
    <header className="bg-white shadow-sm h-16 flex items-center px-4 sticky top-0 z-10">
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 lg:hidden"
      >
        <Menu size={24} />
      </button>
      
      <h1 className="text-xl font-semibold text-gray-800 ml-4">{title}</h1>
      
      <div className="flex-1 mx-4 hidden md:block">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      
      <div className="flex items-center">
        <button className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 relative">
          <Bell size={20} />
          <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500"></span>
        </button>
        
        <div className="ml-4 flex items-center">
          <div className="h-8 w-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-800 font-medium">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="ml-2 text-sm font-medium text-gray-700 hidden md:block">
            {user?.email || 'Usuário'}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;