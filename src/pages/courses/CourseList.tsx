import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, BookOpen } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Course } from '../../types';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

const CourseList: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          course.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    // Add more filters as needed
    
    return matchesSearch;
  });

  const columns = [
    {
      header: 'Nome',
      accessor: (course: Course) => (
        <div>
          <p className="font-medium text-gray-900">{course.name}</p>
          <p className="text-xs text-gray-500">{course.description.substring(0, 50)}...</p>
        </div>
      ),
    },
    {
      header: 'Carga Horária',
      accessor: (course: Course) => `${course.workload_hours}h`,
    },
    {
      header: 'Turno',
      accessor: (course: Course) => {
        const shift = course.shift;
        if (shift === 'morning') return <Badge variant="info">Manhã</Badge>;
        if (shift === 'afternoon') return <Badge variant="warning">Tarde</Badge>;
        if (shift === 'evening') return <Badge variant="primary">Noite</Badge>;
        return <Badge>{shift}</Badge>;
      },
    },
    {
      header: 'Vagas',
      accessor: (course: Course) => course.available_spots,
    },
    {
      header: 'Ações',
      accessor: (course: Course) => (
        <div className="flex space-x-2">
          <Link to={`/cursos/${course.id}`}>
            <Button variant="secondary" size="sm">Ver</Button>
          </Link>
          <Link to={`/cursos/${course.id}/editar`}>
            <Button variant="primary" size="sm">Editar</Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Cursos</h1>
        <Link to="/cursos/novo">
          <Button variant="primary" leftIcon={<BookOpen size={18} />}>
            Novo Curso
          </Button>
        </Link>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nome ou descrição..."
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
              variant={filter === 'morning' ? 'primary' : 'secondary'}
              onClick={() => setFilter('morning')}
            >
              Manhã
            </Button>
            <Button
              variant={filter === 'afternoon' ? 'primary' : 'secondary'}
              onClick={() => setFilter('afternoon')}
            >
              Tarde
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
          data={filteredCourses}
          keyExtractor={(course) => course.id}
          isLoading={loading}
          onRowClick={(course) => {
            window.location.href = `/cursos/${course.id}`;
          }}
          emptyMessage="Nenhum curso encontrado"
        />
      </Card>
    </div>
  );
};

export default CourseList;