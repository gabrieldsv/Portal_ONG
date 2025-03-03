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
          const { data, error } = await supabase
            .from('attendance_students')
            .select(`
              *,
              enrollment:enrollments (
                student:students (
                  full_name,
                  cpf,
                  age,
                  phone,
                  email
                ),
                course:courses (
                  name,
                  shift,
                  workload_hours
                )
              )
            `)
            .order('date', { ascending: false });

          if (error) throw error;
          reportData = data;
          break;
        }

        case 'courses': {
          reportTitle = 'Relatório de Cursos';
          const { data, error } = await supabase
            .from('enrollments')
            .select(`
              *,
              student:students (
                full_name,
                cpf,
                age,
                phone,
                email,
                address,
                nis
              ),
              course:courses (
                name,
                description,
                workload_hours,
                shift,
                executive_manager,
                volunteer_manager,
                educational_advisor
              )
            `);

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
          const { data, error } = await supabase
            .from('social_assistance_records')
            .select(`
              *,
              student:students (
                full_name,
                cpf,
                age,
                phone,
                email,
                address,
                nis
              )
            `)
            .order('date', { ascending: false });

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
      doc.setFontSize(14);
      doc.text('ONG Amar Sem Limites', 14, 30);
      
      doc.setFontSize(12);
      doc.text(`Data de geração: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 40);
      doc.text(`Período: ${new Date(filters.startDate).toLocaleDateString('pt-BR')} a ${new Date(filters.endDate).toLocaleDateString('pt-BR')}`, 14, 48);
      
      // Add content based on report type
      let yPosition = 60;

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

          // Add course details
          const courseDetails = {};
          reportData.forEach(record => {
            const course = record.enrollment.course;
            if (!courseDetails[course.name]) {
              courseDetails[course.name] = {
                name: course.name,
                shift: course.shift === 'morning' ? 'Manhã' : course.shift === 'afternoon' ? 'Tarde' : 'Noite',
                workload: course.workload_hours,
                students: new Set(),
                present: 0,
                absent: 0
              };
            }
            courseDetails[course.name].students.add(record.enrollment.student.full_name);
            if (record.status === 'present') {
              courseDetails[course.name].present++;
            } else {
              courseDetails[course.name].absent++;
            }
          });

          const courseDetailsData = Object.values(courseDetails).map(course => [
            course.name,
            course.shift,
            `${course.workload}h`,
            course.students.size,
            course.present,
            course.absent,
            `${((course.present / (course.present + course.absent)) * 100).toFixed(1)}%`
          ]);

          autoTable(doc, {
            startY: yPosition,
            head: [['Curso', 'Turno', 'C.H.', 'Alunos', 'Presenças', 'Faltas', 'Taxa']],
            body: courseDetailsData,
          });

          yPosition = (doc as any).lastAutoTable.finalY + 15;
          
          // Add summary table
          doc.setFontSize(14);
          doc.text('Detalhamento por Aluno', 14, yPosition);
          yPosition += 10;
          
          // Group by student
          const studentAttendance = {};
          reportData.forEach(record => {
            const student = record.enrollment.student;
            const key = `${student.full_name}-${student.cpf}`;
            if (!studentAttendance[key]) {
              studentAttendance[key] = {
                name: student.full_name,
                cpf: student.cpf,
                age: student.age,
                courses: new Set(),
                present: 0,
                absent: 0,
                absenceReasons: []
              };
            }
            studentAttendance[key].courses.add(record.enrollment.course.name);
            if (record.status === 'present') {
              studentAttendance[key].present++;
            } else {
              studentAttendance[key].absent++;
              if (record.absence_reason) {
                studentAttendance[key].absenceReasons.push({
                  date: record.date,
                  reason: record.absence_reason
                });
              }
            }
          });

          const studentDetailsData = Object.values(studentAttendance).map(student => [
            student.name,
            student.cpf,
            student.age,
            Array.from(student.courses).join(', '),
            student.present,
            student.absent,
            `${((student.present / (student.present + student.absent)) * 100).toFixed(1)}%`
          ]);
          
          autoTable(doc, {
            startY: yPosition,
            head: [['Aluno', 'CPF', 'Idade', 'Cursos', 'Presenças', 'Faltas', 'Taxa']],
            body: studentDetailsData,
          });
          
          // Calculate overall attendance
          const totalAttendance = reportData.length;
          const totalPresent = reportData.filter((r: any) => r.status === 'present').length;
          const totalAbsent = reportData.filter((r: any) => r.status === 'absent').length;
          const overallRate = ((totalPresent / totalAttendance) * 100).toFixed(1);
          
          yPosition = (doc as any).lastAutoTable.finalY + 15;
          doc.setFontSize(12);
          doc.text(`Total de registros: ${totalAttendance}`, 14, yPosition);
          yPosition += 6;
          doc.text(`Presenças: ${totalPresent} (${overallRate}%)`, 14, yPosition);
          yPosition += 8;
          doc.text(`Faltas: ${totalAbsent} (${(100 - overallRate).toFixed(1)}%)`, 14, yPosition);

          // Add absence reasons if any exist
          const absenceReasons = Object.values(studentAttendance)
            .flatMap(student => student.absenceReasons)
            .filter(reason => reason);

          if (absenceReasons.length > 0) {
            yPosition += 15;
            doc.setFontSize(14);
            doc.text('Registro de Faltas', 14, yPosition);
            yPosition += 10;

            const absenceData = absenceReasons.map(reason => [
              new Date(reason.date).toLocaleDateString('pt-BR'),
              reason.reason
            ]);

            autoTable(doc, {
              startY: yPosition,
              head: [['Data', 'Motivo da Falta']],
              body: absenceData,
            });
          }
          break;
        }

        case 'courses': {
          // Count students by status
          const studentsByStatus = {
            active: [],
            locked: [],
            completed: []
          };

          reportData.forEach((enrollment: any) => {
            studentsByStatus[enrollment.status].push({
              ...enrollment.student,
              course: enrollment.course.name,
              enrollmentDate: enrollment.enrollment_date
            });
          });
          
          const totalStudents = reportData.length;
          
          // Add summary
          doc.setFontSize(14);
          doc.text('Alunos por Status', 14, yPosition);
          yPosition += 10;
          
          // Detailed status counts
          const studentStatusData = [
            ['Ativo', studentsByStatus.active.length, `${((studentsByStatus.active.length / totalStudents) * 100).toFixed(1)}%`],
            ['Trancado', studentsByStatus.locked.length, `${((studentsByStatus.locked.length / totalStudents) * 100).toFixed(1)}%`],
            ['Concluído', studentsByStatus.completed.length, `${((studentsByStatus.completed.length / totalStudents) * 100).toFixed(1)}%`]
          ];
          
          autoTable(doc, {
            startY: yPosition,
            head: [['Status', 'Quantidade', 'Percentual']],
            body: studentStatusData,
          });
          
          yPosition = (doc as any).lastAutoTable.finalY + 10;
          
          // Add age distribution
          const ageGroups = {
            under12: reportData.filter((e: any) => e.student.age < 12),
            teens: reportData.filter((e: any) => e.student.age >= 12 && e.student.age < 18),
            adults: reportData.filter((e: any) => e.student.age >= 18)
          };
          
          doc.setFontSize(14);
          doc.text('Distribuição por Idade', 14, yPosition);
          yPosition += 10;
          
          const totalByAge = ageGroups.under12.length + ageGroups.teens.length + ageGroups.adults.length;
          
          const ageDistributionData = [
            ['Até 12 anos', ageGroups.under12.length, `${((ageGroups.under12.length / totalByAge) * 100).toFixed(1)}%`],
            ['13 a 17 anos', ageGroups.teens.length, `${((ageGroups.teens.length / totalByAge) * 100).toFixed(1)}%`],
            ['18 anos ou mais', ageGroups.adults.length, `${((ageGroups.adults.length / totalByAge) * 100).toFixed(1)}%`]
          ];
          
          autoTable(doc, {
            startY: yPosition,
            head: [['Faixa Etária', 'Quantidade', 'Percentual']],
            body: ageDistributionData,
          });

          // Add detailed student list by status
          ['active', 'locked', 'completed'].forEach(status => {
            if (studentsByStatus[status].length > 0) {
              yPosition = (doc as any).lastAutoTable.finalY + 15;
              doc.setFontSize(14);
              doc.text(`Alunos ${
                status === 'active' ? 'Ativos' :
                status === 'locked' ? 'Trancados' : 'Concluídos'
              }`, 14, yPosition);
              yPosition += 10;

              const statusData = studentsByStatus[status].map(student => [
                student.full_name,
                student.cpf,
                student.age,
                student.course,
                new Date(student.enrollmentDate).toLocaleDateString('pt-BR'),
                student.nis ? 'Sim' : 'Não'
              ]);

              autoTable(doc, {
                startY: yPosition,
                head: [['Nome', 'CPF', 'Idade', 'Curso', 'Data Matrícula', 'NIS']],
                body: statusData,
              });
            }
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
          doc.text('Resumo dos Atendimentos', 14, yPosition);
          yPosition += 10;
          
          const totalNeeds = Object.values(needCounts).reduce((sum, count) => sum + count, 0);
          
          const needsData = Object.entries(needCounts).map(([need, count]) => [
            need,
            count,
            `${((count / totalNeeds) * 100).toFixed(1)}%`
          ]);
          
          autoTable(doc, {
            startY: yPosition,
            head: [['Necessidade', 'Ocorrências', 'Percentual']],
            body: needsData,
          });
          
          yPosition = (doc as any).lastAutoTable.finalY + 15;

          // Add detailed records by student
          doc.setFontSize(14);
          doc.text('Detalhamento por Aluno', 14, yPosition);
          yPosition += 10;

          // Group records by student
          const studentRecords = {};
          reportData.forEach((record: any) => {
            const student = record.student;
            if (!studentRecords[student.cpf]) {
              studentRecords[student.cpf] = {
                student,
                records: []
              };
            }
            studentRecords[student.cpf].records.push(record);
          });

          // Add student details
          Object.values(studentRecords).forEach((data: any) => {
            const student = data.student;
            const records = data.records;

            autoTable(doc, {
              startY: yPosition,
              head: [[`Aluno: ${student.full_name} - CPF: ${student.cpf} ${student.nis ? '(NIS)' : ''}`]],
              body: [
                [`Idade: ${student.age} anos`],
                [`Endereço: ${student.address}`],
                [`Contato: ${student.phone} / ${student.email || 'Não informado'}`]
              ],
              styles: { fontSize: 10 }
            });

            yPosition = (doc as any).lastAutoTable.finalY + 5;

            const recordsData = records.map(record => [
              new Date(record.date).toLocaleDateString('pt-BR'),
              record.identified_needs.join(', '),
              record.referrals.join(', '),
              record.notes
            ]);

            autoTable(doc, {
              startY: yPosition,
              head: [['Data', 'Necessidades', 'Encaminhamentos', 'Observações']],
              body: recordsData,
              styles: { fontSize: 9 }
            });

            yPosition = (doc as any).lastAutoTable.finalY + 10;
          });
          
          doc.setFontSize(12);
          doc.text(`Total de atendimentos: ${reportData.length}`, 14, yPosition);
          yPosition += 6;
          doc.text(`Total de necessidades identificadas: ${totalNeeds}`, 14, yPosition);
          yPosition += 6;
          doc.text(`Média de necessidades por atendimento: ${(totalNeeds / reportData.length).toFixed(1)}`, 14, yPosition);
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
          `ONG Amar Sem Limites | Relatório gerado em ${new Date().toLocaleString('pt-BR')} | Página ${i} de ${pageCount}`,
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
