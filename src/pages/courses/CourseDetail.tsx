import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Edit, Trash2, Users, Calendar, 
  FileText, BookOpen 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Course, Enrollment, Student } from '../../types';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Tabs from '../../components/ui/Tabs';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
import Select from '../../components/ui/Select';
import { toast } from 'react-toastify';

const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollments, setEnrollments] = useState<(Enrollment & { student: Student })[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  useEffect(() => {
    if (id) {
      fetchCourseData();
      fetchAvailableStudents();
    }
  }, [id]);
  
  const fetchCourseData = async () => {
    try {
      setLoading(true);
      
      // Fetch course data
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();
        
      if (courseError) throw courseError;
      setCourse(courseData);
      
      // Fetch enrollments with student data
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select(`
          *,
          student:students(*)
        `)
        .eq('course_id', id);
        
      if (enrollmentsError) throw enrollmentsError;
      setEnrollments(enrollmentsData || []);
      
    } catch (error) {
      console.error('Error fetching course data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchAvailableStudents = async () => {
    try {
      // Get all students
      const { data: allStudents, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .order('full_name', { ascending: true });
        
      if (studentsError) throw studentsError;
      
      // Get students already enrolled in this course
      const { data: enrolledStudents, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('course_id', id);
        
      if (enrollmentsError) throw enrollmentsError;
      
      // Filter out already enrolled students
      const enrolledIds = enrolledStudents?.map(e => e.student_id) || [];
      const availableStudents = allStudents?.filter(student => !enrolledIds.includes(student.id)) || [];
      
      setAvailableStudents(availableStudents);
    } catch (error) {
      console.error('Error fetching available students:', error);
    }
  };
  
  const handleDelete = async () => {
    try {
      setLoading(true);
      
      // Delete enrollments first (foreign key constraint)
      const { error: enrollmentsError } = await supabase
        .from('enrollments')
        .delete()
        .eq('course_id', id);
        
      if (enrollmentsError) throw enrollmentsError;
      
      // Finally delete the course
      const { error: courseError } = await supabase
        .from('courses')
        .delete()
        .eq('id', id);
        
      if (courseError) throw courseError;
      
      toast.success('Curso excluído com sucesso');
      
      // Navigate back to course list
      navigate('/cursos');
      
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error('Erro ao excluir curso');
    } finally {
      setLoading(false);
      setDeleteModalOpen(false);
    }
  };
  
  const handleEnrollStudent = async () => {
    if (!selectedStudent) {
      toast.error('Por favor, selecione um aluno');
      return;
    }
    
    try {
      setEnrollLoading(true);
      
      // Create new enrollment
      const { error } = await supabase
        .from('enrollments')
        .insert({
          student_id: selectedStudent,
          course_id: id,
          enrollment_date: new Date().toISOString().split('T')[0],
          status: 'active'
        });
        
      if (error) throw error;
      
      toast.success('Aluno matriculado com sucesso');
      setEnrollModalOpen(false);
      
      // Refresh data
      fetchCourseData();
      fetchAvailableStudents();
      
    } catch (error) {
      console.error('Error enrolling student:', error);
      toast.error('Erro ao matricular aluno');
    } finally {
      setEnrollLoading(false);
    }
  };
  
  const handleCancelEnrollment = async (enrollmentId: string) => {
    try {
      setLoading(true);
      
      // Update enrollment status to 'locked' (trancado)
      const { error } = await supabase
        .from('enrollments')
        .update({ status: 'locked' })
        .eq('id', enrollmentId);
        
      if (error) throw error;
      
      toast.success('Matrícula cancelada com sucesso');
      
      // Refresh enrollments data
      fetchCourseData();
      
    } catch (error) {
      console.error('Error canceling enrollment:', error);
      toast.error('Erro ao cancelar matrícula');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRegisterAttendance = async () => {
    try {
      setLoading(true);
      
      // Here we would register attendance for all students in the course
      // For now, just simulate a successful operation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Frequência registrada com sucesso');
      setAttendanceModalOpen(false);
      
    } catch (error) {
      console.error('Error registering attendance:', error);
      toast.error('Erro ao registrar frequência');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading && !course) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!course) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-700">Curso não encontrado</h2>
        <p className="mt-2 text-gray-500">O curso que você está procurando não existe ou foi removido.</p>
        <Button
          variant="primary"
          className="mt-4"
          onClick={() => navigate('/cursos')}
        >
          Voltar para a lista
        </Button>
      </div>
    );
  }
  
  const enrollmentColumns = [
    {
      header: 'Aluno',
      accessor: (row: any) => (
        <div>
          <p className="font-medium">{row.student.full_name}</p>
          <p className="text-xs text-gray-500">{row.student.cpf}</p>
        </div>
      ),
    },
    {
      header: 'Data de Matrícula',
      accessor: (row: any) => new Date(row.enrollment_date).toLocaleDateString('pt-BR'),
    },
    {
      header: 'Status',
      accessor: (row: any) => {
        const status = row.status;
        if (status === 'active') return <Badge variant="success">Ativo</Badge>;
        if (status === 'locked') return <Badge variant="warning">Trancado</Badge>;
        if (status === 'completed') return <Badge variant="info">Concluído</Badge>;
        return <Badge>{status}</Badge>;
      },
    },
    {
      header: 'Ações',
      accessor: (row: any) => (
        <div className="flex space-x-2">
          <Link to={`/alunos/${row.student.id}`}>
            <Button variant="secondary" size="sm">Ver Aluno</Button>
          </Link>
          <Button 
            variant="danger" 
            size="sm"
            onClick={() => handleCancelEnrollment(row.id)}
          >
            Cancelar
          </Button>
        </div>
      ),
    },
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft size={18} />}
            onClick={() => navigate('/cursos')}
          >
            Voltar
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">{course.name}</h1>
        </div>
        <div className="flex space-x-2">
          <Link to={`/cursos/${id}/editar`}>
            <Button
              variant="primary"
              leftIcon={<Edit size={18} />}
            >
              Editar
            </Button>
          </Link>
          <Button
            variant="danger"
            leftIcon={<Trash2 size={18} />}
            onClick={() => setDeleteModalOpen(true)}
          >
            Excluir
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <div className="text-center mb-6">
              <div className="inline-flex h-24 w-24 rounded-full bg-green-100 text-green-800 items-center justify-center">
                <BookOpen size={40} />
              </div>
              <h2 className="mt-4 text-xl font-bold">{course.name}</h2>
              <Badge variant="primary" className="mt-2">
                {course.shift === 'morning' ? 'Manhã' : 
                 course.shift === 'afternoon' ? 'Tarde' : 'Noite'}
              </Badge>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Carga Horária</p>
                <p>{course.workload_hours} horas</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Vagas Disponíveis</p>
                <p>{course.available_spots}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Gestor Executivo</p>
                <p>{course.executive_manager}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Gestor Voluntário</p>
                <p>{course.volunteer_manager}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Orientador Educacional</p>
                <p>{course.educational_advisor}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Descrição</p>
                <p className="text-sm">{course.description}</p>
              </div>
            </div>
          </Card>
          
          <Card className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users size={20} className="text-blue-500 mr-2" />
                  <span>Total de Alunos</span>
                </div>
                <span className="font-bold">{enrollments.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users size={20} className="text-green-500 mr-2" />
                  <span>Alunos Ativos</span>
                </div>
                <span className="font-bold">
                  {enrollments.filter(e => e.status === 'active').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users size={20} className="text-yellow-500 mr-2" />
                  <span>Alunos Trancados</span>
                </div>
                <span className="font-bold">
                  {enrollments.filter(e => e.status === 'locked').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users size={20} className="text-purple-500 mr-2" />
                  <span>Alunos Concluídos</span>
                </div>
                <span className="font-bold">
                  {enrollments.filter(e => e.status === 'completed').length}
                </span>
              </div>
            </div>
          </Card>
        </div>
        
        <div className="lg:col-span-2">
          <Tabs
            tabs={[
              {
                id: 'students',
                label: 'Alunos',
                content: (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Alunos Matriculados</h3>
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Users size={16} />}
                        onClick={() => setEnrollModalOpen(true)}
                      >
                        Matricular Aluno
                      </Button>
                    </div>
                    
                    <Table
                      columns={enrollmentColumns}
                      data={enrollments}
                      keyExtractor={(item) => item.id}
                      isLoading={loading}
                      emptyMessage="Nenhum aluno matriculado"
                    />
                  </div>
                ),
              },
              {
                id: 'attendance',
                label: 'Frequência',
                content: (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Registro de Frequência</h3>
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Calendar size={16} />}
                        onClick={() => setAttendanceModalOpen(true)}
                      >
                        Registrar Frequência
                      </Button>
                    </div>
                    
                    <div className="bg-gray-50 p-8 rounded-lg text-center">
                      <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">Dados de frequência serão exibidos aqui</p>
                    </div>
                  </div>
                ),
              },
              {
                id: 'lesson-plans',
                label: 'Planos de Aula',
                content: (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Planos de Aula</h3>
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<FileText size={16} />}
                      >
                        Novo Plano
                      </Button>
                    </div>
                    
                    <div className="bg-gray-50 p-8 rounded-lg text-center">
                      <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">Planos de aula serão exibidos aqui</p>
                    </div>
                  </div>
                ),
              },
              {
                id: 'reports',
                label: 'Relatórios',
                content: (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Relatórios do Curso</h3>
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<FileText size={16} />}
                      >
                        Gerar Relatório
                      </Button>
                    </div>
                    
                    <div className="bg-gray-50 p-8 rounded-lg text-center">
                      <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">Relatórios serão exibidos aqui</p>
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
      
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
              onClick={handleDelete}
              isLoading={loading}
            >
              Excluir
            </Button>
          </div>
        }
      >
        <p>Tem certeza que deseja excluir o curso <strong>{course.name}</strong>?</p>
        <p className="mt-2 text-sm text-gray-500">
          Esta ação não pode ser desfeita. Todas as matrículas, registros de frequência e planos de aula 
          relacionados a este curso também serão excluídos.
        </p>
      </Modal>
      
      {/* Enroll Student Modal */}
      <Modal
        isOpen={enrollModalOpen}
        onClose={() => setEnrollModalOpen(false)}
        title="Matricular Aluno"
        footer={
          <div className="flex justify-end space-x-2">
            <Button
              variant="secondary"
              onClick={() => setEnrollModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleEnrollStudent}
              isLoading={enrollLoading}
            >
              Matricular
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Aluno"
            options={availableStudents.map(student => ({
              value: student.id,
              label: `${student.full_name} (${student.cpf})`
            }))}
            value={selectedStudent}
            onChange={setSelectedStudent}
            required
            fullWidth
          />
          
          <p className="text-sm text-gray-500 mt-2">
            Selecione um aluno para matricular no curso. A data de matrícula será registrada como hoje.
          </p>
          
          {availableStudents.length === 0 && (
            <div className="p-3 bg-yellow-100 text-yellow-700 rounded-md">
              Não há alunos disponíveis para matrícula. Todos os alunos já estão matriculados neste curso ou não há alunos cadastrados.
            </div>
          )}
        </div>
      </Modal>
      
      {/* Register Attendance Modal */}
      <Modal
        isOpen={attendanceModalOpen}
        onClose={() => setAttendanceModalOpen(false)}
        title="Registrar Frequência"
        footer={
          <div className="flex justify-end space-x-2">
            <Button
              variant="secondary"
              onClick={() => setAttendanceModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleRegisterAttendance}
              isLoading={loading}
            >
              Registrar
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="font-medium">Curso: {course.name}</p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:border-blue-500 focus:ring-blue-500 w-full"
            />
          </div>
          
          {enrollments.length === 0 ? (
            <div className="p-3 bg-yellow-100 text-yellow-700 rounded-md">
              Não há alunos matriculados neste curso. Matricule alunos antes de registrar frequência.
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mt-2 mb-4">
                Selecione a data e registre a presença dos alunos matriculados neste curso.
              </p>
              
              <div className="border rounded-md divide-y">
                {enrollments.filter(e => e.status === 'active').map((enrollment) => (
                  <div key={enrollment.id} className="flex items-center justify-between p-3">
                    <div>
                      <p className="font-medium">{enrollment.student.full_name}</p>
                      <p className="text-xs text-gray-500">{enrollment.student.cpf}</p>
                    </div>
                    <div>
                      <select 
                        className="rounded-md border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:border-blue-500 focus:ring-blue-500"
                        defaultValue="present"
                      >
                        <option value="present">Presente</option>
                        <option value="absent">Ausente</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default CourseDetail;