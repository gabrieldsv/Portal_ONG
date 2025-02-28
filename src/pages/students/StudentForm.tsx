import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { supabase } from '../../lib/supabase';
import { Student, Guardian } from '../../types';
import { formatCPF, formatPhone, unformatValue, calculateAge } from '../../utils/masks';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';

interface StudentFormData {
  full_name: string;
  birth_date: string;
  address: string;
  cpf: string;
  nis: string;
  phone: string;
  email: string;
  guardians: {
    full_name: string;
    cpf: string;
    phone: string;
    email: string;
    is_primary: boolean;
  }[];
}

const StudentForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const isEditing = !!id;

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<StudentFormData>({
    defaultValues: {
      full_name: '',
      birth_date: '',
      address: '',
      cpf: '',
      nis: '',
      phone: '',
      email: '',
      guardians: [
        {
          full_name: '',
          cpf: '',
          phone: '',
          email: '',
          is_primary: true,
        }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'guardians',
  });

  const birthDate = watch('birth_date');
  const [age, setAge] = useState<number | null>(null);

  useEffect(() => {
    if (birthDate) {
      setAge(calculateAge(birthDate));
    } else {
      setAge(null);
    }
  }, [birthDate]);

  useEffect(() => {
    if (isEditing) {
      fetchStudent();
    }
  }, [id]);

  const fetchStudent = async () => {
    try {
      setLoading(true);
      
      // Fetch student data
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single();

      if (studentError) throw studentError;
      
      // Fetch guardians data
      const { data: guardiansData, error: guardiansError } = await supabase
        .from('guardians')
        .select('*')
        .eq('student_id', id)
        .order('is_primary', { ascending: false });

      if (guardiansError) throw guardiansError;
      
      // Set form values
      setValue('full_name', studentData.full_name);
      setValue('birth_date', studentData.birth_date);
      setValue('address', studentData.address);
      setValue('cpf', studentData.cpf);
      setValue('nis', studentData.nis);
      setValue('phone', studentData.phone);
      setValue('email', studentData.email);
      
      // Set guardians
      if (guardiansData.length > 0) {
        setValue('guardians', guardiansData.map((guardian: Guardian) => ({
          full_name: guardian.full_name,
          cpf: guardian.cpf,
          phone: guardian.phone,
          email: guardian.email,
          is_primary: guardian.is_primary,
        })));
      }
      
    } catch (error) {
      console.error('Error fetching student:', error);
      setSaveError('Erro ao carregar dados do aluno');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: StudentFormData) => {
    try {
      setLoading(true);
      setSaveError('');
      
      const studentData = {
        full_name: data.full_name,
        birth_date: data.birth_date,
        age: calculateAge(data.birth_date),
        address: data.address,
        cpf: data.cpf,
        nis: data.nis,
        phone: data.phone,
        email: data.email,
      };
      
      let studentId = id;
      
      if (isEditing) {
        // Update student
        const { error } = await supabase
          .from('students')
          .update(studentData)
          .eq('id', id);
          
        if (error) throw error;
      } else {
        // Create student
        const { data: newStudent, error } = await supabase
          .from('students')
          .insert(studentData)
          .select()
          .single();
          
        if (error) throw error;
        studentId = newStudent.id;
      }
      
      // Handle guardians
      if (studentId) {
        // First, delete existing guardians if editing
        if (isEditing) {
          const { error } = await supabase
            .from('guardians')
            .delete()
            .eq('student_id', studentId);
            
          if (error) throw error;
        }
        
        // Then insert new guardians
        const guardiansData = data.guardians.map(guardian => ({
          student_id: studentId,
          full_name: guardian.full_name,
          cpf: guardian.cpf,
          phone: guardian.phone,
          email: guardian.email,
          is_primary: guardian.is_primary,
        }));
        
        const { error } = await supabase
          .from('guardians')
          .insert(guardiansData);
          
        if (error) throw error;
      }
      
      // Navigate back to student list
      navigate('/alunos');
      
    } catch (error) {
      console.error('Error saving student:', error);
      setSaveError('Erro ao salvar dados do aluno');
    } finally {
      setLoading(false);
    }
  };

  const addGuardian = () => {
    if (fields.length < 2) {
      append({
        full_name: '',
        cpf: '',
        phone: '',
        email: '',
        is_primary: false,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft size={18} />}
            onClick={() => navigate('/alunos')}
          >
            Voltar
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Editar Aluno' : 'Novo Aluno'}
          </h1>
        </div>
        <Button
          variant="primary"
          leftIcon={<Save size={18} />}
          onClick={handleSubmit(onSubmit)}
          isLoading={loading}
        >
          Salvar
        </Button>
      </div>

      {saveError && (
        <div className="bg-red-100 text-red-700 p-4 rounded-md">
          {saveError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-6">
          <Card title="Dados Pessoais">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="full_name"
                control={control}
                rules={{ required: 'Nome é obrigatório' }}
                render={({ field }) => (
                  <Input
                    label="Nome Completo"
                    {...field}
                    error={errors.full_name?.message}
                    required
                    fullWidth
                  />
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="birth_date"
                  control={control}
                  rules={{ required: 'Data de nascimento é obrigatória' }}
                  render={({ field }) => (
                    <Input
                      label="Data de Nascimento"
                      type="date"
                      {...field}
                      error={errors.birth_date?.message}
                      required
                      fullWidth
                    />
                  )}
                />

                <Input
                  label="Idade"
                  value={age !== null ? age.toString() : ''}
                  disabled
                  fullWidth
                />
              </div>

              <Controller
                name="cpf"
                control={control}
                rules={{ required: 'CPF é obrigatório' }}
                render={({ field: { onChange, value, ...field } }) => (
                  <Input
                    label="CPF"
                    {...field}
                    value={formatCPF(value)}
                    onChange={(e) => onChange(formatCPF(e.target.value))}
                    error={errors.cpf?.message}
                    required
                    fullWidth
                  />
                )}
              />

              <Controller
                name="nis"
                control={control}
                render={({ field }) => (
                  <Input
                    label="NIS"
                    {...field}
                    fullWidth
                  />
                )}
              />

              <Controller
                name="phone"
                control={control}
                rules={{ required: 'Telefone é obrigatório' }}
                render={({ field: { onChange, value, ...field } }) => (
                  <Input
                    label="Telefone"
                    {...field}
                    value={formatPhone(value)}
                    onChange={(e) => onChange(formatPhone(e.target.value))}
                    error={errors.phone?.message}
                    required
                    fullWidth
                  />
                )}
              />

              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <Input
                    label="Email"
                    type="email"
                    {...field}
                    error={errors.email?.message}
                    fullWidth
                  />
                )}
              />

              <Controller
                name="address"
                control={control}
                rules={{ required: 'Endereço é obrigatório' }}
                render={({ field }) => (
                  <Input
                    label="Endereço Completo"
                    {...field}
                    error={errors.address?.message}
                    required
                    fullWidth
                    className="md:col-span-2"
                  />
                )}
              />
            </div>
          </Card>

          <Card title="Responsáveis">
            {fields.map((field, index) => (
              <div key={field.id} className="mb-6 pb-6 border-b border-gray-200 last:border-0 last:mb-0 last:pb-0">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">
                    {index === 0 ? 'Responsável Principal' : 'Responsável Adicional'}
                  </h3>
                  {index > 0 && (
                    <Button
                      variant="danger"
                      size="sm"
                      leftIcon={<Trash2 size={16} />}
                      onClick={() => remove(index)}
                    >
                      Remover
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Controller
                    name={`guardians.${index}.full_name`}
                    control={control}
                    rules={{ required: 'Nome é obrigatório' }}
                    render={({ field }) => (
                      <Input
                        label="Nome Completo"
                        {...field}
                        error={errors.guardians?.[index]?.full_name?.message}
                        required
                        fullWidth
                      />
                    )}
                  />

                  <Controller
                    name={`guardians.${index}.cpf`}
                    control={control}
                    rules={{ required: 'CPF é obrigatório' }}
                    render={({ field: { onChange, value, ...field } }) => (
                      <Input
                        label="CPF"
                        {...field}
                        value={formatCPF(value)}
                        onChange={(e) => onChange(formatCPF(e.target.value))}
                        error={errors.guardians?.[index]?.cpf?.message}
                        required
                        fullWidth
                      />
                    )}
                  />

                  <Controller
                    name={`guardians.${index}.phone`}
                    control={control}
                    rules={{ required: 'Telefone é obrigatório' }}
                    render={({ field: { onChange, value, ...field } }) => (
                      <Input
                        label="Telefone"
                        {...field}
                        value={formatPhone(value)}
                        onChange={(e) => onChange(formatPhone(e.target.value))}
                        error={errors.guardians?.[index]?.phone?.message}
                        required
                        fullWidth
                      />
                    )}
                  />

                  <Controller
                    name={`guardians.${index}.email`}
                    control={control}
                    render={({ field }) => (
                      <Input
                        label="Email"
                        type="email"
                        {...field}
                        error={errors.guardians?.[index]?.email?.message}
                        fullWidth
                      />
                    )}
                  />
                </div>
              </div>
            ))}

            {fields.length < 2 && (
              <div className="mt-4">
                <Button
                  variant="secondary"
                  leftIcon={<Plus size={18} />}
                  onClick={addGuardian}
                >
                  Adicionar Responsável
                </Button>
              </div>
            )}
          </Card>
        </div>
      </form>
    </div>
  );
};

export default StudentForm;