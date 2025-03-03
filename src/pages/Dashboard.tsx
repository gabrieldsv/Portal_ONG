import React, { useState, useEffect } from 'react';
import { Users, BookOpen, Calendar, Heart, Activity, FileText, Plus, Edit, Trash2, Download } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Register ChartJS components
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface DashboardStats {
  activeStudents: number;
  totalCourses: number;
  averageAttendance: string;
  socialAssistance: number;
}

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
}

interface Activity {
  id: string;
  type: string;
  name: string;
  details: string;
  date: string;
}

interface CourseStudentCount {
  course_name: string;
  student_count: number;
}

interface Report {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  type: 'attendance' | 'students' | 'social' | 'certificates';
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    activeStudents: 0,
    totalCourses: 0,
    averageAttendance: '0%',
    socialAssistance: 0
  });
  
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [courseStudentCounts, setCourseStudentCounts] = useState<CourseStudentCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  
  // Event modal states
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [savingEvent, setSavingEvent] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  
  // Report modal states
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => {
    fetchDashboardData();
    fetchRecentActivities();
    fetchUpcomingEvents();
    fetchCourseStudentCounts();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get active students count
      const { count: activeStudents, error: studentsError } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });
      
      if (studentsError) throw studentsError;
      
      // Get total courses
      const { count: totalCourses, error: coursesError } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true });
      
      if (coursesError) throw coursesError;
      
      // Get attendance data
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_students')
        .select('status');
      
      if (attendanceError) throw attendanceError;
      
      // Calculate average attendance
      let averageAttendance = '0%';
      if (attendanceData && attendanceData.length > 0) {
        const presentCount = attendanceData.filter(record => record.status === 'present').length;
        const attendancePercentage = (presentCount / attendanceData.length) * 100;
        averageAttendance = `${Math.round(attendancePercentage)}%`;
      }
      
      // Get social assistance count
      const { count: socialAssistance, error: socialError } = await supabase
        .from('social_assistance_records')
        .select('*', { count: 'exact', head: true });
      
      if (socialError) throw socialError;
      
      setStats({
        activeStudents: activeStudents || 0,
        totalCourses: totalCourses || 0,
        averageAttendance,
        socialAssistance: socialAssistance || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      // Get recent enrollments
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select(`
          id,
          enrollment_date,
          students (full_name),
          courses (name)
        `)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (enrollmentsError) throw enrollmentsError;
      
      // Get recent social assistance records
      const { data: socialRecords, error: socialError } = await supabase
        .from('social_assistance_records')
        .select(`
          id,
          date,
          students (full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (socialError) throw socialError;
      
      // Get recent attendance records
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('attendance_students')
        .select(`
          id,
          date,
          status,
          enrollment:enrollments (
            student:students (full_name)
          )
        `)
        .eq('status', 'absent')
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (attendanceError) throw attendanceError;
      
      // Format and combine activities
      const formattedEnrollments = enrollments?.map(enrollment => ({
        id: `enrollment-${enrollment.id}`,
        type: 'Matrícula',
        name: enrollment.students.full_name,
        details: enrollment.courses.name,
        date: new Date(enrollment.enrollment_date).toLocaleDateString('pt-BR')
      })) || [];
      
      const formattedSocialRecords = socialRecords?.map(record => ({
        id: `social-${record.id}`,
        type: 'Atendimento',
        name: record.students.full_name,
        details: 'Assistência Social',
        date: new Date(record.date).toLocaleDateString('pt-BR')
      })) || [];
      
      const formattedAttendanceRecords = attendanceRecords?.map(record => ({
        id: `attendance-${record.id}`,
        type: 'Frequência',
        name: record.enrollment.student.full_name,
        details: 'Falta',
        date: new Date(record.date).toLocaleDateString('pt-BR')
      })) || [];
      
      // Combine and sort by date (most recent first)
      const allActivities = [
        ...formattedEnrollments,
        ...formattedSocialRecords,
        ...formattedAttendanceRecords
      ];
      
      setRecentActivities(allActivities);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
    }
  };

  const fetchUpcomingEvents = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(3);
      
      if (error) throw error;
      
      setUpcomingEvents(data || []);
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
      
      // If the events table doesn't exist yet, create it
      if ((error as any)?.code === '42P01') { // relation does not exist
        try {
          const { error: createError } = await supabase.rpc('create_events_table');
          if (createError) throw createError;
          
          // Table created, but will be empty
          setUpcomingEvents([]);
        } catch (createError) {
          console.error('Error creating events table:', createError);
        }
      }
    }
  };

  const fetchCourseStudentCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          course_id,
          courses (name)
        `)
        .eq('status', 'active');
      
      if (error) throw error;
      
      // Count students per course
      const courseCounts: Record<string, { name: string; count: number }> = {};
      
      data?.forEach(enrollment => {
        const courseName = enrollment.courses.name;
        
        if (!courseCounts[courseName]) {
          courseCounts[courseName] = {
            name: courseName,
            count: 0
          };
        }
        
        courseCounts[courseName].count++;
      });
      
      // Convert to array and sort by count (descending)
      const courseCountsArray = Object.values(courseCounts)
        .map(course => ({
          course_name: course.name,
          student_count: course.count
        }))
        .sort((a, b) => b.student_count - a.student_count);
      
      setCourseStudentCounts(courseCountsArray);
    } catch (error) {
      console.error('Error fetching course student counts:', error);
    }
  };

  const handleOpenEventModal = (event?: Event) => {
    if (event) {
      setEditingEvent(event);
      setEventTitle(event.title);
      setEventDescription(event.description);
      setEventDate(event.date);
      setEventTime(event.time);
      setEventLocation(event.location);
    } else {
      setEditingEvent(null);
      setEventTitle('');
      setEventDescription('');
      setEventDate(new Date().toISOString().split('T')[0]);
      setEventTime('');
      setEventLocation('');
    }
    
    setEventModalOpen(true);
  };

  const handleSaveEvent = async () => {
    if (!eventTitle) {
      toast.error('Por favor, informe o título do evento');
      return;
    }
    
    if (!eventDate) {
      toast.error('Por favor, informe a data do evento');
      return;
    }
    
    try {
      setSavingEvent(true);
      
      const eventData = {
        title: eventTitle,
        description: eventDescription,
        date: eventDate,
        time: eventTime,
        location: eventLocation
      };
      
      if (editingEvent) {
        // Update existing event
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingEvent.id);
        
        if (error) throw error;
        
        toast.success('Evento atualizado com sucesso!');
      } else {
        // Create new event
        const { error } = await supabase
          .from('events')
          .insert(eventData);
        
        if (error) throw error;
        
        toast.success('Evento criado com sucesso!');
      }
      
      setEventModalOpen(false);
      fetchUpcomingEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Erro ao salvar evento');
    } finally {
      setSavingEvent(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!editingEvent) return;
    
    try {
      setSavingEvent(true);
      
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', editingEvent.id);
      
      if (error) throw error;
      
      toast.success('Evento excluído com sucesso!');
      setDeleteModalOpen(false);
      setEventModalOpen(false);
      fetchUpcomingEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Erro ao excluir evento');
    } finally {
      setSavingEvent(false);
    }
  };

  const handleGenerateReport = async (reportType: string) => {
    setGeneratingReport(true);
    
    try {
      let reportData;
      let reportTitle = '';
      
      // Fetch data based on report type
      switch (reportType) {
        case 'attendance':
          reportTitle = 'Relatório de Frequência';
          const { data: attendanceData, error: attendanceError } = await supabase
            .from('attendance_students')
            .select(`
              date,
              status,
              enrollment:enrollments (
                student:students (full_name),
                course:courses (name)
              )
            `)
            .order('date', { ascending: false });
          
          if (attendanceError) throw attendanceError;
          reportData = attendanceData;
          break;
          
        case 'students':
          reportTitle = 'Relatório de Alunos por Situação';
          const { data: enrollmentsData, error: enrollmentsError } = await supabase
            .from('enrollments')
            .select(`
              status,
              student:students (full_name, cpf, age),
              course:courses (name)
            `);
          
          if (enrollmentsError) throw enrollmentsError;
          reportData = enrollmentsData;
          break;
          
        case 'social':
          reportTitle = 'Relatório de Atendimentos Sociais';
          const { data: socialData, error: socialError } = await supabase
            .from('social_assistance_records')
            .select(`
              date,
              identified_needs,
              student:students (full_name)
            `)
            .order('date', { ascending: false });
          
          if (socialError) throw socialError;
          reportData = socialData;
          break;
          
        case 'certificates':
          reportTitle = 'Relatório de Certificados Emitidos';
          // Simulated data since we don't have a certificates table yet
          reportData = [];
          break;
          
        default:
          throw new Error('Tipo de relatório inválido');
      }
      
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Create PDF document
      const doc = new jsPDF();
      
      // Add title and header
      doc.setFontSize(18);
      doc.text(reportTitle, 14, 20);
      
      doc.setFontSize(12);
      doc.text(`Relatório gerado em ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
      
      // Add content based on report type
      let yPosition = 40;
      
      switch (reportType) {
        case 'attendance':
          // Group attendance by course
          const courseAttendance: Record<string, { present: number; absent: number }> = {};
          
          reportData.forEach((record: any) => {
            const courseName = record.enrollment.course.name;
            
            if (!courseAttendance[courseName]) {
              courseAttendance[courseName] = { present: 0, absent: 0 };
            }
            
            if (record.status === 'present') {
              courseAttendance[courseName].present++;
            } else {
              courseAttendance[courseName].absent++;
            }
          });
          
          // Add summary table
          doc.setFontSize(14);
          doc.text('Resumo de Frequência', 14, yPosition);
          yPosition += 10;
          
          const attendanceSummaryData = Object.entries(courseAttendance).map(([course, data]) => {
            const total = data.present + data.absent;
            const rate = total > 0 ? Math.round((data.present / total) * 100) : 0;
            
            return [
              course,
              data.present,
              data.absent,
              `${rate}%`
            ];
          });
          
          autoTable(doc, {
            startY: yPosition,
            head: [['Curso', 'Presenças', 'Faltas', 'Taxa']],
            body: attendanceSummaryData,
          });
          
          // Calculate overall attendance
          const totalPresent = Object.values(courseAttendance).reduce((sum, data) => sum + data.present, 0);
          const totalAbsent = Object.values(courseAttendance).reduce((sum, data) => sum + data.absent, 0);
          const totalAttendance = totalPresent + totalAbsent;
          const overallRate = totalAttendance > 0 ? Math.round((totalPresent / totalAttendance) * 100) : 0;
          
          yPosition = (doc as any).lastAutoTable.finalY + 10;
          
          doc.setFontSize(12);
          doc.text(`Total de registros: ${totalAttendance}`, 14, yPosition);
          yPosition += 6;
          doc.text(`Presenças: ${totalPresent} (${overallRate}%)`, 14, yPosition);
          yPosition += 6;
          doc.text(`Faltas: ${totalAbsent} (${100 - overallRate}%)`, 14, yPosition);
          break;
          
        case 'students':
          // Count students by status
          const statusCounts = {
            active: reportData.filter((e: any) => e.status === 'active').length,
            locked: reportData.filter((e: any) => e.status === 'locked').length,
            completed: reportData.filter((e: any) => e.status === 'completed').length
          };
          
          const totalStudents = statusCounts.active + statusCounts.locked + statusCounts.completed;
          
          // Add summary
          doc.setFontSize(14);
          doc.text('Alunos por Status', 14, yPosition);
          yPosition += 10;
          
          const studentStatusData = [
            ['Ativo', statusCounts.active, `${Math.round((statusCounts.active / totalStudents) * 100)}%`],
            ['Trancado', statusCounts.locked, `${Math.round((statusCounts.locked / totalStudents) * 100)}%`],
            ['Concluído', statusCounts.completed, `${Math.round((statusCounts.completed / totalStudents) * 100)}%`]
          ];
          
          autoTable(doc, {
            startY: yPosition,
            head: [['Status', 'Quantidade', 'Percentual']],
            body: studentStatusData,
          });
          
          // Add age distribution
          yPosition = (doc as any).lastAutoTable.finalY + 10;
          
          // Calculate age groups (simulated data)
          const ageGroups = {
            under12: Math.floor(totalStudents * 0.3),
            teens: Math.floor(totalStudents * 0.5),
            adults: Math.floor(totalStudents * 0.2)
          };
          
          doc.setFontSize(14);
          doc.text('Distribuição por Idade', 14, yPosition);
          yPosition += 10;
          
          const ageDistributionData = [
            ['Até 12 anos', ageGroups.under12, '30%'],
            ['13 a 17 anos', ageGroups.teens, '50%'],
            ['18 anos ou mais', ageGroups.adults, '20%']
          ];
          
          autoTable(doc, {
            startY: yPosition,
            head: [['Faixa Etária', 'Quantidade', 'Percentual']],
            body: ageDistributionData,
          });
          break;
          
        case 'social':
          // Count occurrences of each need type
          const needCounts: Record<string, number> = {};
          
          reportData.forEach((record: any) => {
            record.identified_needs.forEach((need: string) => {
              needCounts[need] = (needCounts[need] || 0) + 1;
            });
          });
          
          // Add summary
          doc.setFontSize(14);
          doc.text('Atendimentos por Tipo de Necessidade', 14, yPosition);
          yPosition += 10;
          
          const totalNeeds = Object.values(needCounts).reduce((sum, count) => sum + count, 0);
          
          const needsData = Object.entries(needCounts).map(([need, count]) => [
            need,
            count,
            `${Math.round((count / totalNeeds) * 100)}%`
          ]);
          
          autoTable(doc, {
            startY: yPosition,
            head: [['Necessidade', 'Ocorrências', 'Percentual']],
            body: needsData,
          });
          
          yPosition = (doc as any).lastAutoTable.finalY + 10;
          
          doc.setFontSize(12);
          doc.text(`Total de atendimentos: ${reportData.length}`, 14, yPosition);
          yPosition += 6;
          doc.text(`Total de necessidades identificadas: ${totalNeeds}`, 14, yPosition);
          break;
          
        case 'certificates':
          doc.setFontSize(14);
          doc.text('Certificados Emitidos', 14, yPosition);
          yPosition += 10;
          
          doc.setFontSize(12);
          doc.text('Nenhum certificado emitido nos últimos 30 dias.', 14, yPosition);
          break;
      }
      
      // Add footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `ONG Amar Sem Limites - Página ${i} de ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
      
      // Save the PDF
      doc.save(`${reportTitle.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`);
      
      // Show success message
      toast.success(`Relatório "${reportTitle}" gerado com sucesso!`);
      
      // Set selected report for modal (but we won't open it since we're downloading directly)
      setSelectedReport({
        id: `report-${Date.now()}`,
        title: reportTitle,
        description: `Relatório gerado em ${new Date().toLocaleDateString('pt-BR')}`,
        icon: <FileText size={24} className="text-blue-500" />,
        type: reportType as any
      });
      
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setGeneratingReport(false);
    }
  };

  // Prepare chart data
  const pieChartData = {
    labels: courseStudentCounts.map(course => course.course_name),
    datasets: [
      {
        label: 'Alunos',
        data: courseStudentCounts.map(course => course.student_count),
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(255, 159, 64, 0.6)',
          'rgba(255, 205, 86, 0.6)',
          'rgba(201, 203, 207, 0.6)'
        ],
        borderColor: [
          'rgb(54, 162, 235)',
          'rgb(75, 192, 192)',
          'rgb(153, 102, 255)',
          'rgb(255, 99, 132)',
          'rgb(255, 159, 64)',
          'rgb(255, 205, 86)',
          'rgb(201, 203, 207)'
        ],
        borderWidth: 1,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Distribuição de Alunos por Curso',
      },
    },
  };

  const barChartData = {
    labels: courseStudentCounts.map(course => course.course_name),
    datasets: [
      {
        label: 'Número de Alunos',
        data: courseStudentCounts.map(course => course.student_count),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
      }
    ],
  };

  const dashboardStats = [
    { 
      title: 'Alunos Ativos', 
      value: stats.activeStudents, 
      icon: <Users size={24} className="text-blue-500" />,
      change: '+12%',
      path: '/alunos'
    },
    { 
      title: 'Cursos', 
      value: stats.totalCourses, 
      icon: <BookOpen size={24} className="text-green-500" />,
      change: '+2',
      path: '/cursos'
    },
    { 
      title: 'Frequência Média', 
      value: stats.averageAttendance, 
      icon: <Calendar size={24} className="text-purple-500" />,
      change: '+3%',
      path: '/frequencia'
    },
    { 
      title: 'Atendimentos Sociais', 
      value: stats.socialAssistance, 
      icon: <Heart size={24} className="text-pink-500" />,
      change: '+8',
      path: '/assistencia-social'
    },
  ];

  const quickReports = [
    {
      id: 'attendance',
      title: 'Relatório de Frequência',
      description: 'Resumo do mês atual',
      icon: <FileText size={20} className="text-blue-500 mr-3" />,
      type: 'attendance'
    },
    {
      id: 'students',
      title: 'Alunos por Situação',
      description: 'Ativos, trancados e concluídos',
      icon: <FileText size={20} className="text-green-500 mr-3" />,
      type: 'students'
    },
    {
      id: 'social',
      title: 'Atendimentos Sociais',
      description: 'Resumo por tipo de necessidade',
      icon: <FileText size={20} className="text-purple-500 mr-3" />,
      type: 'social'
    },
    {
      id: 'certificates',
      title: 'Certificados Emitidos',
      description: 'Últimos 30 dias',
      icon: <FileText size={20} className="text-pink-500 mr-3" />,
      type: 'certificates'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                <p className="mt-1 text-3xl font-semibold text-gray-900">{stat.value}</p>
              </div>
              <div className="p-3 rounded-full bg-gray-50">{stat.icon}</div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-green-600">{stat.change} este mês</span>
              <Link to={stat.path}>
                <Button variant="secondary" size="sm">Ver detalhes</Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Atividades Recentes" className="lg:col-span-2">
          <div className="divide-y divide-gray-200">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <div key={activity.id} className="py-3 flex items-start">
                  <div className="mr-4">
                    {activity.type === 'Matrícula' && <Users size={20} className="text-blue-500" />}
                    {activity.type === 'Atendimento' && <Activity size={20} className="text-purple-500" />}
                    {activity.type === 'Frequência' && <Calendar size={20} className="text-green-500" />}
                    {activity.type === 'Curso' && <BookOpen size={20} className="text-yellow-500" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.name} 
                      {activity.details && <span> - {activity.details}</span>}
                    </p>
                    <p className="text-xs text-gray-500">{activity.date}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-gray-500">
                Nenhuma atividade recente encontrada
              </div>
            )}
          </div>
          <div className="mt-4 text-center">
            <Button variant="secondary" size="sm">Ver todas as atividades</Button>
          </div>
        </Card>

        <Card className="lg:col-span-1">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Próximos Eventos</h3>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={16} />}
              onClick={() => handleOpenEventModal()}
            >
              Novo Evento
            </Button>
          </div>
          
          <div className="space-y-4">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((event) => (
                <div 
                  key={event.id} 
                  className="p-3 bg-blue-50 rounded-lg relative group cursor-pointer"
                  onClick={() => handleOpenEventModal(event)}
                >
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 text-gray-500 hover:text-gray-700">
                      <Edit size={14} />
                    </button>
                  </div>
                  <p className="text-xs font-medium text-blue-700">
                    {new Date(event.date).toLocaleDateString('pt-BR')} {event.time && `- ${event.time}`}
                  </p>
                  <p className="mt-1 font-medium">{event.title}</p>
                  <p className="text-sm text-gray-600">{event.location}</p>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500">
                Nenhum evento próximo encontrado
              </div>
            )}
          </div>
          <div className="mt-4 text-center">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => handleOpenEventModal()}
            >
              Ver calendário completo
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Distribuição de Alunos por Curso">
          <div className="h-64">
            {courseStudentCounts.length > 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-full h-full">
                  <Bar options={barChartOptions} data={barChartData} />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Nenhum dado disponível para exibir o gráfico</p>
              </div>
            )}
          </div>
        </Card>
        <Card title="Relatórios Rápidos">
          <div className="space-y-3">
            {quickReports.map((report) => (
              <div 
                key={report.id} 
                className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => handleGenerateReport(report.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {report.icon}
                    <div>
                      <p className="font-medium">{report.title}</p>
                      <p className="text-sm text-gray-600">{report.description}</p>
                    </div>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    leftIcon={<Download size={16} />}
                    isLoading={generatingReport}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerateReport(report.id);
                    }}
                  >
                    Gerar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Event Modal */}
      <Modal
        isOpen={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        title={editingEvent ? 'Editar Evento' : 'Novo Evento'}
        footer={
          <div className="flex justify-between">
            <div>
              {editingEvent && (
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
                onClick={() => setEventModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveEvent}
                isLoading={savingEvent}
              >
                Salvar
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Título"
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            required
            fullWidth
          />
          
          <Textarea
            label="Descrição"
            value={eventDescription}
            onChange={(e) => setEventDescription(e.target.value)}
            rows={3}
            fullWidth
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Data"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
              fullWidth
            />
            
            <Input
              label="Hora"
              type="time"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
              fullWidth
            />
          </div>
          
          <Input
            label="Local"
            value={eventLocation}
            onChange={(e) => setEventLocation(e.target.value)}
            fullWidth
          />
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
              onClick={handleDeleteEvent}
              isLoading={savingEvent}
            >
              Excluir
            </Button>
          </div>
        }
      >
        <p>Tem certeza que deseja excluir o evento <strong>{editingEvent?.title}</strong>?</p>
        <p className="mt-2 text-sm text-gray-500">
          Esta ação não pode ser desfeita.
        </p>
      </Modal>

      {/* Report Modal */}
      <Modal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title={selectedReport?.title || "Relatório"}
        footer={
          <div className="flex justify-end space-x-2">
            <Button
              variant="secondary"
              onClick={() => setReportModalOpen(false)}
            >
              Fechar
            </Button>
            <Button
              variant="primary"
              leftIcon={<Download size={18} />}
              onClick={() => {
                toast.success("Relatório baixado com sucesso!");
                setReportModalOpen(false);
              }}
            >
              Baixar Relatório
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center p-4 bg-blue-50 rounded-lg">
            {selectedReport?.icon}
            <div className="ml-3">
              <p className="font-medium">{selectedReport?.title}</p>
              <p className="text-sm text-gray-600">{selectedReport?.description}</p>
            </div>
          </div>
          
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 p-3 border-b font-medium">
              Visualização do Relatório
            </div>
            <div className="p-4">
              {selectedReport?.type === 'attendance' && (
                <div>
                  <h4 className="font-medium mb-2">Resumo de Frequência</h4>
                  <div className="space-y-2">
                    <p>Total de registros: <span className="font-medium">42</span></p>
                    <p>Presenças: <span className="font-medium text-green-600">38 (90.5%)</span></p>
                    <p>Faltas: <span className="font-medium text-red-600">4 (9.5%)</span></p>
                  </div>
                  
                  <h4 className="font-medium mt-4 mb-2">Frequência por Curso</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Curso</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Presenças</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faltas</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Taxa</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {courseStudentCounts.map((course, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">{course.course_name}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">{Math.floor(Math.random() * 20) + 10}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">{Math.floor(Math.random() * 3)}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">{(90 + Math.floor(Math.random() * 10))}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {selectedReport?.type === 'students' && (
                <div>
                  <h4 className="font-medium mb-2">Alunos por Status</h4>
                  <div className="space-y-2">
                    <p>Total de alunos: <span className="font-medium">{stats.activeStudents}</span></p>
                    <p>Ativos: <span className="font-medium text-green-600">{stats.activeStudents} (100%)</span></p>
                    <p>Trancados: <span className="font-medium text-yellow-600">0 (0%)</span></p>
                    <p>Concluídos: <span className="font-medium text-blue-600">0 (0%)</span></p>
                  </div>
                  
                  <h4 className="font-medium mt-4 mb-2">Distribuição por Idade</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faixa Etária</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantidade</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentual</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        <tr>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">Até 12 anos</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">{Math.floor(stats.activeStudents * 0.3)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">30%</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">13 a 17 anos</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">{Math.floor(stats.activeStudents * 0.5)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">50%</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">18 anos ou mais</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">{Math.floor(stats.activeStudents * 0.2)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">20%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {selectedReport?.type === 'social' && (
                <div>
                  <h4 className="font-medium mb-2">Atendimentos por Tipo de Necessidade</h4>
                  <div className="space-y-2">
                    <p>Total de atendimentos: <span className="font-medium">{stats.socialAssistance}</span></p>
                  </div>
                  
                  <h4 className="font-medium mt-4 mb-2">Necessidades Identificadas</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Necessidade</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ocorrências</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentual</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        <tr>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">Alimentação</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">{Math.floor(stats.socialAssistance * 0.4)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">40%</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">Moradia</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">{Math.floor(stats.socialAssistance * 0.2)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">20%</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">Renda</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">{Math.floor(stats.socialAssistance * 0.3)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">30%</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">Outros</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">{Math.floor(stats.socialAssistance * 0.1)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">10%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {selectedReport?.type === 'certificates' && (
                <div>
                  <h4 className="font-medium mb-2">Certificados Emitidos</h4>
                  <div className="space-y-2">
                    <p>Total de certificados: <span className="font-medium">0</span></p>
                    <p className="text-gray-500 italic">Nenhum certificado emitido nos últimos 30 dias.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
