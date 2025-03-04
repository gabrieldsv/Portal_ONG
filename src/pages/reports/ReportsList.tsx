import React, { useState, useEffect } from 'react';
import { FileText, Download, Filter, Calendar, Activity, Heart, Users, FileSpreadsheet, BarChart as ChartBar, Printer } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Tabs from '../../components/ui/Tabs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Bar, Pie } from 'react-chartjs-2';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

interface ReportFilters {
  startDate: string;
  endDate: string;
  reportType: 'attendance' | 'courses' | 'health' | 'social' | 'demographics' | 'students_status' | 'anamnesis';
  courseId: string;
  healthType?: 'dental' | 'psychological' | 'nutritional' | 'medical';
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string[];
    borderColor?: string[];
    borderWidth?: number;
  }[];
}

const ReportsList: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState('chart');
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reportType: 'attendance',
    courseId: '',
    healthType: 'dental'
  });

  const quickReports = [
    {
      id: 'attendance',
      title: 'Relatório de Frequência',
      description: 'Resumo do mês atual',
      icon: <FileText size={20} className="text-blue-500 mr-3" />,
      type: 'attendance'
    },
    {
      id: 'students_status',
      title: 'Alunos por Status',
      description: 'Ativos e Inativos com Responsáveis',
      icon: <FileText size={20} className="text-green-500 mr-3" />,
      type: 'students_status'
    },
    {
      id: 'anamnesis',
      title: 'Fichas de Anamnese',
      description: 'Histórico completo por aluno',
      icon: <FileText size={20} className="text-purple-500 mr-3" />,
      type: 'anamnesis'
    },
    {
      id: 'social',
      title: 'Atendimentos Sociais',
      description: 'Necessidades identificadas',
      icon: <FileText size={20} className="text-pink-500 mr-3" />,
      type: 'social'
    }
  ];

  // Rest of the code remains the same as the original file...

  const generateReport = async () => {
    setLoading(true);
    try {
      let reportData;
      let reportTitle = '';

      switch (filters.reportType) {
        case 'attendance': {
          reportTitle = 'Relatório de Frequência';
          // ... código existente ...
        }
        
        case 'students_status': {
          reportTitle = 'Relatório de Alunos por Status';
          
          // Buscar alunos com seus responsáveis
          const { data: studentsData, error: studentsError } = await supabase
            .from('students')
            .select(`
              *,
              guardians (
                full_name,
                is_primary
              )
            `)
            .order('full_name');
          
          if (studentsError) throw studentsError;
          
          // Formatar dados para o relatório
          const formattedData = studentsData?.map(student => {
            const primaryGuardian = student.guardians.find(g => g.is_primary);
            return {
              nome: student.full_name,
              cpf: student.cpf,
              idade: student.age,
              responsavel: primaryGuardian ? primaryGuardian.full_name : 'Não informado',
              status: 'Ativo' // Adicionar lógica de status quando implementado
            };
          });
          
          // Criar PDF
          doc.setFontSize(14);
          doc.text('Lista de Alunos', 14, yPosition);
          yPosition += 10;
          
          autoTable(doc, {
            startY: yPosition,
            head: [['Nome', 'CPF', 'Idade', 'Responsável', 'Status']],
            body: formattedData?.map(row => [
              row.nome,
              row.cpf,
              row.idade,
              row.responsavel,
              row.status
            ]) || [],
          });
          
          yPosition = (doc as any).lastAutoTable.finalY + 15;
          
          // Adicionar resumo
          doc.text(`Total de alunos: ${formattedData?.length || 0}`, 14, yPosition);
          break;
        }
        
        case 'anamnesis': {
          reportTitle = 'Relatório de Fichas de Anamnese';
          
          // Buscar registros de saúde do aluno
          const { data: healthData, error: healthError } = await supabase
            .from('health_records')
            .select(`
              *,
              student:students (
                full_name,
                cpf,
                age
              )
            `)
            .order('date', { ascending: false });
          
          if (healthError) throw healthError;
          
          // Agrupar por aluno
          const recordsByStudent = {};
          healthData?.forEach(record => {
            if (!recordsByStudent[record.student.full_name]) {
              recordsByStudent[record.student.full_name] = {
                student: record.student,
                records: []
              };
            }
            recordsByStudent[record.student.full_name].records.push(record);
          });
          
          // Criar PDF
          Object.values(recordsByStudent).forEach((data: any) => {
            doc.setFontSize(14);
            doc.text(`Aluno: ${data.student.full_name}`, 14, yPosition);
            yPosition += 8;
            
            doc.setFontSize(12);
            doc.text(`CPF: ${data.student.cpf}`, 14, yPosition);
            yPosition += 6;
            doc.text(`Idade: ${data.student.age} anos`, 14, yPosition);
            yPosition += 10;
            
            // Registros odontológicos
            const dentalRecords = data.records.filter(r => r.record_type === 'dental');
            if (dentalRecords.length > 0) {
              doc.setFontSize(13);
              doc.text('Histórico Odontológico', 14, yPosition);
              yPosition += 8;
              
              autoTable(doc, {
                startY: yPosition,
                head: [['Data', 'Profissional', 'Histórico', 'Tratamentos']],
                body: dentalRecords.map(r => [
                  new Date(r.date).toLocaleDateString('pt-BR'),
                  r.professional_name,
                  r.dental_history || '-',
                  r.previous_treatments || '-'
                ]),
              });
              
              yPosition = (doc as any).lastAutoTable.finalY + 10;
            }
            
            // Registros psicológicos
            const psychRecords = data.records.filter(r => r.record_type === 'psychological');
            if (psychRecords.length > 0) {
              doc.setFontSize(13);
              doc.text('Histórico Psicológico', 14, yPosition);
              yPosition += 8;
              
              autoTable(doc, {
                startY: yPosition,
                head: [['Data', 'Profissional', 'Avaliação', 'Diagnóstico']],
                body: psychRecords.map(r => [
                  new Date(r.date).toLocaleDateString('pt-BR'),
                  r.professional_name,
                  r.behavior_assessment || '-',
                  r.diagnosis || '-'
                ]),
              });
              
              yPosition = (doc as any).lastAutoTable.finalY + 10;
            }
            
            // Registros nutricionais
            const nutriRecords = data.records.filter(r => r.record_type === 'nutritional');
            if (nutriRecords.length > 0) {
              doc.setFontSize(13);
              doc.text('Histórico Nutricional', 14, yPosition);
              yPosition += 8;
              
              autoTable(doc, {
                startY: yPosition,
                head: [['Data', 'Profissional', 'Avaliação', 'IMC']],
                body: nutriRecords.map(r => [
                  new Date(r.date).toLocaleDateString('pt-BR'),
                  r.professional_name,
                  r.nutritional_assessment || '-',
                  r.bmi?.toString() || '-'
                ]),
              });
              
              yPosition = (doc as any).lastAutoTable.finalY + 10;
            }
            
            // Registros médicos
            const medicalRecords = data.records.filter(r => r.record_type === 'medical');
            if (medicalRecords.length > 0) {
              doc.setFontSize(13);
              doc.text('Histórico Médico', 14, yPosition);
              yPosition += 8;
              
              autoTable(doc, {
                startY: yPosition,
                head: [['Data', 'Profissional', 'Histórico Clínico', 'Alergias']],
                body: medicalRecords.map(r => [
                  new Date(r.date).toLocaleDateString('pt-BR'),
                  r.professional_name,
                  r.clinical_history || '-',
                  (r.allergies || []).join(', ') || '-'
                ]),
              });
              
              yPosition = (doc as any).lastAutoTable.finalY + 15;
            }
            
            // Adicionar nova página se necessário
            if (yPosition > doc.internal.pageSize.height - 50) {
              doc.addPage();
              yPosition = 20;
            }
          });
          break;
        }
      }

      // Rest of the code remains the same as the original file...
    }
  }

  // Rest of the code remains the same as the original file...
}

export default ReportsList;
