import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Student } from '../../types';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

const StudentList: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) {
        throw error;
      }

      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch = student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.cpf.includes(searchTerm) ||
                          student.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    // Add more filters as needed
    
    return matchesSearch;
  });

  const columns = [
    {
      header: 'Nome',
      accessor: (student: Student) => (
        <div>
          <p className="font-medium text-gray-900">{student.full_name}</p>
          <p className="text-xs text-gray-500">{student.cpf}</p>
        </div>
      ),
    },
    {
      header: 'Idade',
      accessor: 'age',
    },
    {
      header: 'Contato',
      accessor: (student: Student) => (
        <div>
          <p>{student.phone}</p>
          <p className="text-xs text-gray-500">{student.email}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: () => (
        <Badge variant="success">Ativo</Badge>
      ),
    },
    {
      header: 'Ações',
      accessor: (student: Student) => (
        <div className="flex space-x-2">
          <Link to={`/alunos/${student.id}`}>
            <Button variant="secondary" size="sm">Ver</Button>
          </Link>
          <Link to={`/alunos/${student.id}/editar`}>
            <Button variant="primary" size="sm">Editar</Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Alunos</h1>
        <Link to="/alunos/novo">
          <Button variant="primary" leftIcon={<UserPlus size={18} />}>
            Novo Aluno
          </Button>
        </Link>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nome, CPF ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search size={18} />}
              fullWidth
            />
          </div>
          <div className="flex space-x-2">
            <Button
              variant={filter === 'all' ? 'primary' : 'secondary'}
              onClick={() => setFilter('all')}
            >
              Todos
            </Button>
            <Button
              variant={filter === 'active' ? 'primary' : 'secondary'}
              onClick={() => setFilter('active')}
            >
              Ativos
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Filter size={18} />}
            >
              Mais Filtros
            </Button>
          </div>
        </div>

        <Table
          columns={columns}
          data={filteredStudents}
          keyExtractor={(student) => student.id}
          isLoading={loading}
          onRowClick={(student) => {
            window.location.href = `/alunos/${student.id}`;
          }}
          emptyMessage="Nenhum aluno encontrado"
        />
      </Card>
    </div>
  );
};

export default StudentList;