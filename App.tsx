import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Dashboard } from './components/dashboard/Dashboard';
import { CoachesList } from './components/coaches/CoachesList';
import { CouplesList } from './components/couples/CouplesList';
import { AssignmentsList } from './components/assignments/AssignmentsList';
import './styles/globals.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/coaches" element={<CoachesList />} />
            <Route path="/couples" element={<CouplesList />} />
            <Route path="/assignments" element={<AssignmentsList />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
