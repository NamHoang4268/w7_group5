import { LogOut } from 'lucide-react';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('tenant_id');
    navigate('/');
  };

  return (
    <header className="border-b bg-white">
      <div className="flex h-16 items-center px-4 md:px-6 w-full max-w-7xl mx-auto justify-between">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-slate-900">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-extrabold text-lg">
            D
          </div>
          DocHub AI
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-600 hover:text-slate-900">
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </header>
  );
}
