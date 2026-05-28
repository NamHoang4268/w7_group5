import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import KnowledgeBasesPage from './pages/KnowledgeBasesPage';
import KBDetailPage from './pages/KBDetailPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/knowledge-bases" element={<KnowledgeBasesPage />} />
        <Route path="/kb" element={<KBDetailPage />} />
      </Routes>
    </Router>
  );
}

export default App;
