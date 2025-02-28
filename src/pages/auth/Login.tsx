import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Mail, Lock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        setError('Email ou senha inválidos');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError('Ocorreu um erro ao fazer login');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-blue-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center">
            <Heart size={48} className="text-pink-500" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">ONG Amar Sem Limites</h1>
          <p className="mt-2 text-gray-600">Faça login para acessar o sistema</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
            fullWidth
            leftIcon={<Mail size={18} />}
          />
          
          <Input
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Sua senha"
            required
            fullWidth
            leftIcon={<Lock size={18} />}
          />
          
          <div className="mt-2 mb-6 text-right">
            <a href="#" className="text-sm text-blue-600 hover:text-blue-800">
              Esqueceu a senha?
            </a>
          </div>
          
          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={loading}
          >
            Entrar
          </Button>
        </form>
        
        <div className="mt-6 text-center text-sm text-gray-600">
          Não tem uma conta?{' '}
          <a href="#" className="text-blue-600 hover:text-blue-800">
            Entre em contato com o administrador
          </a>
        </div>
      </Card>
    </div>
  );
};

export default Login;