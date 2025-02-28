import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/layout/Layout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';

// Students
import StudentList from './pages/students/StudentList';
import StudentForm from './pages/students/StudentForm';
import StudentDetail from './pages/students/StudentDetail';

// Courses
import CourseList from './pages/courses/CourseList';
import CourseForm from './pages/courses/CourseForm';
import CourseDetail from './pages/courses/CourseDetail';

// Attendance
import AttendanceList from './pages/attendance/AttendanceList';

// Social Assistance
import SocialAssistanceList from './pages/social/SocialAssistanceList';

// Health
import HealthRecordsList from './pages/health/HealthRecordsList';

// Reports
import ReportsList from './pages/reports/ReportsList';

// Profile and Settings
import ProfilePage from './pages/profile/ProfilePage';
import SettingsPage from './pages/settings/SettingsPage';

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            
            {/* Students routes */}
            <Route path="alunos" element={<StudentList />} />
            <Route path="alunos/novo" element={<StudentForm />} />
            <Route path="alunos/:id" element={<StudentDetail />} />
            <Route path="alunos/:id/editar" element={<StudentForm />} />
            
            {/* Courses routes */}
            <Route path="cursos" element={<CourseList />} />
            <Route path="cursos/novo" element={<CourseForm />} />
            <Route path="cursos/:id" element={<CourseDetail />} />
            <Route path="cursos/:id/editar" element={<CourseForm />} />
            
            {/* Attendance routes */}
            <Route path="frequencia" element={<AttendanceList />} />
            
            {/* Social Assistance routes */}
            <Route path="assistencia-social" element={<SocialAssistanceList />} />
            
            {/* Health routes */}
            <Route path="saude" element={<HealthRecordsList />} />
            
            {/* Reports routes */}
            <Route path="relatorios" element={<ReportsList />} />
            
            {/* Profile and Settings routes */}
            <Route path="perfil" element={<ProfilePage />} />
            <Route path="configuracoes" element={<SettingsPage />} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
      
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </AuthProvider>
  );
}

export default App;