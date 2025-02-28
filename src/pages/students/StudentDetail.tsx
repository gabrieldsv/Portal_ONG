import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Edit, Trash2, Users, Calendar, 
  FileText, User, Heart, Activity 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Student, Guardian, Enrollment, Course } from '../../types';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Tabs from '../../components/ui/Tabs';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
import Select from '../../components/ui/Select';
import { toast } from 'react-toastify';

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'absent';
  absence_reason?: string;
  course_name: string;
}

interface SocialAssistanceRecord {
  id: string;
  date: string;
  identified_needs: string[];
  notes: string;
}

interface HealthRecord {
  id: string;
  record_type: 'dental' | 'psychological' | 'nutritional' | 'medical';
  date: string;
  professional_name: string;
  notes: string;
}

const StudentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [student, setStudent] = useState<Student | null>(null);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [enrollments, setEnrollments] = useState<(Enrollment & { course: Course })[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [socialAssistanceRecords, setSocialAssistanceRecords] = useState<SocialAssistanceRecord[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [activeHealthTab, setActiveHealthTab] = useState('dental');
  
  useEffect(() => {
    if (id) {
      fetchStudentData();
      fetchAvailableCourses();
      fetchAttendanceRecords();
      fetchSocialAssistanceRecords();
      fetchHealthRecords();
    }
  }, [id]);
  
  const fetchStudentData = async () => {
    try {
      setLoading(true);
      
      // Fetch student data
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single();
        
      if (studentError) throw studentError;
      setStudent(studentData);
      
      // Fetch guardians data
      const { data: guardiansData, error: guardiansError } = await supabase
        .from('guardians')
        .select('*')
        .eq('student_id', id)
        .order('is_primary', { ascending: false });
        
      if (guardiansError) throw guardiansError;
      setGuardians(guardiansData || []);
      
      // Fetch enrollments with course data
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select(`
          *,
          course:courses(*)
        `)
        .eq('student_id', id);
        
      if (enrollmentsError) throw enrollmentsError;
      setEnrollments(enrollmentsData || []);
      
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchAvailableCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('name', { ascending: true });
        
      if (error) throw error;
      setAvailableCourses(data || []);
    } catch (error) {
      console.error('Error fetching available courses:', error);
    }
  };

  const fetchAttendanceRecords = async () => {
    try {
      // First get all enrollments for this student
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('id, course_id, courses(name)')
        .eq('student_id', id);
        
      if (enrollmentsError) throw enrollmentsError;
      
      if (enrollments && enrollments.length > 0) {
        // Get attendance records for these enrollments
        const enrollmentIds = enrollments.map(e => e.id);
        
        const { data: attendance, error: attendanceError } = await supabase
          .from('attendance_students')
          .select('*')
          .in('enrollment_id', enrollmentIds)
          .order('date', { ascending: false });
          
        if (attendanceError) throw attendanceError;
        
        // Map attendance records with course names
        const formattedAttendance = attendance?.map(record => {
          const enrollment = enrollments.find(e => e.id === record.enrollment_id);
          return {
            id: record.id,
            date: record.date,
            status: record.status,
            absence_reason: record.absence_reason,
            course_name: enrollment?.courses?.name || 'Curso desconhecido'
          };
        }) || [];
        
        setAttendanceRecords(formattedAttendance);
      }
    } catch (error) {
      console.error('Error fetching attendance records:', error);
    }
  };

  const fetchSocialAssistanceRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('social_assistance_records')
        .select('*')
        .eq('student_id', id)
        .order('date', { ascending: false });
        
      if (error) throw error;
      setSocialAssistanceRecords(data || []);
    } catch (error) {
      console.error('Error fetching social assistance records:', error);
    }
  };

  const fetchHealthRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('health_records')
        .select('*')
        .eq('student_id', id)
        .order('date', { ascending: false });
        
      if (error) throw error;
      setHealthRecords(data || []);
    } catch (error) {
      console.error('Error fetching health records:', error);
    }
  };
  
  const handleDelete = async () => {
    try {
      setLoading(true);
      
      // Delete student (cascade will delete guardians and enrollments)
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast.success('Aluno excluído com sucesso');
      
      // Navigate back to student list
      navigate('/alunos');
      
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('Erro ao excluir aluno');
    } finally {
      setLoading(false);
      setDeleteModalOpen(false);
    }
  };
  
  const handleEnrollStudent = async () => {
    if (!selectedCourse) {
      toast.error('Por favor, selecione um curso');
      return;
    }
    
    try {
      setEnrollLoading(true);
      
      // Check if student is already enrolled in this course
      const isAlreadyEnrolled = enrollments.some(
        enrollment => enrollment.course.id === selectedCourse
      );
      
      if (isAlreadyEnrolled) {
        toast.error('Aluno já está matriculado neste curso');
        return;
      }
      
      // Create new enrollment
      const { error } = await supabase
        .from('enrollments')
        .insert({
          student_id: id,
          course_id: selectedCourse,
          enrollment_date: new Date().toISOString().split('T')[0],
          status: 'active'
        });
        
      if (error) throw error;
      
      toast.success('Aluno matriculado com sucesso');
      setEnrollModalOpen(false);
      
      // Refresh enrollments data
      fetchStudentData();
      
    } catch (error) {
      console.error('Error enrolling student:', error);
      toast.error('Erro ao matricular aluno');
    } finally {
      setEnrollLoading(false);
    }
  };
  
  if (loading && !student) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!student) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-700">Aluno não encontrado</h2>
        <p className="mt-2 text-gray-500">O aluno que você está procurando não existe ou foi removido.</p>
        <Button
          variant="primary"
          className="mt-4"
          onClick={() => navigate('/alunos')}
        >
          Voltar para a lista
        </Button>
      </div>
    );
  }
  
  const enrollmentColumns = [
    {
      header: 'Curso',
      accessor: (row: any) => (
        <div>
          <p className="font-medium">{row.course.name}</p>
          <p className="text-xs text-gray-500">
            {row.course.shift === 'morning' ? 'Manhã' : 
             row.course.shift === 'afternoon' ? 'Tarde' : 'Noite'}
          </p>
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
          <Link to={`/cursos/${row.course.id}`}>
            <Button variant="secondary" size="sm">Ver Curso</Button>
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

  const attendanceColumns = [
    {
      header: 'Data',
      accessor: (row: AttendanceRecord) => new Date(row.date).toLocaleDateString('pt-BR'),
    },
    {
      header: 'Curso',
      accessor: (row: AttendanceRecord) => row.course_name,
    },
    {
      header: 'Status',
      accessor: (row: AttendanceRecord) => {
        if (row.status === 'present') return <Badge variant="success">Presente</Badge>;
        if (row.status === 'absent') return <Badge variant="danger">Ausente</Badge>;
        return <Badge>{row.status}</Badge>;
      },
    },
    {
      header: 'Motivo da Falta',
      accessor: (row: AttendanceRecord) => row.absence_reason || '-',
    },
  ];

  const socialAssistanceColumns = [
    {
      header: 'Data',
      accessor: (row: SocialAssistanceRecord) => new Date(row.date).toLocaleDateString('pt-BR'),
    },
    {
      header: 'Necessidades',
      accessor: (row: SocialAssistanceRecord) => (
        <div className="flex flex-wrap gap-1">
          {row.identified_needs.map((need, index) => (
            <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
              {need}
            </span>
          ))}
        </div>
      ),
    },
    {
      header: 'Observações',
      accessor: (row: SocialAssistanceRecord) => row.notes || '-',
    },
    {
      header: 'Ações',
      accessor: () => (
        <Button variant="secondary" size="sm">Ver Detalhes</Button>
      ),
    },
  ];

  const healthRecordColumns = [
    {
      header: 'Data',
      accessor: (row: HealthRecord) => new Date(row.date).toLocaleDateString('pt-BR'),
    },
    {
      header: 'Profissional',
      accessor: (row: HealthRecord) => row.professional_name,
    },
    {
      header: 'Observações',
      accessor: (row: HealthRecord) => row.notes || '-',
    },
    {
      header: 'Ações',
      accessor: () => (
        <Button variant="secondary" size="sm">Ver Detalhes</Button>
      ),
    },
  ];
  
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
      fetchStudentData();
      
    } catch (error) {
      console.error('Error canceling enrollment:', error);
      toast.error('Erro ao cancelar matrícula');
    } finally {
      setLoading(false);
    }
  };

  const filteredHealthRecords = healthRecords.filter(
    record => record.record_type === activeHealthTab
  );
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft size={18} />}
            onClick={() => navigate('/alunos')}
          >
            Voltar
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">{student.full_name}</h1>
        </div>
        <div className="flex space-x-2">
          <Link to={`/alunos/${id}/editar`}>
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
              <div className="inline-flex h-24 w-24 rounded-full bg-blue-100 text-blue-800 items-center justify-center">
                <User size={40} />
              </div>
              <h2 className="mt-4 text-xl font-bold">{student.full_name}</h2>
              <p className="text-gray-500">{student.age} anos</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">CPF</p>
                <p>{student.cpf}</p>
              </div>
              {student.nis && (
                <div>
                  <p className="text-sm font-medium text-gray-500">NIS</p>
                  <p>{student.nis}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-500">Data de Nascimento</p>
                <p>{new Date(student.birth_date).toLocaleDateString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Telefone</p>
                <p>{student.phone}</p>
              </div>
              {student.email && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p>{student.email}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-500">Endereço</p>
                <p>{student.address}</p>
              </div>
            </div>
          </Card>
          
          <Card className="mt-6" title="Responsáveis">
            <div className="space-y-6">
              {guardians.map((guardian) => (
                <div key={guardian.id} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{guardian.full_name}</p>
                      {guardian.is_primary && (
                        <Badge variant="primary" className="mt-1">Responsável Principal</Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 space-y-2 text-sm">
                    <p><span className="text-gray-500">CPF:</span> {guardian.cpf}</p>
                    <p><span className="text-gray-500">Telefone:</span> {guardian.phone}</p>
                    {guardian.email && (
                      <p><span className="text-gray-500">Email:</span> {guardian.email}</p>
                    )}
                  </div>
                </div>
              ))}
              
              {guardians.length === 0 && (
                <p className="text-gray-500 text-center py-4">Nenhum responsável cadastrado</p>
              )}
            </div>
          </Card>
        </div>
        
        <div className="lg:col-span-2">
          <Tabs
            tabs={[
              {
                id: 'courses',
                label: 'Cursos',
                content: (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Cursos Matriculados</h3>
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Users size={16} />}
                        onClick={() => setEnrollModalOpen(true)}
                      >
                        Matricular em Curso
                      </Button>
                    </div>
                    
                    <Table
                      columns={enrollmentColumns}
                      data={enrollments}
                      keyExtractor={(item) => item.id}
                      isLoading={loading}
                      emptyMessage="Nenhum curso matriculado"
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
                      <Link to="/frequencia">
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<Calendar size={16} />}
                        >
                          Ver Calendário
                        </Button>
                      </Link>
                    </div>
                    
                    {attendanceRecords.length > 0 ? (
                      <Table
                        columns={attendanceColumns}
                        data={attendanceRecords}
                        keyExtractor={(item) => item.id}
                        isLoading={loading}
                        emptyMessage="Nenhum registro de frequência encontrado"
                      />
                    ) : (
                      <div className="bg-gray-50 p-8 rounded-lg text-center">
                        <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500">Nenhum registro de frequência encontrado</p>
                        <Link to="/frequencia">
                          <Button 
                            variant="primary" 
                            className="mt-4"
                          >
                            Registrar Frequência
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                ),
              },
              {
                id: 'social-assistance',
                label: 'Assistência Social',
                content: (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Atendimentos Sociais</h3>
                      <Link to="/assistencia-social">
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<Heart size={16} />}
                        >
                          Novo Atendimento
                        </Button>
                      </Link>
                    </div>
                    
                    {socialAssistanceRecords.length > 0 ? (
                      <Table
                        columns={socialAssistanceColumns}
                        data={socialAssistanceRecords}
                        keyExtractor={(item) => item.id}
                        isLoading={loading}
                        emptyMessage="Nenhum registro de atendimento social encontrado"
                      />
                    ) : (
                      <div className="bg-gray-50 p-8 rounded-lg text-center">
                        <Heart size={48} className="mx-auto text-pink-400 mb-4" />
                        <p className="text-gray-500">Nenhum registro de atendimento social encontrado</p>
                        <Link to="/assistencia-social">
                          <Button 
                            variant="primary" 
                            className="mt-4"
                          >
                            Registrar Atendimento
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                ),
              },
              {
                id: 'health',
                label: 'Saúde',
                content: (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Fichas de Saúde</h3>
                      <div className="flex space-x-2">
                        <Button 
                          variant={activeHealthTab === 'dental' ? 'primary' : 'secondary'} 
                          size="sm"
                          onClick={() => setActiveHealthTab('dental')}
                        >
                          Odontológico
                        </Button>
                        <Button 
                          variant={activeHealthTab === 'psychological' ? 'primary' : 'secondary'} 
                          size="sm"
                          onClick={() => setActiveHealthTab('psychological')}
                        >
                          Psicológico
                        </Button>
                        <Button 
                          variant={activeHealthTab === 'nutritional' ? 'primary' : 'secondary'} 
                          size="sm"
                          onClick={() => setActiveHealthTab('nutritional')}
                        >
                          Nutricional
                        </Button>
                        <Button 
                          variant={activeHealthTab === 'medical' ? 'primary' : 'secondary'} 
                          size="sm"
                          onClick={() => setActiveHealthTab('medical')}
                        >
                          Médico
                        </Button>
                      </div>
                    </div>
                    
                    {filteredHealthRecords.length > 0 ? (
                      <Table
                        columns={healthRecordColumns}
                        data={filteredHealthRecords}
                        keyExtractor={(item) => item.id}
                        isLoading={loading}
                        emptyMessage={`Nenhuma ficha ${
                          activeHealthTab === 'dental' ? 'odontológica' :
                          activeHealthTab === 'psychological' ? 'psicológica' :
                          activeHealthTab === 'nutritional' ? 'nutricional' : 'médica'
                        } encontrada`}
                      />
                    ) : (
                      <div className="bg-gray-50 p-8 rounded-lg text-center">
                        <Activity size={48} className="mx-auto text-blue-400 mb-4" />
                        <p className="text-gray-500">
                          Nenhuma ficha {
                            activeHealthTab === 'dental' ? 'odontológica' :
                            activeHealthTab === 'psychological' ? 'psicológica' :
                            activeHealthTab === 'nutritional' ? 'nutricional' : 'médica'
                          } encontrada
                        </p>
                        <Link to="/saude">
                          <Button 
                            variant="primary" 
                            className="mt-4"
                          >
                            Criar Nova Ficha
                          </Button>
                        </Link>
                      </div>
                    )}
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
        <p>Tem certeza que deseja excluir o aluno <strong>{student.full_name}</strong>?</p>
        <p className="mt-2 text-sm text-gray-500">
          Esta ação não pode ser desfeita. Todos os dados relacionados a este aluno, incluindo matrículas, 
          registros de frequência, atendimentos sociais e fichas de saúde também serão excluídos.
        </p>
      </Modal>
      
      {/* Enroll Student Modal */}
      <Modal
        isOpen={enrollModalOpen}
        onClose={() => setEnrollModalOpen(false)}
        title="Matricular em Curso"
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
            label="Curso"
            options={availableCourses.map(course => ({
              value: course.id,
              label: `${course.name} (${course.shift === 'morning' ? 'Manhã' : 
                      course.shift === 'afternoon' ? 'Tarde' : 'Noite'})`
            }))}
            value={selectedCourse}
            onChange={setSelectedCourse}
            required
            fullWidth
          />
          
          <p className="text-sm text-gray-500 mt-2">
            Selecione um curso para matricular o aluno. A data de matrícula será registrada como hoje.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default StudentDetail;