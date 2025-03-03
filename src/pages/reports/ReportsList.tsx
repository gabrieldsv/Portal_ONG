import React, { useState, useEffect } from 'react';
import { Activity, Plus, Search, Filter, Download } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Tabs from '../../components/ui/Tabs';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import Table from '../../components/ui/Table';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Student, HealthRecord } from '../../types';

interface DetailedHealthRecord extends HealthRecord {
  student_name: string;
  student_cpf: string;
  student_age: number;
}

const HealthRecordsList: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recordType, setRecordType] = useState('dental');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [professionalName, setProfessionalName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [healthRecords, setHealthRecords] = useState<DetailedHealthRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('dental');
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DetailedHealthRecord | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);

  useEffect(() => {
    fetchStudents();
    fetchHealthRecords();
  }, [activeTab]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Erro ao carregar alunos');
    } finally {
      setLoading(false);
    }
  };

  const fetchHealthRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('health_records')
        .select(`
          id,
          student_id,
          record_type,
          date,
          professional_name,
          notes,
          dental_history,
          hygiene_habits,
          previous_treatments,
          emotional_history,
          behavior_assessment,
          diagnosis,
          referrals,
          observations,
          nutritional_assessment,
          eating_habits,
          bmi,
          suggested_meal_plan,
          clinical_history,
          allergies,
          medications,
          preexisting_conditions,
          students (
            full_name,
            cpf,
            age
          )
        `)
        .eq('record_type', activeTab)
        .order('date', { ascending: false });

      if (error) throw error;
      
      const formattedRecords = data?.map(record => ({
        id: record.id,
        student_id: record.student_id,
        student_name: record.students.full_name,
        student_cpf: record.students.cpf,
        student_age: record.students.age,
        record_type: record.record_type,
        date: record.date,
        professional_name: record.professional_name,
        notes: record.notes,
        dental_history: record.dental_history,
        hygiene_habits: record.hygiene_habits,
        previous_treatments: record.previous_treatments,
        emotional_history: record.emotional_history,
        behavior_assessment: record.behavior_assessment,
        diagnosis: record.diagnosis,
        referrals: record.referrals,
        observations: record.observations,
        nutritional_assessment: record.nutritional_assessment,
        eating_habits: record.eating_habits,
        bmi: record.bmi,
        suggested_meal_plan: record.suggested_meal_plan,
        clinical_history: record.clinical_history,
        allergies: record.allergies,
        medications: record.medications,
        preexisting_conditions: record.preexisting_conditions
      })) || [];
      
      setHealthRecords(formattedRecords);
    } catch (error) {
      console.error('Error fetching health records:', error);
      toast.error('Erro ao carregar fichas de saúde');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRecord = async () => {
    if (!selectedStudent) {
      toast.error('Por favor, selecione um aluno');
      return;
    }

    if (!professionalName) {
      toast.error('Por favor, informe o nome do profissional');
      return;
    }

    setLoading(true);
    try {
      const newRecord = {
        student_id: selectedStudent,
        record_type: recordType,
        date: new Date().toISOString().split('T')[0],
        professional_name: professionalName,
        notes: notes
      };
      
      // Add specific fields based on record type
      if (recordType === 'dental') {
        Object.assign(newRecord, {
          dental_history: '',
          hygiene_habits: '',
          previous_treatments: ''
        });
      } else if (recordType === 'psychological') {
        Object.assign(newRecord, {
          emotional_history: '',
          behavior_assessment: '',
          diagnosis: '',
          referrals: '',
          observations: ''
        });
      } else if (recordType === 'nutritional') {
        Object.assign(newRecord, {
          nutritional_assessment: '',
          eating_habits: '',
          bmi: null,
          suggested_meal_plan: ''
        });
      } else if (recordType === 'medical') {
        Object.assign(newRecord, {
          clinical_history: '',
          allergies: [],
          medications: [],
          preexisting_conditions: []
        });
      }
      
      const { error } = await supabase
        .from('health_records')
        .insert(newRecord);
        
      if (error) throw error;
      
      toast.success('Ficha de saúde registrada com sucesso!');
      setIsModalOpen(false);
      
      // Reset form
      setSelectedStudent('');
      setProfessionalName('');
      setNotes('');
      
      // Refresh data
      fetchHealthRecords();
    } catch (error) {
      console.error('Error creating health record:', error);
      toast.error('Erro ao registrar ficha de saúde');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.text(`Relatório de Saúde - ${
        activeTab === 'dental' ? 'Odontológico' :
        activeTab === 'psychological' ? 'Psicológico' :
        activeTab === 'nutritional' ? 'Nutricional' : 'Médico'
      }`, 14, 20);

      doc.setFontSize(14);
      doc.text('ONG Amar Sem Limites', 14, 30);

      doc.setFontSize(12);
      doc.text(`Data de geração: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 40);

      let yPosition = 60;

      // Add summary
      doc.setFontSize(14);
      doc.text('Resumo dos Atendimentos', 14, yPosition);
      yPosition += 10;

      const summaryData = [
        ['Total de Atendimentos', filteredRecords.length.toString()],
        ['Profissionais Diferentes', new Set(filteredRecords.map(r => r.professional_name)).size.toString()],
        ['Alunos Atendidos', new Set(filteredRecords.map(r => r.student_id)).size.toString()]
      ];

      autoTable(doc, {
        startY: yPosition,
        body: summaryData
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;

      // Add detailed records
      doc.setFontSize(14);
      doc.text('Detalhamento dos Atendimentos', 14, yPosition);
      yPosition += 10;

      filteredRecords.forEach((record, index) => {
        // Add student info
        autoTable(doc, {
          startY: yPosition,
          head: [[`Atendimento ${index + 1}`]],
          body: [
            [`Aluno: ${record.student_name}`],
            [`CPF: ${record.student_cpf}`],
            [`Idade: ${record.student_age} anos`],
            [`Data: ${new Date(record.date).toLocaleDateString('pt-BR')}`],
            [`Profissional: ${record.professional_name}`]
          ]
        });

        yPosition = (doc as any).lastAutoTable.finalY + 5;

        // Add record details based on type
        let detailsData = [];

        if (record.record_type === 'dental') {
          detailsData = [
            ['Histórico Odontológico', record.dental_history || '-'],
            ['Hábitos de Higiene', record.hygiene_habits || '-'],
            ['Tratamentos Anteriores', record.previous_treatments || '-']
          ];
        } else if (record.record_type === 'psychological') {
          detailsData = [
            ['Histórico Emocional', record.emotional_history || '-'],
            ['Avaliação Comportamental', record.behavior_assessment || '-'],
            ['Diagnóstico', record.diagnosis || '-'],
            ['Encaminhamentos', record.referrals || '-']
          ];
        } else if (record.record_type === 'nutritional') {
          detailsData = [
            ['Avaliação Nutricional', record.nutritional_assessment || '-'],
            ['Hábitos Alimentares', record.eating_habits || '-'],
            ['IMC', record.bmi?.toString() || '-'],
            ['Plano Alimentar', record.suggested_meal_plan || '-']
          ];
        } else if (record.record_type === 'medical') {
          detailsData = [
            ['Histórico Clínico', record.clinical_history || '-'],
            ['Alergias', record.allergies?.join(', ') || '-'],
            ['Medicamentos', record.medications?.join(', ') || '-'],
            ['Condições Preexistentes', record.preexisting_conditions?.join(', ') || '-']
          ];
        }

        detailsData.push(['Observações', record.notes || '-']);

        autoTable(doc, {
          startY: yPosition,
          body: detailsData
        });

        yPosition = (doc as any).lastAutoTable.finalY + 10;
      });

      // Add footer
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

      doc.save(`relatorio_saude_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Relatório exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Erro ao exportar relatório');
    }
  };

  const handleViewDetails = (record: HealthRecord) => {
    setSelectedRecord(record);
    setEditMode(false);
    setDetailsModalOpen(true);
  };

  const handleUpdateRecord = async () => {
    if (!selectedRecord) return;

    try {
      setSavingRecord(true);

      const { error } = await supabase
        .from('health_records')
        .update({
          professional_name: selectedRecord.professional_name,
          notes: selectedRecord.notes,
          dental_history: selectedRecord.dental_history,
          hygiene_habits: selectedRecord.hygiene_habits,
          previous_treatments: selectedRecord.previous_treatments,
          emotional_history: selectedRecord.emotional_history,
          behavior_assessment: selectedRecord.behavior_assessment,
          diagnosis: selectedRecord.diagnosis,
          referrals: selectedRecord.referrals,
          observations: selectedRecord.observations,
          nutritional_assessment: selectedRecord.nutritional_assessment,
          eating_habits: selectedRecord.eating_habits,
          bmi: selectedRecord.bmi,
          suggested_meal_plan: selectedRecord.suggested_meal_plan,
          clinical_history: selectedRecord.clinical_history,
          allergies: selectedRecord.allergies,
          medications: selectedRecord.medications,
          preexisting_conditions: selectedRecord.preexisting_conditions
        })
        .eq('id', selectedRecord.id);

      if (error) throw error;

      toast.success('Registro atualizado com sucesso!');
      setDetailsModalOpen(false);
      fetchHealthRecords();
    } catch (error) {
      console.error('Error updating record:', error);
      toast.error('Erro ao atualizar registro');
    } finally {
      setSavingRecord(false);
      setEditMode(false);
    }
  };

  const handleDeleteRecord = async () => {
    if (!selectedRecord) return;

    try {
      setSavingRecord(true);

      const { error } = await supabase
        .from('health_records')
        .delete()
        .eq('id', selectedRecord.id);

      if (error) throw error;

      toast.success('Registro excluído com sucesso!');
      setDeleteModalOpen(false);
      setDetailsModalOpen(false);
      fetchHealthRecords();
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Erro ao excluir registro');
    } finally {
      setSavingRecord(false);
    }
  };

  const openModalWithType = (type: string) => {
    setRecordType(type);
    setIsModalOpen(true);
  };

  const filteredRecords = healthRecords.filter(record => {
    if (searchTerm) {
      return record.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             record.professional_name.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  const columns = [
    {
      header: 'Aluno',
      accessor: (record: DetailedHealthRecord) => (
        <div>
          <p className="font-medium">{record.student_name}</p>
          <p className="text-xs text-gray-500">{record.student_cpf}</p>
        </div>
      ),
    },
    {
      header: 'Profissional',
      accessor: (record: HealthRecord) => record.professional_name,
    },
    {
      header: 'Data',
      accessor: (record: HealthRecord) => new Date(record.date).toLocaleDateString('pt-BR'),
    },
    {
      header: 'Ações',
      accessor: (record: HealthRecord) => (
        <div className="flex space-x-2">
          <Button
            variant="secondary" 
            size="sm"
            onClick={() => handleViewDetails(record)}
          >
            Ver Detalhes
          </Button>
        </div>
      ),
    },
  ];

  const renderTabContent = (tabId: string) => {
    return (
      <div>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Buscar por aluno ou profissional..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search size={18} />}
              fullWidth
            />
          </div>
          <Button
            variant="secondary"
            leftIcon={<Filter size={18} />}
          >
            Filtros
          </Button>
          <Button
            variant="primary"
            leftIcon={<Download size={18} />}
            onClick={handleExportPDF}
          >
            Exportar
          </Button>
        </div>

        {filteredRecords.length > 0 ? (
          <Table
            columns={columns}
            data={filteredRecords}
            keyExtractor={(record) => record.id}
            isLoading={loading}
            emptyMessage="Nenhuma ficha encontrada"
          />
        ) : (
          <div className="bg-gray-50 p-8 rounded-lg text-center">
            <Activity size={48} className={`mx-auto ${
              tabId === 'dental' ? 'text-blue-400' :
              tabId === 'psychological' ? 'text-purple-400' :
              tabId === 'nutritional' ? 'text-green-400' :
              'text-red-400'
            } mb-4`} />
            <p className="text-gray-500">Fichas {
              tabId === 'dental' ? 'odontológicas' :
              tabId === 'psychological' ? 'psicológicas' :
              tabId === 'nutritional' ? 'nutricionais' :
              'médicas'
            } serão exibidas aqui</p>
            <Button 
              variant="primary" 
              className="mt-4"
              onClick={() => openModalWithType(tabId)}
            >
              Criar Nova Ficha
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Saúde</h1>
        <Button 
          variant="primary" 
          leftIcon={<Activity size={18} />}
          onClick={() => setIsModalOpen(true)}
        >
          Nova Ficha
        </Button>
      </div>

      <Card>
        <Tabs
          tabs={[
            {
              id: 'dental',
              label: 'Odontológico',
              content: renderTabContent('dental'),
            },
            {
              id: 'psychological',
              label: 'Psicológico',
              content: renderTabContent('psychological'),
            },
            {
              id: 'nutritional',
              label: 'Nutricional',
              content: renderTabContent('nutritional'),
            },
            {
              id: 'medical',
              label: 'Médico',
              content: renderTabContent('medical'),
            },
          ]}
          onChange={setActiveTab}
          defaultTabId={activeTab}
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Nova Ficha ${
          recordType === 'dental' ? 'Odontológica' :
          recordType === 'psychological' ? 'Psicológica' :
          recordType === 'nutritional' ? 'Nutricional' : 'Médica'
        }`}
        footer={
          <div className="flex justify-end space-x-2">
            <Button
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateRecord}
              isLoading={loading}
            >
              Registrar Ficha
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Aluno"
            options={students.map(student => ({
              value: student.id,
              label: `${student.full_name} (${student.cpf})`
            }))}
            value={selectedStudent}
            onChange={setSelectedStudent}
            required
            fullWidth
          />
          
          <Input
            label="Nome do Profissional"
            value={professionalName}
            onChange={(e) => setProfessionalName(e.target.value)}
            required
            fullWidth
          />
          
          <Input
            label="Data"
            type="date"
            defaultValue={new Date().toISOString().split('T')[0]}
            fullWidth
          />
          
          {recordType === 'dental' && (
            <>
              <Textarea
                label="Histórico Odontológico"
                rows={3}
                fullWidth
              />
              <Textarea
                label="Hábitos de Higiene Bucal"
                rows={3}
                fullWidth
              />
              <Textarea
                label="Tratamentos Anteriores"
                rows={3}
                fullWidth
              />
            </>
          )}
          
          {recordType === 'psychological' && (
            <>
              <Textarea
                label="Histórico Emocional"
                rows={3}
                fullWidth
              />
              <Textarea
                label="Avaliação de Comportamento"
                rows={3}
                fullWidth
              />
              <Textarea
                label="Diagnóstico"
                rows={3}
                fullWidth
              />
              <Textarea
                label="Encaminhamentos"
                rows={3}
                fullWidth
              />
            </>
          )}
          
          {recordType === 'nutritional' && (
            <>
              <Textarea
                label="Avaliação Nutricional"
                rows={3}
                fullWidth
              />
              <Textarea
                label="Hábitos Alimentares"
                rows={3}
                fullWidth
              />
              <Input
                label="IMC"
                type="number"
                step="0.01"
                fullWidth
              />
              <Textarea
                label="Plano Alimentar Sugerido"
                rows={3}
                fullWidth
              />
            </>
          )}
          
          {recordType === 'medical' && (
            <>
              <Textarea
                label="Histórico Clínico"
                rows={3}
                fullWidth
              />
              <Textarea
                label="Alergias"
                rows={2}
                fullWidth
              />
              <Textarea
                label="Medicamentos"
                rows={2}
                fullWidth
              />
              <Textarea
                label="Condições Preexistentes"
                rows={2}
                fullWidth
              />
            </>
          )}
          
          <Textarea
            label="Observações"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            fullWidth
          />
        </div>
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title={editMode ? "Editar Registro" : "Detalhes do Registro"}
        footer={
          <div className="flex justify-between">
            <div>
              {!editMode && (
                <Button
                  variant="danger"
                  onClick={() => setDeleteModalOpen(true)}
                >
                  Excluir
                </Button>
              )}
            </div>
            <div className="flex space-x-2">
              {editMode ? (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setEditMode(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleUpdateRecord}
                    isLoading={savingRecord}
                  >
                    Salvar
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setDetailsModalOpen(false)}
                  >
                    Fechar
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setEditMode(true)}
                  >
                    Editar
                  </Button>
                </>
              )}
            </div>
          </div>
        }
      >
        {selectedRecord && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Aluno</p>
              <p className="text-lg font-medium">{selectedRecord.student_name}</p>
              <p className="text-sm text-gray-500">CPF: {selectedRecord.student_cpf}</p>
              <p className="text-sm text-gray-500">Idade: {selectedRecord.student_age} anos</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Data do Atendimento</p>
              <p>{new Date(selectedRecord.date).toLocaleDateString('pt-BR')}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Profissional</p>
              {editMode ? (
                <Input
                  value={selectedRecord.professional_name}
                  onChange={(e) => setSelectedRecord({
                    ...selectedRecord,
                    professional_name: e.target.value
                  })}
                  fullWidth
                />
              ) : (
                <p>{selectedRecord.professional_name}</p>
              )}
            </div>
            
            {selectedRecord.record_type === 'dental' && (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-500">Histórico Odontológico</p>
                  {editMode ? (
                    <Textarea
                      value={selectedRecord.dental_history || ''}
                      onChange={(e) => setSelectedRecord({
                        ...selectedRecord,
                        dental_history: e.target.value
                      })}
                      rows={3}
                      fullWidth
                    />
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap">{selectedRecord.dental_history}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Hábitos de Higiene</p>
                  {editMode ? (
                    <Textarea
                      value={selectedRecord.hygiene_habits || ''}
                      onChange={(e) => setSelectedRecord({
                        ...selectedRecord,
                        hygiene_habits: e.target.value
                      })}
                      rows={3}
                      fullWidth
                    />
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap">{selectedRecord.hygiene_habits}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Tratamentos Anteriores</p>
                  {editMode ? (
                    <Textarea
                      value={selectedRecord.previous_treatments || ''}
                      onChange={(e) => setSelectedRecord({
                        ...selectedRecord,
                        previous_treatments: e.target.value
                      })}
                      rows={3}
                      fullWidth
                    />
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap">{selectedRecord.previous_treatments}</p>
                  )}
                </div>
              </>
            )}
            
            {selectedRecord.record_type === 'psychological' && (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-500">Histórico Emocional</p>
                  {editMode ? (
                    <Textarea
                      value={selectedRecord.emotional_history || ''}
                      onChange={(e) => setSelectedRecord({
                        ...selectedRecord,
                        emotional_history: e.target.value
                      })}
                      rows={3}
                      fullWidth
                    />
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap">{selectedRecord.emotional_history}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Avaliação Comportamental</p>
                  {editMode ? (
                    <Textarea
                      value={selectedRecord.behavior_assessment || ''}
                      onChange={(e) => setSelectedRecord({
                        ...selectedRecord,
                        behavior_assessment: e.target.value
                      })}
                      rows={3}
                      fullWidth
                    />
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap">{selectedRecord.behavior_assessment}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Diagnóstico</p>
                  {editMode ? (
                    <Textarea
                      value={selectedRecord.diagnosis || ''}
                      onChange={(e) => setSelectedRecord({
                        ...selectedRecord,
                        diagnosis: e.target.value
                      })}
                      rows={3}
                      fullWidth
                    />
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap">{selectedRecord.diagnosis}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Encaminhamentos</p>
                  {editMode ? (
                    <Textarea
                      value={selectedRecord.referrals || ''}
                      onChange={(e) => setSelectedRecord({
                        ...selectedRecord,
                        referrals: e.target.value
                      })}
                      rows={3}
                      fullWidth
                    />
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap">{selectedRecord.referrals}</p>
                  )}
                </div>
              </>
            )}
            
            {selectedRecord.record_type === 'nutritional' && (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-500">Avaliação Nutricional</p>
                  {editMode ? (
                    <Textarea
                      value={selectedRecord.nutritional_assessment || ''}
                      onChange={(e) => setSelectedRecord({
                        ...selectedRecord,
                        nutritional_assessment: e.target.value
                      })}
                      rows={3}
                      fullWidth
                    />
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap">{selectedRecord.nutritional_assessment}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Hábitos Alimentares</p>
                  {editMode ? (
                    <Textarea
                      value={selectedRecord.eating_habits || ''}
                      onChange={(e) => setSelectedRecord({
                        ...selectedRecord,
                        eating_habits: e.target.value
                      })}
                      rows={3}
                      fullWidth
                    />
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap">{selectedRecord.eating_habits}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">IMC</p>
                  {editMode ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={selectedRecord.bmi || ''}
                      onChange={(e) => setSelectedRecord({
                        ...selectedRecord,
                        bmi: parseFloat(e.target.value)
                      })}
                      fullWidth
                    />
                  ) : (
                    <p className="mt-1">{selectedRecord.bmi}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Plano Alimentar Sugerido</p>
                  {editMode ? (
                    <Textarea
                      value={selectedRecord.suggested_meal_plan || ''}
                      onChange={(e) => setSelectedRecord({
                        ...selectedRecord,
                        suggested_meal_plan: e.target.value
                      })}
                      rows={3}
                      fullWidth
                    />
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap">{selectedRecord.suggested_meal_plan}</p>
                  )}
                </div>
              </>
            )}
            
            {selectedRecord.record_type === 'medical' && (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-500">Histórico Clínico</p>
                  {editMode ? (
                    <Textarea
                      value={selectedRecord.clinical_history || ''}
                      onChange={(e) => setSelectedRecord({
                        ...selectedRecord,
                        clinical_history: e.target.value
                      })}
                      rows={3}
                      fullWidth
                    />
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap">{selectedRecord.clinical_history}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Alergias</p>
                  {editMode ? (
                    <Textarea
                      value={selectedRecord.allergies?.join('\n') || ''}
                      onChange={(e) => setSelectedRecord({
                        ...selectedRecord,
                        allergies: e.target.value.split('\n').filter(Boolean)
                      })}
                      placeholder="Digite uma alergia por linha"
                      rows={3}
                      fullWidth
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedRecord.allergies?.map((allergy, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
                        >
                          {allergy}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Medicamentos</p>
                  {editMode ? (
                    <Textarea
                      value={selectedRecord.medications?.join('\n') || ''}
                      onChange={(e) => setSelectedRecord({
                        ...selectedRecord,
                        medications: e.target.value.split('\n').filter(Boolean)
                      })}
                      placeholder="Digite um medicamento por linha"
                      rows={3}
                      fullWidth
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedRecord.medications?.map((medication, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {medication}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Condições Preexistentes</p>
                  {editMode ? (
                    <Textarea
                      value={selectedRecord.preexisting_conditions?.join('\n') || ''}
                      onChange={(e) => setSelectedRecord({
                        ...selectedRecord,
                        preexisting_conditions: e.target.value.split('\n').filter(Boolean)
                      })}
                      placeholder="Digite uma condição por linha"
                      rows={3}
                      fullWidth
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedRecord.preexisting_conditions?.map((condition, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                        >
                          {condition}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
            
            <div>
              <p className="text-sm font-medium text-gray-500">Observações</p>
              {editMode ? (
                <Textarea
                  value={selectedRecord.notes || ''}
                  onChange={(e) => setSelectedRecord({
                    ...selectedRecord,
                    notes: e.target.value
                  })}
                  rows={4}
                  fullWidth
                />
              ) : (
                <p className="mt-1 whitespace-pre-wrap">{selectedRecord.notes}</p>
              )}
            </div>
          </div>
        )}
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
              onClick={handleDeleteRecord}
              isLoading={savingRecord}
            >
              Excluir
            </Button>
          </div>
        }
      >
        <p>Tem certeza que deseja excluir este registro de saúde do aluno <strong>{selectedRecord?.student_name}</strong>?</p>
        <p className="mt-2 text-sm text-gray-500">
          Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </div>
  );
};

export default HealthRecordsList;
