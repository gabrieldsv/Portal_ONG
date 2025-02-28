import React, { useState } from 'react';
import { User, Mail, Phone, Lock, Save } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Tabs from '../../components/ui/Tabs';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSaveProfile = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const handleChangePassword = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Perfil</h1>

      <Tabs
        tabs={[
          {
            id: 'info',
            label: 'Informações Pessoais',
            content: (
              <Card>
                <div className="flex flex-col items-center mb-6">
                  <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 text-4xl font-medium mb-4">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <h2 className="text-xl font-bold">{user?.email || 'Usuário'}</h2>
                  <p className="text-gray-500">Administrador</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Nome Completo"
                    leftIcon={<User size={18} />}
                    defaultValue="Administrador"
                    fullWidth
                  />
                  <Input
                    label="Email"
                    type="email"
                    leftIcon={<Mail size={18} />}
                    defaultValue={user?.email || ''}
                    fullWidth
                  />
                  <Input
                    label="Telefone"
                    leftIcon={<Phone size={18} />}
                    defaultValue="(11) 9 9999-9999"
                    fullWidth
                  />
                  <Input
                    label="Cargo"
                    defaultValue="Administrador"
                    fullWidth
                  />
                </div>

                <div className="mt-6 flex justify-end">
                  <Button
                    variant="primary"
                    leftIcon={<Save size={18} />}
                    onClick={handleSaveProfile}
                    isLoading={loading}
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </Card>
            ),
          },
          {
            id: 'security',
            label: 'Segurança',
            content: (
              <Card>
                <h3 className="text-lg font-medium mb-4">Alterar Senha</h3>
                <div className="space-y-4">
                  <Input
                    label="Senha Atual"
                    type="password"
                    leftIcon={<Lock size={18} />}
                    fullWidth
                  />
                  <Input
                    label="Nova Senha"
                    type="password"
                    leftIcon={<Lock size={18} />}
                    fullWidth
                  />
                  <Input
                    label="Confirmar Nova Senha"
                    type="password"
                    leftIcon={<Lock size={18} />}
                    fullWidth
                  />
                </div>

                <div className="mt-6 flex justify-end">
                  <Button
                    variant="primary"
                    leftIcon={<Save size={18} />}
                    onClick={handleChangePassword}
                    isLoading={loading}
                  >
                    Alterar Senha
                  </Button>
                </div>
              </Card>
            ),
          },
          {
            id: 'notifications',
            label: 'Notificações',
            content: (
              <Card>
                <h3 className="text-lg font-medium mb-4">Preferências de Notificação</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium">Novos Alunos</p>
                      <p className="text-sm text-gray-500">Receber notificações quando novos alunos forem cadastrados</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium">Matrículas</p>
                      <p className="text-sm text-gray-500">Receber notificações sobre novas matrículas</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium">Atendimentos</p>
                      <p className="text-sm text-gray-500">Receber notificações sobre novos atendimentos</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button
                    variant="primary"
                    leftIcon={<Save size={18} />}
                    onClick={() => {}}
                  >
                    Salvar Preferências
                  </Button>
                </div>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
};

export default ProfilePage;