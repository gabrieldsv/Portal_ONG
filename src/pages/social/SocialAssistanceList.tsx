import React, { useState, useEffect } from 'react';
import { Heart, Plus, Search, Filter } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import Table from '../../components/ui/Table';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';
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

  const handleNeedToggle = (need: string) => {
    if (selectedNeeds.includes(need)) {
      setSelectedNeeds(selectedNeeds.filter(n => n !== need));
    } else {
      setSelectedNeeds([...selectedNeeds, need]);
    }
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
          <Button variant="secondary" size="sm">Ver Detalhes</Button>
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
    </div>
  );
};

export default SocialAssistanceList;