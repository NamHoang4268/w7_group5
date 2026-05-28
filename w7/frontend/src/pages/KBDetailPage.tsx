import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/layout/Header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Upload, FileText, Send, Bot, User, Loader2 } from 'lucide-react';

interface FileRecord {
  id: string;
  name: string;
  kbId: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  source?: string;
}

export default function KBDetailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const kbId = searchParams.get('kb_id');
  const [kbName, setKbName] = useState<string>('Knowledge Base');
  
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!kbId) {
      navigate('/knowledge-bases');
      return;
    }

    const tenantId = localStorage.getItem('tenant_id');
    if (!tenantId) {
      navigate('/');
      return;
    }

    // Set Name (For now we just use kbId as name since it's the workspace_id)
    setKbName(kbId);

    // Initial greeting
    setMessages([
      {
        id: 'msg_0',
        role: 'ai',
        content: 'Xin chào! Tôi đã sẵn sàng trả lời câu hỏi dựa trên tài liệu trong thư mục này. Bạn muốn hỏi gì?',
      }
    ]);

    // Fetch existing documents
    const fetchDocuments = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL;
        if (!apiUrl) return;
        
        const res = await fetch(`${apiUrl}/documents?workspace_id=${kbId}`);
        if (res.ok) {
          const data = await res.json();
          const fetchedFiles = data.documents.map((d: any) => ({
            id: d.document_id,
            name: d.filename,
            kbId: kbId as string
          }));
          setFiles(fetchedFiles);
        }
      } catch (err) {
        console.error("Failed to load documents", err);
      }
    };
    fetchDocuments();
  }, [kbId, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUploadTrigger = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      if (!apiUrl) {
        alert("Chưa cấu hình VITE_API_URL");
        setIsUploading(false);
        return;
      }

      // 1. Get Pre-signed URL from Lambda
      const initRes = await fetch(`${apiUrl}/documents/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: kbId,
          filename: file.name
        })
      });
      
      const initData = await initRes.json();
      
      if (!initRes.ok) {
        throw new Error(initData.error || 'Failed to init upload');
      }

      const { upload_url } = initData;

      // 2. Upload directly to S3
      const formData = new FormData();
      // Must append fields in the exact order returned by AWS
      Object.keys(upload_url.fields).forEach(key => {
        formData.append(key, upload_url.fields[key]);
      });
      formData.append('file', file);

      const s3Res = await fetch(upload_url.url, {
        method: 'POST',
        body: formData
      });

      if (!s3Res.ok) {
        throw new Error('Failed to upload to S3');
      }

      // Success
      const newFile: FileRecord = {
        id: initData.document_id,
        name: file.name,
        kbId: kbId as string,
      };
      setFiles((prev) => [...prev, newFile]);
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';

    } catch (error) {
      console.error("Upload error:", error);
      alert("Tải lên thất bại. Vui lòng kiểm tra console.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsThinking(true);

    try {
      const aiUrl = import.meta.env.VITE_API_URL;
      if (!aiUrl) throw new Error("Chưa cấu hình VITE_API_URL");

      const response = await fetch(`${aiUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMsg.content,
          workspace_id: kbId
        })
      });

      if (!response.ok) {
        throw new Error("Lỗi khi gọi AI Backend");
      }

      const data = await response.json();

      const aiMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'ai',
        content: data.answer,
        source: data.sources && data.sources.length > 0 ? data.sources.join(', ') : undefined,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'ai',
        content: "Xin lỗi, đã có lỗi xảy ra khi kết nối tới AI. Vui lòng thử lại sau.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      <Header />
      
      <main className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Left Column - Document Sources */}
        <div className="w-full md:w-[30%] border-r border-slate-200 flex flex-col bg-slate-50/50">
          <div className="p-4 border-b border-slate-200">
            <Button 
              variant="ghost" 
              size="sm" 
              className="mb-4 text-slate-500 hover:text-slate-900 -ml-2"
              onClick={() => navigate('/knowledge-bases')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Knowledge Bases
            </Button>
            <h2 className="font-semibold text-lg truncate" title={kbName}>{kbName}</h2>
            <p className="text-xs text-slate-500 mt-1">Manage documents & sources</p>
          </div>
          
          <div className="p-4">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept=".pdf,.docx"
            />
            <Button 
              className="w-full bg-slate-900 text-white hover:bg-slate-800" 
              onClick={handleFileUploadTrigger}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {isUploading ? 'Đang lấy URL & Upload...' : '+ Upload File'}
            </Button>
            <p className="text-[10px] text-center text-slate-500 mt-2">Accepts .pdf, .docx</p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
              Uploaded Files ({files.length})
            </h3>
            
            {files.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-500">
                No files uploaded yet.
              </div>
            ) : (
              <ul className="space-y-2">
                {files.map((file) => (
                  <li key={file.id} className="flex items-start gap-2 p-3 bg-white rounded-md border border-slate-200 shadow-sm">
                    <FileText className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                    <span className="text-sm text-slate-700 truncate" title={file.name}>
                      {file.name}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right Column - AI Chat */}
        <div className="w-full md:w-[70%] flex flex-col h-full bg-white relative">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'ai' && (
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 border border-blue-200">
                    <Bot className="h-5 w-5 text-blue-600" />
                  </div>
                )}
                
                <div className={`flex flex-col gap-1 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div 
                    className={`px-4 py-3 rounded-2xl text-sm ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-sm' 
                        : 'bg-slate-100 text-slate-900 rounded-tl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                  
                  {msg.source && (
                    <Badge variant="secondary" className="mt-1 text-xs font-normal text-slate-500 bg-slate-100/50">
                      Source: {msg.source}
                    </Badge>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 border border-slate-300">
                    <User className="h-5 w-5 text-slate-600" />
                  </div>
                )}
              </div>
            ))}
            
            {isThinking && (
              <div className="flex gap-4 justify-start">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 border border-blue-200">
                  <Bot className="h-5 w-5 text-blue-600" />
                </div>
                <div className="px-4 py-3 rounded-2xl text-sm bg-slate-100 text-slate-900 rounded-tl-sm flex items-center gap-2">
                  <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-slate-200">
            <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto relative flex items-center">
              <Input
                value={inputValue}
                onChange={(e: any) => setInputValue(e.target.value)}
                placeholder="Ask a question about your documents..."
                className="pr-12 py-6 rounded-full border-slate-300 shadow-sm focus-visible:ring-blue-500"
                disabled={isThinking}
              />
              <Button 
                type="submit" 
                size="icon" 
                className="absolute right-1.5 h-9 w-9 rounded-full bg-blue-600 hover:bg-blue-700"
                disabled={!inputValue.trim() || isThinking}
              >
                <Send className="h-4 w-4 text-white" />
              </Button>
            </form>
            <div className="text-center mt-2">
              <p className="text-[10px] text-slate-400">AI can make mistakes. Check important information.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
