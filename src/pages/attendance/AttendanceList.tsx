import React, { useState, useEffect } from 'react';
import { Calendar, Search, Filter, Save, AlertCircle } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';
import { Course } from '../../types';

interface AttendanceRecord {
  studentId: string;
  studentName: string;
  studentCpf: string;
  status: 'present' | 'absent';
  absenceReason?: string;
}

const AttendanceList: React.FC = () => {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [filter, setFilter] = useState('today');
  const [courses, setCourses] = useState<Course[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [savedAttendances, setSavedAttendances] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);

  useEffect(() => {
    fetchCourses();
    fetchSavedAttendances();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchStudentsForCourse();
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Erro ao carregar cursos');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsForCourse = async () => {
    try {
      setLoading(true);
      
      // Get enrollments with student data for the selected course
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          id,
          student_id,
          students (
            id,
            full_name,
            cpf
          )
        `)
        .eq('course_id', selectedCourse)
        .eq('status', 'active');
      
      if (error) throw error;
      
      // Check if we already have attendance records for this course and date
      const { data: existingAttendance, error: attendanceError } = await supabase
        .from('attendance_students')
        .select(`
          id,
          enrollment_id,
          status,
          absence_reason
        `)
        .eq('date', selectedDate)
        .in('enrollment_id', data?.map(e => e.id) || []);
      
      if (attendanceError) throw attendanceError;
      
      // Format the data for our state
      const records: AttendanceRecord[] = data?.map(enrollment => {
        const existing = existingAttendance?.find(a => a.enrollment_id === enrollment.id);
        
        return {
          studentId: enrollment.student_id,
          studentName: enrollment.students.full_name,
          studentCpf: enrollment.students.cpf,
          status: existing ? existing.status : 'present',
          absenceReason: existing?.absence_reason || '',
        };
      }) || [];
      
      setAttendanceRecords(records);
    } catch (error) {
      console.error('Error fetching students for course:', error);
      toast.error('Erro ao carregar alunos do curso');
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedAttendances = async () => {
    try {
      setLoading(true);
      
      // Get the last 30 days of attendance records grouped by course and date
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from('attendance_students')
        .select(`
          id,
          date,
          enrollment:enrollments (
            course:courses (
              id,
              name
            )
          )
        `)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      // Group by course and date
      const groupedData = data?.reduce((acc, record) => {
        const courseId = record.enrollment.course.id;
        const courseName = record.enrollment.course.name;
        const date = record.date;
        
        const key = `${courseId}-${date}`;
        
        if (!acc[key]) {
          acc[key] = {
            courseId,
            courseName,
            date,
            count: 0
          };
        }
        
        acc[key].count++;
        
        return acc;
      }, {} as Record<string, any>) || {};
      
      setSavedAttendances(Object.values(groupedData));
    } catch (error) {
      console.error('Error fetching saved attendances:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterAttendance = () => {
    setShowAttendanceForm(true);
  };

  const handleSaveAttendance = async () => {
    if (!selectedCourse) {
      toast.error('Por favor, selecione um curso');
      return;
    }

    if (!selectedDate) {
      toast.error('Por favor, selecione uma data');
      return;
    }

    if (attendanceRecords.length === 0) {
      toast.error('Não há alunos para registrar frequência');
      return;
    }

    try {
      setSavingAttendance(true);
      
      // First, get all enrollments for this course
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('id, student_id')
        .eq('course_id', selectedCourse)
        .eq('status', 'active');
      
      if (enrollmentsError) throw enrollmentsError;
      
      // Delete any existing attendance records for this course and date
      const enrollmentIds = enrollments?.map(e => e.id) || [];
      
      if (enrollmentIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('attendance_students')
          .delete()
          .eq('date', selectedDate)
          .in('enrollment_id', enrollmentIds);
        
        if (deleteError) throw deleteError;
      }
      
      // Create attendance records for each student
      const attendanceData = attendanceRecords.map(record => {
        const enrollment = enrollments?.find(e => e.student_id === record.studentId);
        
        return {
          enrollment_id: enrollment?.id,
          date: selectedDate,
          status: record.status,
          absence_reason: record.status === 'absent' ? record.absenceReason : null
        };
      }).filter(record => record.enrollment_id); // Filter out any records without a valid enrollment
      
      if (attendanceData.length > 0) {
        const { error: insertError } = await supabase
          .from('attendance_students')
          .insert(attendanceData);
        
        if (insertError) throw insertError;
      }
      
      toast.success('Frequência registrada com sucesso!');
      fetchSavedAttendances();
      setShowAttendanceForm(false);
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('Erro ao registrar frequência');
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleStatusChange = (studentId: string, status: 'present' | 'absent') => {
    setAttendanceRecords(records => 
      records.map(record => 
        record.studentId === studentId 
          ? { ...record, status } 
          : record
      )
    );
  };

  const handleAbsenceReasonChange = (studentId: string, reason: string) => {
    setAttendanceRecords(records => 
      records.map(record => 
        record.studentId === studentId 
          ? { ...record, absenceReason: reason } 
          : record
      )
    );
  };

  const filteredAttendances = savedAttendances.filter(attendance => {
    if (searchTerm) {
      return attendance.courseName.toLowerCase().includes(searchTerm.toLowerCase());
    }
    
    const today = new Date().toISOString().split('T')[0];
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0];
    
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    const oneMonthAgoStr = oneMonthAgo.toISOString().split('T')[0];
    
    if (filter === 'today') {
      return attendance.date === today;
    } else if (filter === 'week') {
      return attendance.date >= oneWeekAgoStr;
    } else if (filter === 'month') {
      return attendance.date >= oneMonthAgoStr;
    }
    
    return true;
  });

  const attendanceColumns = [
    {
      header: 'Curso',
      accessor: (row: any) => row.courseName,
    },
    {
      header: 'Data',
      accessor: (row: any) => new Date(row.date).toLocaleDateString('pt-BR'),
    },
    {
      header: 'Alunos',
      accessor: (row: any) => `${row.count} registros`,
    },
    {
      header: 'Ações',
      accessor: (row: any) => (
        <div className="flex space-x-2">
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => {
              setSelectedCourse(row.courseId);
              setSelectedDate(row.date);
              handleRegisterAttendance();
            }}
          >
            Ver Detalhes
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Controle de Frequência</h1>
        <Button 
          variant="primary" 
          leftIcon={<Calendar size={18} />}
          onClick={handleRegisterAttendance}
        >
          Registrar Frequência
        </Button>
      </div>

      {!showAttendanceForm ? (
        <Card>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Buscar por curso..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search size={18} />}
                fullWidth
              />
            </div>
            <div className="flex space-x-2">
              <Button 
                variant={filter === 'today' ? 'primary' : 'secondary'}
                onClick={() => setFilter('today')}
              >
                Hoje
              </Button>
              <Button 
                variant={filter === 'week' ? 'primary' : 'secondary'}
                onClick={() => setFilter('week')}
              >
                Esta Semana
              </Button>
              <Button 
                variant={filter === 'month' ? 'primary' : 'secondary'}
                onClick={() => setFilter('month')}
              >
                Este Mês
              </Button>
              <Button
                variant="secondary"
                leftIcon={<Filter size={18} />}
              >
                Filtros
              </Button>
            </div>
          </div>

          {filteredAttendances.length > 0 ? (
            <Table
              columns={attendanceColumns}
              data={filteredAttendances}
              keyExtractor={(item) => `${item.courseId}-${item.date}`}
              isLoading={loading}
              emptyMessage="Nenhum registro de frequência encontrado"
            />
          ) : (
            <div className="bg-gray-50 p-8 rounded-lg text-center">
              <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Selecione um curso e uma data para registrar ou visualizar a frequência</p>
              <Button 
                variant="primary" 
                className="mt-4"
                onClick={handleRegisterAttendance}
              >
                Começar
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Registro de Frequência</h2>
            <Button
              variant="secondary"
              onClick={() => setShowAttendanceForm(false)}
            >
              Voltar
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Select
              label="Curso"
              options={courses.map(course => ({
                value: course.id,
                label: course.name
              }))}
              value={selectedCourse}
              onChange={(value) => {
                setSelectedCourse(value);
              }}
              required
              fullWidth
            />
            
            <Input
              label="Data"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              required
              fullWidth
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : attendanceRecords.length > 0 ? (
            <div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aluno
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Motivo da Falta
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendanceRecords.map((record) => (
                      <tr key={record.studentId}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="font-medium">{record.studentName}</p>
                            <p className="text-xs text-gray-500">{record.studentCpf}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <button
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                record.status === 'present'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                              onClick={() => handleStatusChange(record.studentId, 'present')}
                            >
                              Presente
                            </button>
                            <button
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                record.status === 'absent'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                              onClick={() => handleStatusChange(record.studentId, 'absent')}
                            >
                              Ausente
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {record.status === 'absent' && (
                            <Input
                              placeholder="Motivo da falta (opcional)"
                              value={record.absenceReason || ''}
                              onChange={(e) => handleAbsenceReasonChange(record.studentId, e.target.value)}
                              fullWidth
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  variant="primary"
                  leftIcon={<Save size={18} />}
                  onClick={handleSaveAttendance}
                  isLoading={savingAttendance}
                >
                  Salvar Frequência
                </Button>
              </div>
            </div>
          ) : selectedCourse ? (
            <div className="bg-yellow-50 p-6 rounded-lg flex items-start">
              <AlertCircle size={24} className="text-yellow-500 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-yellow-800">Nenhum aluno encontrado</h3>
                <p className="text-yellow-700 mt-1">
                  Não há alunos matriculados neste curso ou todos estão com matrícula inativa.
                  Matricule alunos no curso antes de registrar frequência.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 p-6 rounded-lg flex items-start">
              <AlertCircle size={24} className="text-blue-500 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-blue-800">Selecione um curso</h3>
                <p className="text-blue-700 mt-1">
                  Selecione um curso para visualizar os alunos e registrar a frequência.
                </p>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default AttendanceList;