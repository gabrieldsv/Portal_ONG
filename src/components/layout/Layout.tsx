import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const getPageTitle = () => {
    const path = location.pathname;
    
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/alunos')) return 'Alunos';
    if (path.startsWith('/cursos')) return 'Cursos';
    if (path.startsWith('/frequencia')) return 'Frequência';
    if (path.startsWith('/assistencia-social')) return 'Assistência Social';
    if (path.startsWith('/saude')) return 'Saúde';
    if (path.startsWith('/relatorios')) return 'Relatórios';
    if (path.startsWith('/perfil')) return 'Perfil';
    if (path.startsWith('/configuracoes')) return 'Configurações';
    
    return 'ONG Amar Sem Limites';
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <div className={`fixed inset-0 z-20 transition-opacity bg-black opacity-50 lg:hidden ${
        sidebarOpen ? 'block' : 'hidden'
      }`} onClick={toggleSidebar}></div>
      
      <div className={`fixed inset-y-0 left-0 z-30 w-64 transition duration-300 transform bg-white lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0 ease-out' : '-translate-x-full ease-in'
      }`}>
        <Sidebar />
      </div>
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header toggleSidebar={toggleSidebar} title={getPageTitle()} />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;