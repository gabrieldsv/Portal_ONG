import { BrowserRouter, Routes, Route } from 'react-router-dom';
import StudentList from './pages/students/StudentList';
import StudentDetail from './pages/students/StudentDetail';
import StudentForm from './pages/students/StudentForm';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/alunos" element={<StudentList />} />
        <Route path="/alunos/:id" element={<StudentDetail />} />
        <Route path="/alunos/:id/editar" element={<StudentForm />} />
        <Route path="/alunos/novo" element={<StudentForm />} />
        <Route path="/cursos" element={<CoursesPage />} /> {/* Está faltando? */}
        <Route path="/" element={<HomePage />} /> {/* Página inicial */}
        <Route path="*" element={<NotFoundPage />} /> {/* 404 no cliente */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;