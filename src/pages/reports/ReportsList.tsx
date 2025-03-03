import React, { useState, useEffect } from 'react';
import { FileText, Download, Filter, Calendar, Activity, Heart, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-toastify';

interface ReportFilters {
  startDate: string;
  endDate: string;
  reportType: 'attendance' | 'courses' | 'health' | 'social' | 'demographics';
  courseId: string;
  healthType?: 'dental' | 'psychological' | 'nutritional' | 'medical';
}

const ReportsList: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reportType: 'attendance',
    courseId: '',
    healthType: 'dental'
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Erro ao carregar cursos');
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      let reportData;
      let reportTitle = '';

      switch (filters.reportType) {
        case 'attendance': {
          reportTitle = 'Relatório de Frequência';
          const query = supabase
            .from('attendance_students')
            .select(`
              *,
              enrollment:enrollments!inner(
                student:students(
                  full_name,
                  cpf
                ),
                course:courses(
                  name
                )
              )
            `)
            .gte('date', filters.startDate)
            .lte('date', filters.endDate);

          if (filters.courseId) {
            query.eq('enrollment.course_id', filters.courseId);
          }

          const { data, error } = await query;
          if (error) throw error;
          reportData = data;
          break;
        }

        case 'courses': {
          reportTitle = 'Relatório de Cursos';
          const { data, error } = await supabase
            .from('courses')
            .select('*, enrollments(status, student:students(*))')
            .eq(filters.courseId ? 'id' : 'id', filters.courseId || supabase.raw('id'));

          if (error) throw error;
          reportData = data;
          break;
        }

        case 'health': {
          reportTitle = `Relatório de Saúde - ${
            filters.healthType === 'dental' ? 'Odontológico' :
            filters.healthType === 'psychological' ? 'Psicológico' :
            filters.healthType === 'nutritional' ? 'Nutricional' : 'Médico'
          }`;

          const query = supabase
            .from('health_records')
            .select(`
              *,
              student:students(
                full_name,
                cpf,
                age
              )
            `)
            .eq('record_type', filters.healthType)
            .gte('date', filters.startDate)
            .lte('date', filters.endDate);

          const { data, error } = await query;
          if (error) throw error;
          reportData = data;
          break;
        }

        case 'social': {
          reportTitle = 'Relatório de Assistência Social';
          const query = supabase
            .from('social_assistance_records')
            .select(`
              *,
              student:students(
                full_name,
                cpf,
                age,
                nis
              )
            `)
            .gte('date', filters.startDate)
            .lte('date', filters.endDate);

          const { data, error } = await query;
          if (error) throw error;
          reportData = data;
          break;
        }

        case 'demographics': {
          reportTitle = 'Perfil Demográfico dos Alunos';
          const { data, error } = await supabase
            .from('students')
            .select('*');

          if (error) throw error;
          reportData = data;
          break;
        }
      }

      // Create PDF document
      const doc = new jsPDF();

      // Add header
      doc.setFontSize(18);
      doc.text(reportTitle, 14, 20);

      doc.setFontSize(12);
      doc.text(
        `Período: ${new Date(filters.startDate).toLocaleDateString('pt-BR')} a ${new Date(filters.endDate).toLocaleDateString('pt-BR')}`,
        14,
        30
      );

      if (filters.courseId) {
        const course = courses.find(c => c.id === filters.courseId);
        doc.text(`Curso: ${course?.name}`, 14, 38);
      }

      let yPosition = 50;

      switch (filters.reportType) {
        case 'attendance': {
          // Group attendance by course and date
          const attendanceByDate: Record<string, any[]> = {};
          reportData.forEach((record: any) => {
            const date = new Date(record.date).toLocaleDateString('pt-BR');
            if (!attendanceByDate[date]) {
              attendanceByDate[date] = [];
            }
            attendanceByDate[date].push(record);
          });

          // Add attendance summary
          const totalAttendances = reportData.length;
          const presentCount = reportData.filter((r: any) => r.status === 'present').length;
          const absentCount = reportData.filter((r: any) => r.status === 'absent').length;
          const attendanceRate = ((presentCount / totalAttendances) * 100).toFixed(1);

          doc.setFontSize(14);
          doc.text('Resumo de Frequência', 14, yPosition);
          yPosition += 10;

          const summaryData = [
            ['Total de Registros', totalAttendances.toString()],
            ['Presenças', presentCount.toString()],
            ['Faltas', absentCount.toString()],
            ['Taxa de Frequência', `${attendanceRate}%`],
          ];

          autoTable(doc, {
            startY: yPosition,
            body: summaryData,
          });

          yPosition = (doc as any).lastAutoTable.finalY + 15;

          // Add detailed attendance by date
          Object.entries(attendanceByDate).forEach(([date, records]) => {
            doc.setFontSize(14);
            doc.text(`Frequência - ${date}`, 14, yPosition);
            yPosition += 10;

            const tableData = records.map((record: any) => [
              record.enrollment.student.full_name,
              record.enrollment.student.cpf,
              record.enrollment.course.name,
              record.status === 'present' ? 'Presente' : 'Ausente',
              record.absence_reason || '-',
            ]);

            autoTable(doc, {
              startY: yPosition,
              head: [['Aluno', 'CPF', 'Curso', 'Status', 'Motivo da Falta']],
              body: tableData,
            });

            yPosition = (doc as any).lastAutoTable.finalY + 15;
          });
          break;
        }

        case 'courses': {
          // Group students by course
          reportData.forEach((course: any) => {
            doc.setFontSize(14);
            doc.text(course.name, 14, yPosition);
            yPosition += 10;

            const courseDetails = [
              ['Carga Horária', `${course.workload_hours}h`],
              ['Turno', course.shift === 'morning' ? 'Manhã' : course.shift === 'afternoon' ? 'Tarde' : 'Noite'],
              ['Vagas Disponíveis', course.available_spots.toString()],
              ['Alunos Matriculados', course.enrollments.length.toString()],
              ['Ativos', course.enrollments.filter((e: any) => e.status === 'active').length.toString()],
              ['Trancados', course.enrollments.filter((e: any) => e.status === 'locked').length.toString()],
              ['Concluídos', course.enrollments.filter((e: any) => e.status === 'completed').length.toString()],
            ];

            autoTable(doc, {
              startY: yPosition,
              body: courseDetails,
            });

            yPosition = (doc as any).lastAutoTable.finalY + 10;

            if (course.enrollments.length > 0) {
              const studentsData = course.enrollments.map((enrollment: any) => [
                enrollment.student.full_name,
                enrollment.student.cpf,
                enrollment.status,
              ]);

              autoTable(doc, {
                startY: yPosition,
                head: [['Aluno', 'CPF', 'Status']],
                body: studentsData,
              });

              yPosition = (doc as any).lastAutoTable.finalY + 15;
            }
          });
          break;
        }

        case 'health': {
          doc.setFontSize(14);
          doc.text('Registros de Saúde', 14, yPosition);
          yPosition += 10;

          const tableData = reportData.map((record: any) => [
            record.student.full_name,
            record.student.cpf,
            new Date(record.date).toLocaleDateString('pt-BR'),
            record.professional_name,
            record.notes,
          ]);

          autoTable(doc, {
            startY: yPosition,
            head: [['Aluno', 'CPF', 'Data', 'Profissional', 'Observações']],
            body: tableData,
          });

          break;
        }

        case 'social': {
          // Count occurrences of each need type
          const needCounts: Record<string, number> = {};
          reportData.forEach((record: any) => {
            record.identified_needs.forEach((need: string) => {
              needCounts[need] = (needCounts[need] || 0) + 1;
            });
          });

          // Add summary
          doc.setFontSize(14);
          doc.text('Necessidades Identificadas', 14, yPosition);
          yPosition += 10;

          const totalNeeds = Object.values(needCounts).reduce((sum, count) => sum + count, 0);
          const needsData = Object.entries(needCounts).map(([need, count]) => [
            need,
            count,
            `${Math.round((count / totalNeeds) * 100)}%`,
          ]);

          autoTable(doc, {
            startY: yPosition,
            head: [['Necessidade', 'Ocorrências', 'Percentual']],
            body: needsData,
          });

          yPosition = (doc as any).lastAutoTable.finalY + 15;

          // Add detailed records
          doc.setFontSize(14);
          doc.text('Atendimentos Realizados', 14, yPosition);
          yPosition += 10;

          const recordsData = reportData.map((record: any) => [
            record.student.full_name,
            record.student.cpf,
            new Date(record.date).toLocaleDateString('pt-BR'),
            record.identified_needs.join(', '),
            record.notes,
          ]);

          autoTable(doc, {
            startY: yPosition,
            head: [['Aluno', 'CPF', 'Data', 'Necessidades', 'Observações']],
            body: recordsData,
          });

          break;
        }

        case 'demographics': {
          // Calculate age groups
          const ageGroups = {
            under12: reportData.filter((s: any) => s.age < 12).length,
            teens: reportData.filter((s: any) => s.age >= 12 && s.age < 18).length,
            adults: reportData.filter((s: any) => s.age >= 18).length,
          };

          // Calculate NIS percentage
          const withNis = reportData.filter((s: any) => s.nis).length;
          const nisPercentage = ((withNis / reportData.length) * 100).toFixed(1);

          // Add age distribution
          doc.setFontSize(14);
          doc.text('Distribuição por Idade', 14, yPosition);
          yPosition += 10;

          const ageData = [
            ['Até 12 anos', ageGroups.under12, `${((ageGroups.under12 / reportData.length) * 100).toFixed(1)}%`],
            ['12 a 17 anos', ageGroups.teens, `${((ageGroups.teens / reportData.length) * 100).toFixed(1)}%`],
            ['18 anos ou mais', ageGroups.adults, `${((ageGroups.adults / reportData.length) * 100).toFixed(1)}%`],
          ];

          autoTable(doc, {
            startY: yPosition,
            head: [['Faixa Etária', 'Quantidade', 'Percentual']],
            body: ageData,
          });

          yPosition = (doc as any).lastAutoTable.finalY + 15;

          // Add NIS information
          doc.setFontSize(14);
          doc.text('Indicadores Socioeconômicos', 14, yPosition);
          yPosition += 10;

          const nisData = [
            ['Total de Alunos', reportData.length],
            ['Alunos com NIS', withNis],
            ['Percentual com NIS', `${nisPercentage}%`],
          ];

          autoTable(doc, {
            startY: yPosition,
            body: nisData,
          });

          yPosition = (doc as any).lastAutoTable.finalY + 15;

          // Add address distribution
          doc.setFontSize(14);
          doc.text('Distribuição por Endereço', 14, yPosition);
          yPosition += 10;

          const addressData = reportData.map((student: any) => [
            student.full_name,
            student.cpf,
            student.address,
            student.nis ? 'Sim' : 'Não',
          ]);

          autoTable(doc, {
            startY: yPosition,
            head: [['Nome', 'CPF', 'Endereço', 'NIS']],
            body: addressData,
          });

          break;
        }
      }

      // Add footer with page numbers
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(
          `Página ${i} de ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Save the PDF
      const fileName = `${reportTitle.toLowerCase().replace(/\s+/g, '_')}_${filters.startDate}_${filters.endDate}.pdf`;
      doc.save(fileName);

      toast.success('Relatório gerado com sucesso!');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
      </div>

      <Card>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              type="date"
              label="Data Inicial"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              fullWidth
            />

            <Input
              type="date"
              label="Data Final"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              fullWidth
            />

            <Select
              label="Curso"
              options={[
                { value: '', label: 'Todos os Cursos' },
                ...courses.map(course => ({
                  value: course.id,
                  label: course.name
                }))
              ]}
              value={filters.courseId}
              onChange={(value) => setFilters({ ...filters, courseId: value })}
              fullWidth
            />

            <Select
              label="Tipo de Relatório"
              options={[
                { value: 'attendance', label: 'Frequência' },
                { value: 'courses', label: 'Cursos' },
                { value: 'health', label: 'Saúde' },
                { value: 'social', label: 'Assistência Social' },
                { value: 'demographics', label: 'Perfil dos Alunos' },
              ]}
              value={filters.reportType}
              onChange={(value) => setFilters({ ...filters, reportType: value as any })}
              fullWidth
            />
            
            {filters.reportType === 'health' && (
              <Select
                label="Tipo de Registro"
                options={[
                  { value: 'dental', label: 'Odontológico' },
                  { value: 'psychological', label: 'Psicológico' },
                  { value: 'nutritional', label: 'Nutricional' },
                  { value: 'medical', label: 'Médico' },
                ]}
                value={filters.healthType}
                onChange={(value) => setFilters({ ...filters, healthType: value as any })}
                fullWidth
              />
            )}
          </div>

          <div className="flex justify-end">
            <Button
              variant="primary"
              leftIcon={<Download size={18} />}
              onClick={generateReport}
              isLoading={loading}
            >
              Gerar Relatório
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-full bg-purple-100">
              <Calendar size={24} className="text-purple-600" />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFilters({ ...filters, reportType: 'attendance' })}
            >
              Gerar
            </Button>
          </div>
          <h3 className="text-lg font-medium">Relatório de Frequência</h3>
          <p className="text-sm text-gray-500 mt-2">
            Lista presença e faltas dos alunos por curso
          </p>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-full bg-green-100">
              <FileText size={24} className="text-green-600" />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFilters({ ...filters, reportType: 'courses' })}
            >
              Gerar
            </Button>
          </div>
          <h3 className="text-lg font-medium">Relatório de Cursos</h3>
          <p className="text-sm text-gray-500 mt-2">
            Número de alunos e status das matrículas por curso
          </p>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-full bg-blue-100">
              <Activity size={24} className="text-blue-600" />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFilters({ ...filters, reportType: 'health' })}
            >
              Gerar
            </Button>
          </div>
          <h3 className="text-lg font-medium">Relatório de Saúde</h3>
          <p className="text-sm text-gray-500 mt-2">
            Registros de saúde por tipo de atendimento
          </p>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-full bg-pink-100">
              <Heart size={24} className="text-pink-600" />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFilters({ ...filters, reportType: 'social' })}
            >
              Gerar
            </Button>
          </div>
          <h3 className="text-lg font-medium">Assistência Social</h3>
          <p className="text-sm text-gray-500 mt-2">
            Atendimentos e necessidades identificadas
          </p>
        </Card>

        <Card className="hover:shadow-lg transition-shadow lg:col-span-4">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-full bg-yellow-100">
              <Users size={24} className="text-yellow-600" />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFilters({ ...filters, reportType: 'demographics' })}
            >
              Gerar
            </Button>
          </div>
          <h3 className="text-lg font-medium">Perfil dos Alunos</h3>
          <p className="text-sm text-gray-500 mt-2">
            Resumo demográfico e socioeconômico dos alunos
          </p>
        </Card>
      </div>
    </div>
  );
};

export default ReportsList;
