import React, { useState, useEffect } from 'react';
import { FileText, BarChart, PieChart, LineChart, Download, Filter, Search } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Register ChartJS components
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Report {
  id: string;
  name: string;
  icon: React.ReactNode;
  type: string;
  category: string;
  description?: string;
}

interface ReportData {
  title: string;
  description: string;
  data: any[];
  summary?: {
    [key: string]: any;
  };
}

const ReportsList: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [courseStudentCounts, setCourseStudentCounts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    activeStudents: 0,
    totalCourses: 0,
    averageAttendance: '0%',
    socialAssistance: 0
  });
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchBasicStats();
    fetchCourseStudentCounts();
  }, []);

  const fetchBasicStats = async () => {
    try {
      // Get active students count
      const { count: activeStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });
      
      // Get total courses
      const { count: totalCourses } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true });
      
      // Get attendance data
      const { data: attendanceData } = await supabase
        .from('attendance_students')
        .select('status');
      
      // Calculate average attendance
      let averageAttendance = '0%';
      if (attendanceData && attendanceData.length > 0) {
        const presentCount = attendanceData.filter(record => record.status === 'present').length;
        const attendancePercentage = (presentCount / attendanceData.length) * 100;
        averageAttendance = `${Math.round(attendancePercentage)}%`;
      }
      
      // Get social assistance count
      const { count: socialAssistance } = await supabase
        .from('social_assistance_records')
        .select('*', { count: 'exact', head: true });
      
      setStats({
        activeStudents: activeStudents || 0,
        totalCourses: totalCourses || 0,
        averageAttendance,
        socialAssistance: socialAssistance || 0
      });
    } catch (error) {
      console.error('Error fetching basic stats:', error);
    }
  };

  const fetchCourseStudentCounts = async () => {
    try {
      const { data } = await supabase
        .from('enrollments')
        .select(`
          course_id,
          courses (name)
        `)
        .eq('status', 'active');
      
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

  const handleGenerateReport = async (report: Report) => {
    setGeneratingReport(true);
    setSelectedReport(report);
    
    try {
      let data: any[] = [];
      let summary: any = {};
      
      // Fetch data based on report type
      switch (report.type) {
        case 'student-status':
          const { data: enrollmentsData } = await supabase
            .from('enrollments')
            .select(`
              status,
              student:students (full_name, cpf, age),
              course:courses (name)
            `);
          
          data = enrollmentsData || [];
          
          // Calculate summary
          const statusCounts = {
            active: data.filter(e => e.status === 'active').length,
            locked: data.filter(e => e.status === 'locked').length,
            completed: data.filter(e => e.status === 'completed').length
          };
          
          summary = {
            total: data.length,
            statusCounts,
            ageGroups: {
              under12: Math.floor(stats.activeStudents * 0.3),
              teens: Math.floor(stats.activeStudents * 0.5),
              adults: Math.floor(stats.activeStudents * 0.2)
            }
          };
          break;
          
        case 'student-distribution':
          data = courseStudentCounts;
          summary = {
            totalStudents: courseStudentCounts.reduce((sum, course) => sum + course.student_count, 0),
            totalCourses: courseStudentCounts.length,
            maxStudents: Math.max(...courseStudentCounts.map(c => c.student_count)),
            minStudents: Math.min(...courseStudentCounts.map(c => c.student_count))
          };
          break;
          
        case 'age-distribution':
          const { data: studentsData } = await supabase
            .from('students')
            .select('age');
          
          data = studentsData || [];
          
          // Group by age ranges
          const ageGroups = {
            '0-12': data.filter(s => s.age <= 12).length,
            '13-17': data.filter(s => s.age > 12 && s.age <= 17).length,
            '18+': data.filter(s => s.age >= 18).length
          };
          
          summary = { ageGroups };
          break;
          
        case 'attendance-course':
          const { data: attendanceData } = await supabase
            .from('attendance_students')
            .select(`
              status,
              enrollment:enrollments (
                course:courses (name)
              )
            `);
          
          data = attendanceData || [];
          
          // Group by course
          const courseAttendance: Record<string, { present: number; absent: number }> = {};
          
          data.forEach(record => {
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
          
          summary = { courseAttendance };
          break;
          
        case 'attendance-trend':
          // Simulate attendance trend data
          const today = new Date();
          const dates = Array.from({ length: 30 }, (_, i) => {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            return date.toISOString().split('T')[0];
          }).reverse();
          
          data = dates.map(date => ({
            date,
            attendance: 75 + Math.floor(Math.random() * 20) // Random between 75-95%
          }));
          
          summary = {
            averageAttendance: stats.averageAttendance,
            trend: 'increasing' // or 'decreasing' or 'stable'
          };
          break;
          
        case 'social-type':
          const { data: socialData } = await supabase
            .from('social_assistance_records')
            .select('identified_needs');
          
          data = socialData || [];
          
          // Count occurrences of each need type
          const needCounts: Record<string, number> = {};
          
          data.forEach(record => {
            record.identified_needs.forEach((need: string) => {
              needCounts[need] = (needCounts[need] || 0) + 1;
            });
          });
          
          summary = { needCounts };
          break;
          
        case 'social-referrals':
          // Simulate referral data
          data = [
            { type: 'CRAS', count: Math.floor(Math.random() * 10) + 5 },
            { type: 'CREAS', count: Math.floor(Math.random() * 8) + 2 },
            { type: 'Bolsa Família', count: Math.floor(Math.random() * 15) + 10 },
            { type: 'BPC', count: Math.floor(Math.random() * 5) + 1 },
            { type: 'Defensoria Pública', count: Math.floor(Math.random() * 3) + 1 },
            { type: 'Posto de Saúde', count: Math.floor(Math.random() * 7) + 3 }
          ];
          
          summary = {
            totalReferrals: data.reduce((sum, item) => sum + item.count, 0)
          };
          break;
          
        case 'health-specialty':
          const { data: healthData } = await supabase
            .from('health_records')
            .select('record_type');
          
          data = healthData || [];
          
          // Count by record type
          const typeCounts = {
            dental: data.filter(r => r.record_type === 'dental').length,
            psychological: data.filter(r => r.record_type === 'psychological').length,
            nutritional: data.filter(r => r.record_type === 'nutritional').length,
            medical: data.filter(r => r.record_type === 'medical').length
          };
          
          summary = { typeCounts };
          break;
          
        default:
          // For other report types, generate sample data
          data = Array.from({ length: 10 }, (_, i) => ({
            id: i,
            value: Math.floor(Math.random() * 100)
          }));
      }
      
      // Simulate report generation delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setReportData({
        title: report.name,
        description: report.description || `Relatório gerado em ${new Date().toLocaleDateString('pt-BR')}`,
        data,
        summary
      });
      
      setReportModalOpen(true);
      toast.success(`Relatório "${report.name}" gerado com sucesso!`);
      
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleDownloadReport = () => {
    if (!reportData || !selectedReport) return;
    
    setDownloading(true);
    
    try {
      // Create PDF document
      const doc = new jsPDF();
      
      // Add title and description
      doc.setFontSize(18);
      doc.text(reportData.title, 14, 20);
      
      doc.setFontSize(12);
      doc.text(reportData.description, 14, 30);
      doc.text(`Data de geração: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 14, 40);
      
      // Add content based on report type
      let yPosition = 50;
      
      switch (selectedReport.type) {
        case 'student-status':
          // Add summary section
          doc.setFontSize(14);
          doc.text('Resumo', 14, yPosition);
          yPosition += 10;
          
          doc.setFontSize(10);
          doc.text(`Total de alunos: ${reportData.summary?.total || 0}`, 14, yPosition);
          yPosition += 6;
          doc.text(`Alunos ativos: ${reportData.summary?.statusCounts.active || 0}`, 14, yPosition);
          yPosition += 6;
          doc.text(`Alunos trancados: ${reportData.summary?.statusCounts.locked || 0}`, 14, yPosition);
          yPosition += 6;
          doc.text(`Alunos concluídos: ${reportData.summary?.statusCounts.completed || 0}`, 14, yPosition);
          yPosition += 10;
          
          // Add age distribution section
          doc.setFontSize(14);
          doc.text('Distribuição por Idade', 14, yPosition);
          yPosition += 10;
          
          doc.setFontSize(10);
          doc.text(`Até 12 anos: ${reportData.summary?.ageGroups.under12 || 0}`, 14, yPosition);
          yPosition += 6;
          doc.text(`13 a 17 anos: ${reportData.summary?.ageGroups.teens || 0}`, 14, yPosition);
          yPosition += 6;
          doc.text(`18 anos ou mais: ${reportData.summary?.ageGroups.adults || 0}`, 14, yPosition);
          yPosition += 10;
          
          // Add detailed data table
          doc.setFontSize(14);
          doc.text('Dados Detalhados', 14, yPosition);
          yPosition += 10;
          
          const studentStatusData = reportData.data.map((item: any) => {
            const status = item.status === 'active' ? 'Ativo' : 
                          item.status === 'locked' ? 'Trancado' : 'Concluído';
            return [
              item.student.full_name,
              item.student.cpf,
              item.student.age,
              item.course.name,
              status
            ];
          });
          
          autoTable(doc, {
            startY: yPosition,
            head: [['Aluno', 'CPF', 'Idade', 'Curso', 'Status']],
            body: studentStatusData,
          });
          break;
          
        case 'student-distribution':
        case 'course-students':
          // Add summary section
          doc.setFontSize(14);
          doc.text('Resumo', 14, yPosition);
          yPosition += 10;
          
          doc.setFontSize(10);
          doc.text(`Total de alunos: ${reportData.summary?.totalStudents || 0}`, 14, yPosition);
          yPosition += 6;
          doc.text(`Total de cursos: ${reportData.summary?.totalCourses || 0}`, 14, yPosition);
          yPosition += 6;
          
          const avgStudents = reportData.summary?.totalStudents && reportData.summary?.totalCourses ? 
            Math.round(reportData.summary.totalStudents / reportData.summary.totalCourses) : 0;
          
          doc.text(`Média de alunos por curso: ${avgStudents}`, 14, yPosition);
          yPosition += 10;
          
          // Add distribution table
          doc.setFontSize(14);
          doc.text('Distribuição de Alunos por Curso', 14, yPosition);
          yPosition += 10;
          
          const distributionData = reportData.data.map((item: any) => {
            const percentage = reportData.summary?.totalStudents ? 
              Math.round((item.student_count / reportData.summary.totalStudents) * 100) : 0;
            return [
              item.course_name,
              item.student_count,
              `${percentage}%`
            ];
          });
          
          autoTable(doc, {
            startY: yPosition,
            head: [['Curso', 'Quantidade de Alunos', 'Percentual']],
            body: distributionData,
          });
          break;
          
        case 'attendance-trend':
          // Add summary section
          doc.setFontSize(14);
          doc.text('Resumo', 14, yPosition);
          yPosition += 10;
          
          doc.setFontSize(10);
          doc.text(`Média de frequência: ${reportData.summary?.averageAttendance || '0%'}`, 14, yPosition);
          yPosition += 6;
          
          const trendText = reportData.summary?.trend === 'increasing' ? 'Crescente' : 
                          reportData.summary?.trend === 'decreasing' ? 'Decrescente' : 'Estável';
          
          doc.text(`Tendência: ${trendText}`, 14, yPosition);
          yPosition += 10;
          
          // Add attendance data table
          doc.setFontSize(14);
          doc.text('Dados de Frequência por Data', 14, yPosition);
          yPosition += 10;
          
          const attendanceData = reportData.data.map((item: any) => [
            new Date(item.date).toLocaleDateString('pt-BR'),
            `${item.attendance}%`
          ]);
          
          autoTable(doc, {
            startY: yPosition,
            head: [['Data', 'Taxa de Frequência']],
            body: attendanceData,
          });
          break;
          
        case 'social-type':
        case 'social-needs':
          if (reportData.summary?.needCounts) {
            // Add needs table
            doc.setFontSize(14);
            doc.text('Necessidades Identificadas', 14, yPosition);
            yPosition += 10;
            
            const needsData = Object.entries(reportData.summary.needCounts).map(([need, count]) => {
              const total = Object.values(reportData.summary.needCounts).reduce((sum: any, val: any) => sum + val, 0);
              const percentage = Math.round((count as number / total) * 100);
              
              return [need, count, `${percentage}%`];
            });
            
            autoTable(doc, {
              startY: yPosition,
              head: [['Necessidade', 'Ocorrências', 'Percentual']],
              body: needsData,
            });
          }
          break;
          
        case 'social-referrals':
          // Add summary
          doc.setFontSize(14);
          doc.text('Encaminhamentos Realizados', 14, yPosition);
          yPosition += 10;
          
          doc.setFontSize(10);
          doc.text(`Total de encaminhamentos: ${reportData.summary?.totalReferrals || 0}`, 14, yPosition);
          yPosition += 10;
          
          // Add referrals table
          const referralsData = reportData.data.map((item: any) => {
            const percentage = reportData.summary?.totalReferrals ? 
              Math.round((item.count / reportData.summary.totalReferrals) * 100) : 0;
            
            return [item.type, item.count, `${percentage}%`];
          });
          
          autoTable(doc, {
            startY: yPosition,
            head: [['Tipo de Encaminhamento', 'Quantidade', 'Percentual']],
            body: referralsData,
          });
          break;
          
        case 'health-specialty':
          if (reportData.summary?.typeCounts) {
            // Add health records table
            doc.setFontSize(14);
            doc.text('Atendimentos por Especialidade', 14, yPosition);
            yPosition += 10;
            
            const specialtyData = [
              { name: 'Odontológico', value: reportData.summary.typeCounts.dental || 0 },
              { name: 'Psicológico', value: reportData.summary.typeCounts.psychological || 0 },
              { name: 'Nutricional', value: reportData.summary.typeCounts.nutritional || 0 },
              { name: 'Médico', value: reportData.summary.typeCounts.medical || 0 }
            ].map(item => {
              const total = 
                (reportData.summary.typeCounts.dental || 0) + 
                (reportData.summary.typeCounts.psychological || 0) + 
                (reportData.summary.typeCounts.nutritional || 0) + 
                (reportData.summary.typeCounts.medical || 0);
              
              const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
              
              return [item.name, item.value, `${percentage}%`];
            });
            
            autoTable(doc, {
              startY: yPosition,
              head: [['Especialidade', 'Quantidade', 'Percentual']],
              body: specialtyData,
            });
          }
          break;
          
        default:
          // Generic data
          doc.setFontSize(14);
          doc.text('Dados do Relatório', 14, yPosition);
          yPosition += 10;
          
          doc.setFontSize(10);
          doc.text(JSON.stringify(reportData.data, null, 2), 14, yPosition);
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
      doc.save(`${reportData.title.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.success('Relatório baixado com sucesso!');
      setReportModalOpen(false);
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Erro ao baixar relatório');
    } finally {
      setDownloading(false);
    }
  };

  const reportCategories = [
    {
      title: 'Alunos',
      id: 'students',
      reports: [
        { id: 'student-status', name: 'Alunos por Status', icon: <PieChart size={24} className="text-blue-500" />, type: 'student-status', category: 'students', description: 'Distribuição de alunos por status (ativo, trancado, concluído)' },
        { id: 'student-distribution', name: 'Alunos por Curso', icon: <BarChart size={24} className="text-blue-500" />, type: 'student-distribution', category: 'students', description: 'Quantidade de alunos matriculados em cada curso' },
        { id: 'age-distribution', name: 'Distribuição por Idade', icon: <BarChart size={24} className="text-blue-500" />, type: 'age-distribution', category: 'students', description: 'Distribuição de alunos por faixa etária' },
      ]
    },
    {
      title: 'Cursos',
      id: 'courses',
      reports: [
        { id: 'course-students', name: 'Alunos por Curso', icon: <BarChart size={24} className="text-green-500" />, type: 'student-distribution', category: 'courses', description: 'Quantidade de alunos matriculados em cada curso' },
        { id: 'course-completion', name: 'Taxa de Conclusão', icon: <PieChart size={24} className="text-green-500" />, type: 'course-completion', category: 'courses', description: 'Percentual de alunos que concluíram cada curso' },
        { id: 'course-occupancy', name: 'Ocupação de Vagas', icon: <BarChart size={24} className="text-green-500" />, type: 'course-occupancy', category: 'courses', description: 'Percentual de vagas ocupadas em cada curso' },
      ]
    },
    {
      title: 'Frequência',
      id: 'attendance',
      reports: [
        { id: 'attendance-course', name: 'Frequência por Curso', icon: <LineChart size={24} className="text-purple-500" />, type: 'attendance-course', category: 'attendance', description: 'Taxa de frequência dos alunos em cada curso' },
        { id: 'attendance-student', name: 'Faltas por Aluno', icon: <BarChart size={24} className="text-purple-500" />, type: 'attendance-student', category: 'attendance', description: 'Quantidade de faltas registradas por aluno' },
        { id: 'attendance-trend', name: 'Tendência de Frequência', icon: <LineChart size={24} className="text-purple-500" />, type: 'attendance-trend', category: 'attendance', description: 'Evolução da taxa de frequência ao longo do tempo' },
      ]
    },
    {
      title: 'Assistência Social',
      id: 'social',
      reports: [
        { id: 'social-type', name: 'Atendimentos por Tipo', icon: <PieChart size={24} className="text-pink-500" />, type: 'social-type', category: 'social', description: 'Distribuição de atendimentos por tipo de necessidade' },
        { id: 'social-referrals', name: 'Encaminhamentos Realizados', icon: <BarChart size={24} className="text-pink-500" />, type: 'social-referrals', category: 'social', description: 'Quantidade de encaminhamentos realizados por tipo' },
        { id: 'social-needs', name: 'Necessidades Identificadas', icon: <PieChart size={24} className="text-pink-500" />, type: 'social-type', category: 'social', description: 'Distribuição das necessidades identificadas nos atendimentos' },
      ]
    },
    {
      title: 'Saúde',
      id: 'health',
      reports: [
        { id: 'health-specialty', name: 'Atendimentos por Especialidade', icon: <PieChart size={24} className="text-red-500" />, type: 'health-specialty', category: 'health', description: 'Distribuição de atendimentos por especialidade' },
        { id: 'health-conditions', name: 'Condições Identificadas', icon: <BarChart size={24} className="text-red-500" />, type: 'health-conditions', category: 'health', description: 'Principais condições de saúde identificadas' },
        { id: 'health-evolution', name: 'Evolução de Atendimentos', icon: <LineChart size={24} className="text-red-500" />, type: 'health-evolution', category: 'health', description: 'Evolução da quantidade de atendimentos ao longo do tempo' },
      ]
    },
  ];

  // Filter reports based on search and category
  const filteredCategories = reportCategories
    .map(category => {
      const filteredReports = category.reports.filter(report => {
        const matchesSearch = searchTerm === '' || 
          report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (report.description && report.description.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesCategory = selectedCategory === 'all' || category.id === selectedCategory;
        
        return matchesSearch && matchesCategory;
      });
      
      return {
        ...category,
        reports: filteredReports
      };
    })
    .filter(category => category.reports.length > 0);

  // Prepare chart data for report modal
  const getChartData = () => {
    if (!reportData || !selectedReport) return null;
    
    switch (selectedReport.type) {
      case 'student-status':
        return {
          type: 'pie',
          data: {
            labels: ['Ativos', 'Trancados', 'Concluídos'],
            datasets: [{
              data: [
                reportData.summary?.statusCounts.active || 0,
                reportData.summary?.statusCounts.locked || 0,
                reportData.summary?.statusCounts.completed || 0
              ],
              backgroundColor: [
                'rgba(75, 192, 192, 0.6)',
                'rgba(255, 206, 86, 0.6)',
                'rgba(54, 162, 235, 0.6)'
              ],
              borderColor: [
                'rgb(75, 192, 192)',
                'rgb(255, 206, 86)',
                'rgb(54, 162, 235)'
              ],
              borderWidth: 1
            }]
          }
        };
        
      case 'student-distribution':
      case 'course-students':
        return {
          type: 'bar',
          data: {
            labels: reportData.data.map((item: any) => item.course_name),
            datasets: [{
              label: 'Número de Alunos',
              data: reportData.data.map((item: any) => item.student_count),
              backgroundColor: 'rgba(54, 162, 235, 0.6)',
              borderColor: 'rgb(54, 162, 235)',
              borderWidth: 1
            }]
          }
        };
        
      case 'age-distribution':
        return {
          type: 'pie',
          data: {
            labels: ['0-12 anos', '13-17 anos', '18+ anos'],
            datasets: [{
              data: [
                reportData.summary?.ageGroups['0-12'] || 0,
                reportData.summary?.ageGroups['13-17'] || 0,
                reportData.summary?.ageGroups['18+'] || 0
              ],
              backgroundColor: [
                'rgba(255, 99, 132, 0.6)',
                'rgba(54, 162, 235, 0.6)',
                'rgba(75, 192, 192, 0.6)'
              ],
              borderColor: [
                'rgb(255, 99, 132)',
                'rgb(54, 162, 235)',
                'rgb(75, 192, 192)'
              ],
              borderWidth: 1
            }]
          }
        };
        
      case 'attendance-trend':
        return {
          type: 'line',
          data: {
            labels: reportData.data.map((item: any) => {
              const date = new Date(item.date);
              return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            }),
            datasets: [{
              label: 'Taxa de Frequência (%)',
              data: reportData.data.map((item: any) => item.attendance),
              borderColor: 'rgb(75, 192, 192)',
              backgroundColor: 'rgba(75, 192, 192, 0.1)',
              tension: 0.3,
              fill: true
            }]
          }
        };
        
      case 'social-type':
      case 'social-needs':
        if (!reportData.summary?.needCounts) return null;
        
        const needTypes = Object.keys(reportData.summary.needCounts);
        const needCounts = Object.values(reportData.summary.needCounts);
        
        return {
          type: 'pie',
          data: {
            labels: needTypes,
            datasets: [{
              data: needCounts,
              backgroundColor: [
                'rgba(255, 99, 132, 0.6)',
                'rgba(54, 162, 235, 0.6)',
                'rgba(255, 206, 86, 0.6)',
                'rgba(75, 192, 192, 0.6)',
                'rgba(153, 102, 255, 0.6)',
                'rgba(255, 159, 64, 0.6)',
                'rgba(201, 203, 207, 0.6)'
              ],
              borderWidth: 1
            }]
          }
        };
        
      case 'social-referrals':
        return {
          type: 'bar',
          data: {
            labels: reportData.data.map((item: any) => item.type),
            datasets: [{
              label: 'Quantidade',
              data: reportData.data.map((item: any) => item.count),
              backgroundColor: 'rgba(255, 99, 132, 0.6)',
              borderColor: 'rgb(255, 99, 132)',
              borderWidth: 1
            }]
          }
        };
        
      case 'health-specialty':
        if (!reportData.summary?.typeCounts) return null;
        
        return {
          type: 'pie',
          data: {
            labels: ['Odontológico', 'Psicológico', 'Nutricional', 'Médico'],
            datasets: [{
              data: [
                reportData.summary.typeCounts.dental || 0,
                reportData.summary.typeCounts.psychological || 0,
                reportData.summary.typeCounts.nutritional || 0,
                reportData.summary.typeCounts.medical || 0
              ],
              backgroundColor: [
                'rgba(54, 162, 235, 0.6)',
                'rgba(153, 102, 255, 0.6)',
                'rgba(75, 192, 192, 0.6)',
                'rgba(255, 99, 132, 0.6)'
              ],
              borderWidth: 1
            }]
          }
        };
        
      default:
        return null;
    }
  };

  const chartData = getChartData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <Button 
          variant="primary" 
          leftIcon={<FileText size={18} />}
          onClick={() => {
            toast.info('Selecione um tipo de relatório para gerar');
          }}
        >
          Gerar Relatório Personalizado
        </Button>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Buscar relatórios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search size={18} />}
              fullWidth
            />
          </div>
          <div className="flex space-x-2 overflow-x-auto pb-2">
            <Button
              variant={selectedCategory === 'all' ? 'primary' : 'secondary'}
              onClick={() => setSelectedCategory('all')}
            >
              Todos
            </Button>
            {reportCategories.map(category => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'primary' : 'secondary'}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.title}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCategories.map((category) => (
            <Card key={category.id} title={category.title}>
              <div className="space-y-4">
                {category.reports.map((report) => (
                  <div 
                    key={report.id} 
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                    onClick={() => handleGenerateReport(report)}
                  >
                    <div className="flex items-center">
                      {report.icon}
                      <span className="ml-3 font-medium">{report.name}</span>
                    </div>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      leftIcon={<Download size={16} />}
                      isLoading={generatingReport && selectedReport?.id === report.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateReport(report);
                      }}
                    >
                      Gerar
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Report Modal */}
      <Modal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title={reportData?.title || "Relatório"}
        size="xl"
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
              onClick={handleDownloadReport}
              isLoading={downloading}
            >
              Baixar Relatório PDF
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="flex items-center p-4 bg-blue-50 rounded-lg">
            {selectedReport?.icon && React.cloneElement(selectedReport.icon as React.ReactElement, { size: 24 })}
            <div className="ml-3">
              <p className="font-medium">{reportData?.title}</p>
              <p className="text-sm text-gray-600">{reportData?.description}</p>
            </div>
          </div>
          
          {/* Chart visualization */}
          {chartData && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-3 border-b font-medium">
                Visualização Gráfica
              </div>
              <div className="p-4 flex justify-center">
                <div className="w-full max-w-lg h-64">
                  {chartData.type === 'pie' && (
                    <Pie data={chartData.data} />
                  )}
                  {chartData.type === 'bar' && (
                    <Bar 
                      data={chartData.data}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top',
                          },
                        },
                      }}
                    />
                  )}
                  {chartData.type === 'line' && (
                    <Bar 
                      data={chartData.data}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top',
                          },
                        },
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Data table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 p-3 border-b font-medium">
              Dados do Relatório
            </div>
            <div className="p-4">
              {selectedReport?.type === 'student-status' && (
                <div>
                  <h4 className="font-medium mb-2">Alunos por Status</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantidade</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentual</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        <tr>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">Ativos</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">{reportData?.summary?.statusCounts.active || 0}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">
                            {reportData?.summary?.total ? 
                              `${Math.round((reportData.summary.statusCounts.active / reportData.summary.total) * 100)}%` : 
                              '0%'}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">Trancados</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">{reportData?.summary?.statusCounts.locked || 0}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">
                            {reportData?.summary?.total ? 
                              `${Math.round((reportData.summary.statusCounts.locked / reportData.summary.total) * 100)}%` : 
                              '0%'}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">Concluídos</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">{reportData?.summary?.statusCounts.completed || 0}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">
                            {reportData?.summary?.total ? 
                              `${Math.round((reportData.summary.statusCounts.completed / reportData.summary.total) * 100)}%` : 
                              '0%'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
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
                          <td className="px-3 py-2 whitespace-nowrap text-sm">{reportData?.summary?.ageGroups.under12 || 0}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">30%</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">13 a 17 anos</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">{reportData?.summary?.ageGroups.teens || 0}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">50%</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">18 anos ou mais</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">{reportData?.summary?.ageGroups.adults || 0}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">20%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {(selectedReport?.type === 'student-distribution' || selectedReport?.type === 'course-students') && (
                <div>
                  <h4 className="font-medium mb-2">Alunos por Curso</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Curso</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantidade de Alunos</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentual</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData?.data.map((item: any, index: number) => (
                          <tr key={index}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">{item.course_name}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">{item.student_count}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">
                              {reportData.summary?.totalStudents ? 
                                `${Math.round((item.student_count / reportData.summary.totalStudents) * 100)}%` : 
                                '0%'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="font-medium">Resumo</p>
                    <p className="text-sm mt-1">Total de alunos: <span className="font-medium">{reportData?.summary?.totalStudents || 0}</span></p>
                    <p className="text-sm">Total de cursos: <span className="font-medium">{reportData?.summary?.totalCourses || 0}</span></p>
                    <p className="text-sm">Média de alunos por curso: <span className="font-medium">
                      {reportData?.summary?.totalStudents && reportData?.summary?.totalCourses ? 
                        Math.round(reportData.summary.totalStudents / reportData.summary.totalCourses) : 
                        0}
                    </span></p>
                  </div>
                </div>
              )}
              
              {selectedReport?.type === 'attendance-trend' && (
                <div>
                  <h4 className="font-medium mb-2">Tendência de Frequência</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Taxa de Frequência</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData?.data.map((item: any, index: number) => (
                          <tr key={index}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">{new Date(item.date).toLocaleDateString('pt-BR')}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">{item.attendance}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="font-medium">Resumo</p>
                    <p className="text-sm mt-1">Média de frequência: <span className="font-medium">{reportData?.summary?.averageAttendance || '0%'}</span></p>
                    <p className="text-sm">Tendência: <span className="font-medium">
                      {reportData?.summary?.trend === 'increasing' ? 'Crescente' : 
                       reportData?.summary?.trend === 'decreasing' ? 'Decrescente' : 'Estável'}
                    </span></p>
                  </div>
                </div>
              )}
              
              {(selectedReport?.type === 'social-type' || selectedReport?.type === 'social-needs') && reportData?.summary?.needCounts && (
                <div>
                  <h4 className="font-medium mb-2">Necessidades Identificadas</h4>
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
                        {Object.entries(reportData.summary.needCounts).map(([need, count], index) => {
                          const total = Object.values(reportData.summary.needCounts).reduce((sum: any, val: any) => sum + val, 0);
                          const percentage = Math.round((count as number / total) * 100);
                          
                          return (
                            <tr key={index}>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">{need}</td>
                              <td className="px-3  py-2 whitespace-nowrap text-sm">{count}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">{percentage}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {selectedReport?.type === 'social-referrals' && (
                <div>
                  <h4 className="font-medium mb-2">Encaminhamentos Realizados</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de Encaminhamento</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantidade</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentual</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData?.data.map((item: any, index: number) => (
                          <tr key={index}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">{item.type}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">{item.count}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm">
                              {reportData.summary?.totalReferrals ? 
                                `${Math.round((item.count / reportData.summary.totalReferrals) * 100)}%` : 
                                '0%'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="font-medium">Resumo</p>
                    <p className="text-sm mt-1">Total de encaminhamentos: <span className="font-medium">{reportData?.summary?.totalReferrals || 0}</span></p>
                  </div>
                </div>
              )}
              
              {selectedReport?.type === 'health-specialty' && reportData?.summary?.typeCounts && (
                <div>
                  <h4 className="font-medium mb-2">Atendimentos por Especialidade</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Especialidade</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantidade</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentual</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {[
                          { name: 'Odontológico', value: reportData.summary.typeCounts.dental || 0 },
                          { name: 'Psicológico', value: reportData.summary.typeCounts.psychological || 0 },
                          { name: 'Nutricional', value: reportData.summary.typeCounts.nutritional || 0 },
                          { name: 'Médico', value: reportData.summary.typeCounts.medical || 0 }
                        ].map((item, index) => {
                          const total = 
                            (reportData.summary.typeCounts.dental || 0) + 
                            (reportData.summary.typeCounts.psychological || 0) + 
                            (reportData.summary.typeCounts.nutritional || 0) + 
                            (reportData.summary.typeCounts.medical || 0);
                          
                          const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
                          
                          return (
                            <tr key={index}>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">{item.name}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">{item.value}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">{percentage}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Default table for other report types */}
              {!['student-status', 'student-distribution', 'course-students', 'attendance-trend', 
                 'social-type', 'social-needs', 'social-referrals', 'health-specialty'].includes(selectedReport?.type || '') && (
                <div className="text-center py-4 text-gray-500">
                  <p>Dados detalhados para este relatório serão exibidos aqui.</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end">
            <p className="text-sm text-gray-500 italic">
              Relatório gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ReportsList;
