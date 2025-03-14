import React, { useState, useEffect } from 'react';
import { Heart, Plus, Search, Filter, Download, FileText, Edit, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import Table from '../../components/ui/Table';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Student } from '../../types';

interface SocialAssistanceRecord {
  id: string;
  student_id: string;
  student_name: string;
  date: string;
  identified_needs: string[];
  notes: string;
}

const SocialAssistanceList: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [students, setStudents] = useState<Student[]>([]);
  const [assistanceRecords, setAssistanceRecords] = useState<SocialAssistanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SocialAssistanceRecord | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchStudents();
    fetchAssistanceRecords();
  }, []);

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

  const fetchAssistanceRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('social_assistance_records')
        .select(`
          *,
          students (
            full_name
          )
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      
      const formattedRecords = data?.map(record => ({
        id: record.id,
        student_id: record.student_id,
        student_name: record.students.full_name,
        date: record.date,
        identified_needs: record.identified_needs,
        notes: record.notes
      })) || [];
      
      setAssistanceRecords(formattedRecords);
    } catch (error) {
      console.error('Error fetching assistance records:', error);
      toast.error('Erro ao carregar registros de assistência social');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssistance = async () => {
    if (!selectedStudent) {
      toast.error('Por favor, selecione um aluno');
      return;
    }

    if (selectedNeeds.length === 0) {
      toast.error('Por favor, selecione pelo menos uma necessidade identificada');
      return;
    }

    setLoading(true);
    try {
      const newRecord = {
        student_id: selectedStudent,
        date: new Date().toISOString().split('T')[0],
        identified_needs: selectedNeeds,
        referrals: [],
        notes: notes
      };
      
      const { error } = await supabase
        .from('social_assistance_records')
        .insert(newRecord);
        
      if (error) throw error;
      
      toast.success('Atendimento registrado com sucesso!');
      setIsModalOpen(false);
      
      // Reset form
      setSelectedStudent('');
      setSelectedNeeds([]);
      setNotes('');
      
      // Refresh data
      fetchAssistanceRecords();
    } catch (error) {
      console.error('Error creating assistance record:', error);
      toast.error('Erro ao registrar atendimento');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRecord = async () => {
    if (!selectedRecord) return;

    if (selectedNeeds.length === 0) {
      toast.error('Por favor, selecione pelo menos uma necessidade identificada');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('social_assistance_records')
        .update({
          identified_needs: selectedNeeds,
          notes: notes
        })
        .eq('id', selectedRecord.id);

      if (error) throw error;

      toast.success('Atendimento atualizado com sucesso!');
      setDetailsModalOpen(false);
      setEditMode(false);
      fetchAssistanceRecords();
    } catch (error) {
      console.error('Error updating record:', error);
      toast.error('Erro ao atualizar atendimento');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async () => {
    if (!selectedRecord) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('social_assistance_records')
        .delete()
        .eq('id', selectedRecord.id);

      if (error) throw error;

      toast.success('Atendimento excluído com sucesso!');
      setDeleteModalOpen(false);
      setDetailsModalOpen(false);
      fetchAssistanceRecords();
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Erro ao excluir atendimento');
    } finally {
      setLoading(false);
    }
  };

  const handleNeedToggle = (need: string) => {
    if (selectedNeeds.includes(need)) {
      setSelectedNeeds(selectedNeeds.filter(n => n !== need));
    } else {
      setSelectedNeeds([...selectedNeeds, need]);
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text('Relatório de Atendimentos Sociais', 14, 20);
      
      doc.setFontSize(12);
      doc.text(`Data de geração: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
      
      // Add table
      const tableData = filteredRecords.map(record => [
        record.student_name,
        new Date(record.date).toLocaleDateString('pt-BR'),
        record.identified_needs.join(', '),
        record.notes
      ]);
      
      autoTable(doc, {
        startY: 40,
        head: [['Aluno', 'Data', 'Necessidades', 'Observações']],
        body: tableData,
      });
      
      // Save the PDF
      doc.save('atendimentos-sociais.pdf');
      
      toast.success('Relatório exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Erro ao exportar relatório');
    }
  };

  const handleViewDetails = (record: SocialAssistanceRecord) => {
    setSelectedRecord(record);
    setSelectedNeeds(record.identified_needs);
    setNotes(record.notes);
    setEditMode(false);
    setDetailsModalOpen(true);
  };

  const filteredRecords = assistanceRecords.filter(record => {
    if (searchTerm) {
      return record.student_name.toLowerCase().includes(searchTerm.toLowerCase());
    }
    
    if (filter !== 'all') {
      return record.identified_needs.includes(filter);
    }
    
    return true;
  });

  const columns = [
    {
      header: 'Aluno',
      accessor: (record: SocialAssistanceRecord) => record.student_name,
    },
    {
      header: 'Data',
      accessor: (record: SocialAssistanceRecord) => new Date(record.date).toLocaleDateString('pt-BR'),
    },
    {
      header: 'Necessidades',
      accessor: (record: SocialAssistanceRecord) => (
        <div className="flex flex-wrap gap-1">
          {record.identified_needs.map((need, index) => (
            <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
              {need}
            </span>
          ))}
        </div>
      ),
    },
    {
      header: 'Ações',
      accessor: (record: SocialAssistanceRecord) => (
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Assistência Social</h1>
        <Button 
          variant="primary" 
          leftIcon={<Heart size={18} />}
          onClick={() => setIsModalOpen(true)}
        >
          Novo Atendimento
        </Button>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Buscar por aluno..."
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
              variant={filter === 'Moradia' ? 'primary' : 'secondary'}
              onClick={() => setFilter('Moradia')}
            >
              Moradia
            </Button>
            <Button 
              variant={filter === 'Alimentação' ? 'primary' : 'secondary'}
              onClick={() => setFilter('Alimentação')}
            >
              Alimentação
            </Button>
            <Button 
              variant={filter === 'Renda' ? 'primary' : 'secondary'}
              onClick={() => setFilter('Renda')}
            >
              Renda
            </Button>
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
        </div>

        {filteredRecords.length > 0 ? (
          <Table
            columns={columns}
            data={filteredRecords}
            keyExtractor={(record) => record.id}
            isLoading={loading}
            emptyMessage="Nenhum registro de atendimento encontrado"
          />
        ) : (
          <div className="bg-gray-50 p-8 rounded-lg text-center">
            <Heart size={48} className="mx-auto text-pink-400 mb-4" />
            <p className="text-gray-500">Registros de atendimento social serão exibidos aqui</p>
            <Button 
              variant="primary" 
              className="mt-4"
              onClick={() => setIsModalOpen(true)}
            >
              Criar Novo Atendimento
            </Button>
          </div>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Atendimento Social"
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
              onClick={handleCreateAssistance}
              isLoading={loading}
            >
              Registrar Atendimento
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
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Necessidades Identificadas <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {['Moradia', 'Alimentação', 'Renda', 'Transporte', 'Saúde', 'Educação', 'Documentação', 'Jurídico'].map((need) => (
                <div key={need} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`need-${need}`}
                    checked={selectedNeeds.includes(need)}
                    onChange={() => handleNeedToggle(need)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`need-${need}`} className="ml-2 block text-sm text-gray-900">
                    {need}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <Textarea
            label="Observações"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            fullWidth
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Encaminhamentos
            </label>
            <div className="space-y-2">
              {['CRAS', 'CREAS', 'Bolsa Família', 'BPC', 'Defensoria Pública', 'Posto de Saúde'].map((referral) => (
                <div key={referral} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`referral-${referral}`}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`referral-${referral}`} className="ml-2 block text-sm text-gray-900">
                    {referral}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title={editMode ? "Editar Atendimento" : "Detalhes do Atendimento"}
        footer={
          <div className="flex justify-between">
            <div>
              {!editMode && (
                <Button
                  variant="danger"
                  leftIcon={<Trash2 size={18} />}
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
                    onClick={() => {
                      setEditMode(false);
                      setSelectedNeeds(selectedRecord?.identified_needs || []);
                      setNotes(selectedRecord?.notes || '');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleEditRecord}
                    isLoading={loading}
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
                    leftIcon={<Edit size={18} />}
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
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Data do Atendimento</p>
              <p>{new Date(selectedRecord.date).toLocaleDateString('pt-BR')}</p>
            </div>
            
            {editMode ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Necessidades Identificadas <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {['Moradia', 'Alimentação', 'Renda', 'Transporte', 'Saúde', 'Educação', 'Documentação', 'Jurídico'].map((need) => (
                      <div key={need} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`need-${need}`}
                          checked={selectedNeeds.includes(need)}
                          onChange={() => handleNeedToggle(need)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`need-${need}`} className="ml-2 block text-sm text-gray-900">
                          {need}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <Textarea
                  label="Observações"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  fullWidth
                />
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-500">Necessidades Identificadas</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedRecord.identified_needs.map((need, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800"
                      >
                        {need}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">Observações</p>
                  <p className="mt-1 whitespace-pre-wrap">{selectedRecord.notes}</p>
                </div>
              </>
            )}
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
              isLoading={loading}
            >
              Excluir
            </Button>
          </div>
        }
      >
        <p>Tem certeza que deseja excluir este atendimento do aluno <strong>{selectedRecord?.student_name}</strong>?</p>
        <p className="mt-2 text-sm text-gray-500">
          Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </div>
  );
};

export default SocialAssistanceList;
