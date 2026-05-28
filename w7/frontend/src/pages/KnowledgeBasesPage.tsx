import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Plus, FolderOpen } from 'lucide-react';
import Header from '../components/layout/Header';

interface KnowledgeBase {
  id: string;
  name: string;
  createdAt: string;
  tenantId: string;
}

export default function KnowledgeBasesPage() {
  const navigate = useNavigate();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newKbName, setNewKbName] = useState('');

  useEffect(() => {
    const currentTenant = localStorage.getItem('tenant_id');
    if (!currentTenant) {
      navigate('/');
      return;
    }
    setTenantId(currentTenant);

    const fetchWorkspaces = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL;
        if (!apiUrl) return; // Không gọi nếu chưa cấu hình
        
        const response = await fetch(`${apiUrl}/workspaces`);
        if (response.ok) {
          const data = await response.json();
          const tenantKbs = data.workspaces
            .filter((ws: any) => ws.tenant_name === currentTenant)
            .map((ws: any) => ({
              id: ws.workspace_id,
              name: ws.workspace_id,
              createdAt: new Date(ws.created_at).toLocaleDateString('en-GB'),
              tenantId: ws.tenant_name,
            }));
          setKbs(tenantKbs);
        }
      } catch (error) {
        console.error('Lỗi khi tải danh sách workspace:', error);
      }
    };
    
    fetchWorkspaces();
  }, [navigate]);

  const handleCreateKb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKbName.trim() || !tenantId) return;
    
    const sanitizedId = newKbName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      if (apiUrl) {
        await fetch(`${apiUrl}/workspaces`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspace_id: sanitizedId,
            tenant_name: tenantId
          })
        });
      }
      
      // Update local state (Optimistic Update)
      const newKb: KnowledgeBase = {
        id: sanitizedId,
        name: sanitizedId,
        createdAt: new Date().toLocaleDateString('en-GB'),
        tenantId,
      };
      
      setKbs((prev) => [...prev, newKb]);
      setNewKbName('');
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Lỗi khi tạo workspace:', error);
    }
  };

  if (!tenantId) return null;

  const companyName = tenantId === 'company_a' ? 'Company A' : 'Company B';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Knowledge Bases</h1>
            <p className="text-slate-500 mt-1">
              Welcome, {companyName} — here are your document repositories.
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            {/* @ts-ignore */}
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Knowledge Base
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create Knowledge Base</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateKb}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">
                      Name
                    </label>
                    <Input
                      id="name"
                      placeholder="e.g. Contracts 2025"
                      value={newKbName}
                      onChange={(e: any) => setNewKbName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={!newKbName.trim()}>Create</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {kbs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
            <FolderOpen className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">No Knowledge Bases</h3>
            <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
              You haven't created any document repositories yet. Create your first knowledge base to get started.
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="mt-6" variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Create One Now
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {kbs.map((kb) => (
              <Card key={kb.id} className="flex flex-col hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl line-clamp-1" title={kb.name}>{kb.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-sm text-slate-500">
                    Created on {kb.createdAt}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    variant="secondary"
                    onClick={() => navigate(`/kb?kb_id=${kb.id}`)}
                  >
                    Open Workspace
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
