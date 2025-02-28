import React, { useState, useEffect } from 'react';
import { Activity, Plus, Search, Filter } from 'lucide-react';
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
import { Student } from '../../types';

interface HealthRecord {
  id: string;
  student_id: string;
  student_name: string;
  record_type: 'dental' | 'psychological' | 'nutritional' | 'medical';
  date: string;
  professional_name: string;
}

const HealthRecordsList: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recordType, setRecordType] = useState('dental');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [professionalName, setProfessionalName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dental');
  const [students, setStudents] = useState<Student[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

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
          *,
          students (
            full_name
          )
        `)
        .eq('record_type', activeTab)
        .order('date', { ascending: false });

      if (error) throw error;
      
      const formattedRecords = data?.map(record => ({
        id: record.id,
        student_id: record.student_id,
        student_name: record.students.full_name,
        record_type: record.record_type,
        date: record.date,
        professional_name: record.professional_name
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
      accessor: (record: HealthRecord) => record.student_name,
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
          <Button variant="secondary" size="sm">Ver Detalhes</Button>
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
    </div>
  );
};

export default HealthRecordsList;