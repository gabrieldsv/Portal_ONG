import React, { useState, useEffect } from 'react';
import { Settings, Users, Database, Shield, Bell, Save, Plus, Trash2, Edit, Check, X } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Tabs from '../../components/ui/Tabs';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';

interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
  full_name?: string;
  phone?: string;
}

const SettingsPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('user');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Get users from auth.users
      const { data: authUsers, error: authError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (authError) throw authError;
      
      setUsers(authUsers || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUserModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setEmail(user.email);
      setRole(user.role || 'user');
      setFullName(user.full_name || '');
      setPhone(user.phone || '');
      setPassword('');
      setConfirmPassword('');
    } else {
      setEditingUser(null);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setRole('user');
      setFullName('');
      setPhone('');
    }
    
    setUserModalOpen(true);
  };

  const handleCreateUser = async () => {
    if (!email) {
      toast.error('Por favor, informe o email');
      return;
    }
    
    if (!editingUser && !password) {
      toast.error('Por favor, informe a senha');
      return;
    }
    
    if (!editingUser && password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    
    try {
      setLoading(true);
      
      if (editingUser) {
        // Update existing user
        const { error } = await supabase
          .from('users')
          .update({
            email,
            role,
            full_name: fullName,
            phone
          })
          .eq('id', editingUser.id);
        
        if (error) throw error;
        
        // If password was provided, update it
        if (password) {
          // In a real app, you would update the user's password in auth.users
          // This is a simplified example
          toast.info('Atualização de senha não implementada nesta versão');
        }
        
        toast.success('Usuário atualizado com sucesso');
      } else {
        // Create new user
        const { data, error } = await supabase
          .from('users')
          .insert({
            email,
            role,
            full_name: fullName,
            phone
          })
          .select()
          .single();
        
        if (error) throw error;
        
        // In a real app, you would create the user in auth.users
        // This is a simplified example
        toast.success('Usuário criado com sucesso');
      }
      
      setUserModalOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error('Erro ao salvar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!editingUser) return;
    
    try {
      setLoading(true);
      
      // Delete user
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', editingUser.id);
      
      if (error) throw error;
      
      toast.success('Usuário excluído com sucesso');
      setDeleteModalOpen(false);
      setUserModalOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Erro ao excluir usuário');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="danger">Administrador</Badge>;
      case 'teacher':
        return <Badge variant="info">Professor</Badge>;
      case 'social_worker':
        return <Badge variant="warning">Assistente Social</Badge>;
      case 'health_professional':
        return <Badge variant="success">Profissional de Saúde</Badge>;
      default:
        return <Badge variant="secondary">Usuário</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>

      <Tabs
        tabs={[
          {
            id: 'general',
            label: 'Geral',
            content: (
              <Card>
                <h3 className="text-lg font-medium mb-4">Configurações Gerais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Nome da Instituição"
                    defaultValue="ONG Amar Sem Limites"
                    fullWidth
                  />
                  <Input
                    label="Email de Contato"
                    type="email"
                    defaultValue="contato@amarsemslimites.org"
                    fullWidth
                  />
                  <Input
                    label="Telefone"
                    defaultValue="(11) 9 9999-9999"
                    fullWidth
                  />
                  <Input
                    label="Endereço"
                    defaultValue="Rua Exemplo, 123 - São Paulo, SP"
                    fullWidth
                  />
                  <Select
                    label="Idioma"
                    options={[
                      { value: 'pt-BR', label: 'Português (Brasil)' },
                      { value: 'en', label: 'English' },
                      { value: 'es', label: 'Español' },
                    ]}
                    fullWidth
                  />
                  <Select
                    label="Fuso Horário"
                    options={[
                      { value: 'America/Sao_Paulo', label: 'Brasília (GMT-3)' },
                      { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
                      { value: 'America/Belem', label: 'Belém (GMT-3)' },
                    ]}
                    fullWidth
                  />
                </div>
                <div className="mt-6 flex justify-end">
                  <Button
                    variant="primary"
                    leftIcon={<Save size={18} />}
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </Card>
            ),
          },
          {
            id: 'users',
            label: 'Usuários',
            content: (
              <Card>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Gerenciar Usuários</h3>
                  <Button
                    variant="primary"
                    leftIcon={<Users size={18} />}
                    onClick={() => handleOpenUserModal()}
                  >
                    Novo Usuário
                  </Button>
                </div>
                
                {loading && users.length === 0 ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : users.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Usuário
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Função
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Data de Criação
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-medium">
                                  {user.email.charAt(0).toUpperCase()}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {user.full_name || 'Usuário'}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {user.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getRoleBadge(user.role)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(user.created_at).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  leftIcon={<Edit size={16} />}
                                  onClick={() => handleOpenUserModal(user)}
                                >
                                  Editar
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  leftIcon={<Trash2 size={16} />}
                                  onClick={() => {
                                    setEditingUser(user);
                                    setDeleteModalOpen(true);
                                  }}
                                >
                                  Excluir
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-8 rounded-lg text-center">
                    <Users size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">Nenhum usuário encontrado</p>
                    <Button
                      variant="primary"
                      className="mt-4"
                      onClick={() => handleOpenUserModal()}
                    >
                      Adicionar Usuário
                    </Button>
                  </div>
                )}
              </Card>
            ),
          },
          {
            id: 'database',
            label: 'Banco de Dados',
            content: (
              <Card>
                <h3 className="text-lg font-medium mb-4">Configurações do Banco de Dados</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-start">
                      <Database size={24} className="text-blue-500 mr-3 mt-1" />
                      <div>
                        <h4 className="font-medium">Backup Automático</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Os backups são realizados automaticamente todos os dias às 03:00. 
                          Os últimos 7 backups são mantidos.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium">Backup Manual</p>
                      <p className="text-sm text-gray-500">Realizar backup completo do banco de dados agora</p>
                    </div>
                    <Button variant="primary" size="sm">
                      Iniciar Backup
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium">Restaurar Backup</p>
                      <p className="text-sm text-gray-500">Restaurar o banco de dados a partir de um backup anterior</p>
                    </div>
                    <Button variant="secondary" size="sm">
                      Selecionar Backup
                    </Button>
                  </div>
                </div>
              </Card>
            ),
          },
          {
            id: 'security',
            label: 'Segurança',
            content: (
              <Card>
                <h3 className="text-lg font-medium mb-4">Configurações de Segurança</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium">Autenticação de Dois Fatores</p>
                      <p className="text-sm text-gray-500">Exigir autenticação de dois fatores para todos os usuários</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium">Tempo de Sessão</p>
                      <p className="text-sm text-gray-500">Tempo máximo de inatividade antes de encerrar a sessão</p>
                    </div>
                    <Select
                      options={[
                        { value: '15', label: '15 minutos' },
                        { value: '30', label: '30 minutos' },
                        { value: '60', label: '1 hora' },
                        { value: '120', label: '2 horas' },
                      ]}
                      className="w-40"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium">Política de Senhas</p>
                      <p className="text-sm text-gray-500">Requisitos mínimos para senhas de usuários</p>
                    </div>
                    <Select
                      options={[
                        { value: 'basic', label: 'Básico' },
                        { value: 'medium', label: 'Médio' },
                        { value: 'strong', label: 'Forte' },
                      ]}
                      className="w-40"
                    />
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <Button
                    variant="primary"
                    leftIcon={<Shield size={18} />}
                  >
                    Salvar Configurações
                  </Button>
                </div>
              </Card>
            ),
          },
          {
            id: 'permissions',
            label: 'Permissões',
            content: (
              <Card>
                <h3 className="text-lg font-medium mb-4">Configurações de Permissões</h3>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Administrador</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">Usuários com esta função têm acesso completo ao sistema:</p>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        <li>Gerenciar usuários e permissões</li>
                        <li>Acesso a todos os módulos do sistema</li>
                        <li>Configurações do sistema</li>
                        <li>Gerenciar todos os registros</li>
                        <li>Gerar todos os relatórios</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Professor</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">Usuários com esta função têm acesso a:</p>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        <li>Visualizar alunos e cursos</li>
                        <li>Registrar frequência</li>
                        <li>Criar e gerenciar planos de aula</li>
                        <li>Visualizar relatórios de frequência</li>
                        <li>Visualizar informações básicas de alunos</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Assistente Social</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">Usuários com esta função têm acesso a:</p>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        <li>Visualizar alunos</li>
                        <li>Registrar atendimentos sociais</li>
                        <li>Gerenciar encaminhamentos</li>
                        <li>Visualizar relatórios de assistência social</li>
                        <li>Visualizar informações detalhadas de alunos</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Profissional de Saúde</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">Usuários com esta função têm acesso a:</p>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        <li>Visualizar alunos</li>
                        <li>Registrar atendimentos de saúde</li>
                        <li>Gerenciar fichas de saúde</li>
                        <li>Visualizar relatórios de saúde</li>
                        <li>Visualizar informações detalhadas de alunos</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-start">
                    <Shield size={24} className="text-yellow-500 mr-3 mt-1" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Permissões Personalizadas</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Para configurar permissões personalizadas para funções específicas, entre em contato com o suporte técnico.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ),
          },
        ]}
      />

      {/* User Modal */}
      <Modal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title={editingUser ? 'Editar Usuário' : 'Novo Usuário'}
        footer={
          <div className="flex justify-between">
            <div>
              {editingUser && (
                <Button
                  variant="danger"
                  onClick={() => setDeleteModalOpen(true)}
                >
                  Excluir
                </Button>
              )}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="secondary"
                onClick={() => setUserModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateUser}
                isLoading={loading}
              >
                {editingUser ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nome Completo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nome completo do usuário"
            fullWidth
          />
          
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemplo.com"
            required
            fullWidth
          />
          
          <Input
            label="Telefone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(00) 00000-0000"
            fullWidth
          />
          
          <Select
            label="Função"
            options={[
              { value: 'admin', label: 'Administrador' },
              { value: 'teacher', label: 'Professor' },
              { value: 'social_worker', label: 'Assistente Social' },
              { value: 'health_professional', label: 'Profissional de Saúde' },
              { value: 'user', label: 'Usuário Padrão' },
            ]}
            value={role}
            onChange={setRole}
            required
            fullWidth
          />
          
          <Input
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={editingUser ? "Deixe em branco para manter a senha atual" : "Senha"}
            required={!editingUser}
            fullWidth
          />
          
          {(!editingUser || password) && (
            <Input
              label="Confirmar Senha"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirme a senha"
              required={!editingUser || !!password}
              fullWidth
            />
          )}
          
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Permissões da Função: {role}</h4>
            <div className="space-y-2">
              {role === 'admin' && (
                <div className="flex items-center">
                  <Check size={16} className="text-green-500 mr-2" />
                  <span className="text-sm">Acesso completo ao sistema</span>
                </div>
              )}
              {role === 'teacher' && (
                <>
                  <div className="flex items-center">
                    <Check size={16} className="text-green-500 mr-2" />
                    <span className="text-sm">Gerenciar cursos e frequência</span>
                  </div>
                  <div className="flex items-center">
                    <X size={16} className="text-red-500 mr-2" />
                    <span className="text-sm">Sem acesso a configurações do sistema</span>
                  </div>
                </>
              )}
              {role === 'social_worker' && (
                <>
                  <div className="flex items-center">
                    <Check size={16} className="text-green-500 mr-2" />
                    <span className="text-sm">Gerenciar assistência social</span>
                  </div>
                  <div className="flex items-center">
                    <X size={16} className="text-red-500 mr-2" />
                    <span className="text-sm">Acesso limitado a outros módulos</span>
                  </div>
                </>
              )}
              {role === 'health_professional' && (
                <>
                  <div className="flex items-center">
                    <Check size={16} className="text-green-500 mr-2" />
                    <span className="text-sm">Gerenciar registros de saúde</span>
                  </div>
                  <div className="flex items-center">
                    <X size={16} className="text-red-500 mr-2" />
                    <span className="text-sm">Acesso limitado a outros módulos</span>
                  </div>
                </>
              )}
              {role === 'user' && (
                <>
                  <div className="flex items-center">
                    <Check size={16} className="text-green-500 mr-2" />
                    <span className="text-sm">Visualizar informações básicas</span>
                  </div>
                  <div className="flex items-center">
                    <X size={16} className="text-red-500 mr-2" />
                    <span className="text-sm">Sem permissões de edição</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirmar Exclusão"
        footer={
          <div className="flex justify-end space-x-2">
            <Button
              variant="secondary"
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteUser}
              isLoading={loading}
            >
              Excluir
            </Button>
          </div>
        }
      >
        <p>Tem certeza que deseja excluir o usuário <strong>{editingUser?.email}</strong>?</p>
        <p className="mt-2 text-sm text-gray-500">
          Esta ação não pode ser desfeita. O usuário perderá acesso ao sistema imediatamente.
        </p>
      </Modal>
    </div>
  );
};

export default SettingsPage;