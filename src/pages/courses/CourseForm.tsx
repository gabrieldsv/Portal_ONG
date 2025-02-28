import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { supabase } from '../../lib/supabase';
import { Course } from '../../types';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import Card from '../../components/ui/Card';

interface CourseFormData {
  name: string;
  description: string;
  workload_hours: number;
  executive_manager: string;
  volunteer_manager: string;
  educational_advisor: string;
  shift: 'morning' | 'afternoon' | 'evening';
  available_spots: number;
}

const CourseForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const isEditing = !!id;

  const { control, handleSubmit, setValue, formState: { errors } } = useForm<CourseFormData>({
    defaultValues: {
      name: '',
      description: '',
      workload_hours: 0,
      executive_manager: '',
      volunteer_manager: '',
      educational_advisor: '',
      shift: 'morning',
      available_spots: 0,
    }
  });

  useEffect(() => {
    if (isEditing) {
      fetchCourse();
    }
  }, [id]);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setValue('name', data.name);
      setValue('description', data.description);
      setValue('workload_hours', data.workload_hours);
      setValue('executive_manager', data.executive_manager);
      setValue('volunteer_manager', data.volunteer_manager);
      setValue('educational_advisor', data.educational_advisor);
      setValue('shift', data.shift);
      setValue('available_spots', data.available_spots);
      
    } catch (error) {
      console.error('Error fetching course:', error);
      setSaveError('Erro ao carregar dados do curso');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CourseFormData) => {
    try {
      setLoading(true);
      setSaveError('');
      
      if (isEditing) {
        // Update course
        const { error } = await supabase
          .from('courses')
          .update(data)
          .eq('id', id);
          
        if (error) throw error;
      } else {
        // Create course
        const { error } = await supabase
          .from('courses')
          .insert(data);
          
        if (error) throw error;
      }
      
      // Navigate back to course list
      navigate('/cursos');
      
    } catch (error) {
      console.error('Error saving course:', error);
      setSaveError('Erro ao salvar dados do curso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft size={18} />}
            onClick={() => navigate('/cursos')}
          >
            Voltar
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Editar Curso' : 'Novo Curso'}
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
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              name="name"
              control={control}
              rules={{ required: 'Nome é obrigatório' }}
              render={({ field }) => (
                <Input
                  label="Nome do Curso"
                  {...field}
                  error={errors.name?.message}
                  required
                  fullWidth
                />
              )}
            />

            <Controller
              name="workload_hours"
              control={control}
              rules={{ required: 'Carga horária é obrigatória' }}
              render={({ field: { onChange, value, ...field } }) => (
                <Input
                  label="Carga Horária (horas)"
                  type="number"
                  {...field}
                  value={value.toString()}
                  onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                  error={errors.workload_hours?.message}
                  required
                  fullWidth
                />
              )}
            />

            <Controller
              name="shift"
              control={control}
              rules={{ required: 'Turno é obrigatório' }}
              render={({ field: { onChange, value, ...field } }) => (
                <Select
                  label="Turno"
                  options={[
                    { value: 'morning', label: 'Manhã' },
                    { value: 'afternoon', label: 'Tarde' },
                    { value: 'evening', label: 'Noite' },
                  ]}
                  {...field}
                  value={value}
                  onChange={onChange}
                  error={errors.shift?.message}
                  required
                  fullWidth
                />
              )}
            />

            <Controller
              name="available_spots"
              control={control}
              rules={{ required: 'Número de vagas é obrigatório' }}
              render={({ field: { onChange, value, ...field } }) => (
                <Input
                  label="Vagas Disponíveis"
                  type="number"
                  {...field}
                  value={value.toString()}
                  onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                  error={errors.available_spots?.message}
                  required
                  fullWidth
                />
              )}
            />

            <Controller
              name="executive_manager"
              control={control}
              rules={{ required: 'Gestor executivo é obrigatório' }}
              render={({ field }) => (
                <Input
                  label="Gestor Executivo"
                  {...field}
                  error={errors.executive_manager?.message}
                  required
                  fullWidth
                />
              )}
            />

            <Controller
              name="volunteer_manager"
              control={control}
              rules={{ required: 'Gestor voluntário é obrigatório' }}
              render={({ field }) => (
                <Input
                  label="Gestor Voluntário"
                  {...field}
                  error={errors.volunteer_manager?.message}
                  required
                  fullWidth
                />
              )}
            />

            <Controller
              name="educational_advisor"
              control={control}
              rules={{ required: 'Orientador educacional é obrigatório' }}
              render={({ field }) => (
                <Input
                  label="Orientador Educacional"
                  {...field}
                  error={errors.educational_advisor?.message}
                  required
                  fullWidth
                />
              )}
            />

            <div className="md:col-span-2">
              <Controller
                name="description"
                control={control}
                rules={{ required: 'Descrição é obrigatória' }}
                render={({ field }) => (
                  <Textarea
                    label="Descrição do Curso"
                    {...field}
                    error={errors.description?.message}
                    required
                    fullWidth
                    rows={5}
                  />
                )}
              />
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
};

export default CourseForm;