import React, { useState, useEffect } from 'react';
import { RMARequest, RMAStatus } from './types';
import RMAForm from './components/RMAForm';
import Login from './components/Login';
import ExcelJS from 'exceljs';
import { supabase, getProfile, UserProfile, isSupabaseConfigured } from './services/supabase';

const App: React.FC = () => {
  const [requests, setRequests] = useState<RMARequest[]>([]);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'all' | 'new' | 'reports'>('dashboard');
  const [editingRequest, setEditingRequest] = useState<RMARequest | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);

  useEffect(() => {
    checkApiKey();

    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
          loadUserProfile(session.user.id);
        }
        setIsLoading(false);
      }).catch(err => {
        console.error("Supabase session error:", err);
        setIsLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser(session.user);
          loadUserProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
      });

      return () => subscription.unsubscribe();
    } else {
      setIsLoading(false);
    }

    const saved = localStorage.getItem('rma_requests_v4');
    if (saved) {
      setRequests(JSON.parse(saved));
    } else {
      const dummy: RMARequest[] = [
        { id: 'RMA-001', date: '08/01/2023', createdAt: new Date().toISOString(), status: RMAStatus.PENDING, customerCountry: 'ALGERIA', customer: 'Bomare Company', source: 'Market', size: '65"', odf: 'IDL2507002', bom: 'BOM-EX-001', brand: 'VisionPlus', modelPN: 'Intel G2 Pro', defectDescription: 'Vertical Line', ver: 'V2.2', wc: '24/03', ocSerialNumber: 'SE-803130306', remark: 'Initial factory assessment.', images: { defectSymptom: null, factoryBatch: null, ocSerial: null } },
      ];
      setRequests(dummy);
    }
  }, []);

  const checkApiKey = async () => {
    // If the key is in process.env (Netlify), we are good.
    const envKey = process.env.API_KEY;
    if (envKey && envKey.length > 5) {
      setHasApiKey(true);
      return;
    }

    // Fallback to AI Studio Bridge if available
    if (window.aistudio) {
      try {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      } catch (e) {
        setHasApiKey(false);
      }
    } else {
      setHasApiKey(false);
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const loadUserProfile = async (userId: string) => {
    const p = await getProfile(userId);
    setProfile(p);
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  const handleSaveRequest = (data: Partial<RMARequest>) => {
    let updatedRequests: RMARequest[];
    if (editingRequest) {
      updatedRequests = requests.map(req => req.id === editingRequest.id ? { ...req, ...data } : req);
    } else {
      const nextId = `RMA-${(requests.length + 1).toString().padStart(3, '0')}`;
      const newRequest: RMARequest = { ...(data as RMARequest), id: nextId, createdAt: new Date().toISOString() };
      updatedRequests = [newRequest, ...requests];
    }
    localStorage.setItem('rma_requests_v4', JSON.stringify(updatedRequests));
    setRequests(updatedRequests);
    setActiveView('dashboard');
    setEditingRequest(null);
  };

  const handleEdit = (request: RMARequest) => {
    setEditingRequest(request);
    setActiveView('new');
  };

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('RMA Canvas Export');

    const headers = [
      { name: 'NO', color: 'FFC000' },
      { name: 'Customer Country', color: 'FFC000' },
      { name: 'Customer', color: 'FFC000' },
      { name: 'From Market or Factory', color: '0070C0', textWhite: true },
      { name: 'Size', color: 'FFC000' },
      { name: 'ODF', color: 'FFC000' },
      { name: 'EXPRESSLUCK BOM', color: 'FFC000' },
      { name: 'Brand', color: 'FFC000' },
      { name: 'Model P/N(Panel Part No)', color: 'FFC000' },
      { name: 'Defect description', color: '0070C0', textWhite: true },
      { name: 'Ver.', color: 'FFC000' },
      { name: 'W/C', color: 'FFC000' },
      { name: 'OC Serial Number', color: '0070C0', textWhite: true },
      { name: 'Picture Of Defective Symptom', color: '0070C0', textWhite: true },
      { name: 'Factory batch No. picture (ODF No. )', color: '0070C0', textWhite: true },
      { name: 'Picture Of O/C Serial Number', color: '0070C0', textWhite: true },
      { name: 'Remark', color: 'FFFF00' },
      { name: 'date', color: '0070C0', textWhite: true }
    ];

    worksheet.columns = headers.map(h => ({ 
      header: h.name, 
      key: h.name, 
      width: h.name.includes('Picture') ? 35 : 20 
    }));

    const headerRow = worksheet.getRow(1);
    headerRow.height = 40;
    headerRow.eachCell((cell, colNumber) => {
      const h = headers[colNumber - 1];
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: h.color } };
      cell.font = { bold: true, size: 9, name: 'Arial Narrow', color: { argb: h.textWhite ? 'FFFFFF' : '000000' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    const addImageToWorksheet = (base64Data: string | null, colIndex: number, rowIndex: number) => {
      if (!base64Data) return;
      try {
        const matches = base64Data.match(/^data:image\/([A-Za-z-+/]+);base64,(.+)$/);
        if (!matches) return;
        const extension = matches[1].replace('jpeg', 'jpg');
        const imageId = workbook.addImage({ base64: matches[2], extension: (extension === 'jpg' ? 'jpeg' : extension) as any });
        worksheet.addImage(imageId, { tl: { col: colIndex - 1, row: rowIndex - 0.9 } as any, br: { col: colIndex, row: rowIndex - 0.1 } as any, editAs: 'oneCell' });
      } catch (e) { console.error("Image embed failed", e); }
    };

    requests.forEach((r, index) => {
      const rowIndex = index + 2;
      worksheet.addRow({
        'NO': r.id, 'Customer Country': r.customerCountry, 'Customer': r.customer,
        'From Market or Factory': r.source, 'Size': r.size, 'ODF': r.odf,
        'EXPRESSLUCK BOM': r.bom, 'Brand': r.brand, 'Model P/N(Panel Part No)': r.modelPN,
        'Defect description': r.defectDescription, 'Ver.': r.ver, 'W/C': r.wc,
        'OC Serial Number': r.ocSerialNumber, 'Remark': r.remark, 'date': r.date
      });
      const row = worksheet.getRow(rowIndex);
      row.height = 80;
      row.eachCell(cell => {
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.font = { size: 9 };
      });
      addImageToWorksheet(r.images.defectSymptom, 14, rowIndex);
      addImageToWorksheet(r.images.factoryBatch, 15, rowIndex);
      addImageToWorksheet(r.images.ocSerial, 16, rowIndex);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RMA_Report_Canvas_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const statusColors: Record<string, string> = {
    [RMAStatus.PENDING]: 'bg-amber-100 text-amber-700 border-amber-200',
    [RMAStatus.APPROVED]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    [RMAStatus.REJECTED]: 'bg-rose-100 text-rose-700 border-rose-200',
    [RMAStatus.PROCESSING]: 'bg-blue-100 text-blue-700 border-blue-200',
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={(u) => setUser(u)} />;
  }

  const filteredRequests = requests.filter(r => 
    r.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.ocSerialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.modelPN.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#f1f5f9] text-slate-800 font-sans animate-fadeIn">
      {/* Sidebar */}
      <aside className="w-64 bg-[#f8fafc] border-r border-slate-200 flex flex-col overflow-y-auto">
        <div className="p-6 flex-1">
          <div className="flex items-center space-x-2 text-blue-700 mb-8">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            <span className="font-bold text-lg tracking-tight">RMA Portal</span>
          </div>
          
          <nav className="space-y-1 mb-8">
            <button onClick={() => setActiveView('dashboard')} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              <span>Dashboard</span>
            </button>
            <button onClick={() => setActiveView('all')} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === 'all' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
              <span>All RMAs</span>
            </button>
            <button onClick={() => { setEditingRequest(null); setActiveView('new'); }} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === 'new' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              <span>New Request</span>
            </button>
          </nav>

          {!hasApiKey && !process.env.API_KEY && (
            <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200 animate-pulse">
              <p className="text-[10px] font-black text-amber-600 uppercase mb-2">Gemini Setup Required</p>
              <p className="text-[11px] text-amber-800 leading-tight mb-4">Please add your API key to Netlify or connect via the button below.</p>
              <button 
                onClick={handleSelectKey}
                className="w-full py-2.5 bg-blue-600 text-white text-[10px] font-black rounded-lg hover:bg-blue-700 uppercase tracking-widest transition-all shadow-md active:scale-95"
              >
                Connect API Key
              </button>
            </div>
          )}
          
          {(hasApiKey || (process.env.API_KEY && process.env.API_KEY.length > 5)) && (
            <div className="mt-8 p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-tight">AI Engine Ready</span>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200">
           <button 
             onClick={handleLogout}
             className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
           >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              <span>Sign Out</span>
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-[#1e40af] text-white flex items-center justify-between px-8 shadow-sm shrink-0">
          <div className="flex-1 max-w-lg relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-blue-200">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </span>
            <input 
              type="text" 
              placeholder="Search RMAs..." 
              className="w-full bg-blue-800 border-none rounded-md py-2 pl-10 pr-4 text-sm text-white placeholder-blue-300 focus:ring-2 focus:ring-blue-400 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3 pl-4 border-l border-blue-800">
              <div className="w-8 h-8 rounded-full bg-slate-300 overflow-hidden shadow-sm border border-blue-400">
                <img src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'Guest'}`} alt="Avatar" />
              </div>
              <span className="text-sm font-bold tracking-wide uppercase">{profile?.full_name || user?.email?.split('@')[0] || 'Administrator'}</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
          {activeView === 'dashboard' && (
            <div className="max-w-7xl mx-auto space-y-6">
              <h2 className="text-2xl font-bold text-slate-900">Dashboard Overview</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total RMAs', value: requests.length, trend: '↑', color: 'blue' },
                  { label: 'Pending Approval', value: requests.filter(r => r.status === RMAStatus.PENDING).length, trend: '!', color: 'amber' },
                  { label: 'In Progress', value: requests.filter(r => r.status === RMAStatus.PROCESSING).length, trend: '~', color: 'slate' },
                  { label: 'Completed', value: requests.filter(r => r.status === RMAStatus.APPROVED).length, trend: '✓', color: 'emerald' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                      <h3 className="text-3xl font-bold mt-1">{stat.value}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 font-black text-xl">
                      {stat.trend}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs">Recent Submissions</h4>
                  <button onClick={() => setActiveView('all')} className="text-xs font-bold text-blue-600 hover:text-blue-700">View Comprehensive List</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                        <th className="px-6 py-3 text-left">RMA ID</th>
                        <th className="px-6 py-3 text-left">Date</th>
                        <th className="px-6 py-3 text-left">Model</th>
                        <th className="px-6 py-3 text-left">Status</th>
                        <th className="px-6 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {requests.slice(0, 5).map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-700">{req.id}</td>
                          <td className="px-6 py-4 text-slate-500">{req.date}</td>
                          <td className="px-6 py-4 text-slate-600">{req.modelPN}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${statusColors[req.status]}`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button onClick={() => handleEdit(req)} className="text-blue-600 hover:text-blue-800 font-bold transition-all">Edit Case</button>
                          </td>
                        </tr>
                      ))}
                      {requests.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">No RMA records found. Click "New Request" to begin.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeView === 'new' && (
            <div className="max-w-5xl mx-auto pb-12">
              <div className="flex items-center space-x-3 mb-8">
                <button onClick={() => setActiveView('dashboard')} className="p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">{editingRequest ? `Edit Case ${editingRequest.id}` : 'Create New RMA Entry'}</h2>
              </div>
              <RMAForm onSubmit={handleSaveRequest} onCancel={() => setActiveView('dashboard')} initialData={editingRequest || undefined} />
            </div>
          )}

          {activeView === 'all' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">RMA Repository</h2>
                <div className="flex space-x-3">
                  <button onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center space-x-2 transition-all shadow-lg shadow-emerald-100 uppercase tracking-widest">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <span>Export Excel</span>
                  </button>
                  <button onClick={() => setActiveView('new')} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-lg shadow-blue-100 uppercase tracking-widest">+ Create Entry</button>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xl shadow-slate-100">
                <div className="overflow-x-auto spreadsheet-scroll">
                  <table className="min-w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase font-black tracking-widest border-b border-slate-200">
                        <th className="px-4 py-4 border-r border-slate-200 text-center">NO</th>
                        <th className="px-4 py-4 border-r border-slate-200 text-left">Country</th>
                        <th className="px-4 py-4 border-r border-slate-200 text-left">Customer</th>
                        <th className="px-4 py-4 border-r border-slate-200 text-left">Model P/N</th>
                        <th className="px-4 py-4 border-r border-slate-200 text-left">Defect</th>
                        <th className="px-4 py-4 border-r border-slate-200 text-center">Status</th>
                        <th className="px-4 py-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRequests.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-4 border-r border-slate-200 text-center font-black text-blue-600">{r.id}</td>
                          <td className="px-4 py-4 border-r border-slate-200 text-slate-500 font-medium">{r.customerCountry}</td>
                          <td className="px-4 py-4 border-r border-slate-200 font-bold text-slate-700">{r.customer}</td>
                          <td className="px-4 py-4 border-r border-slate-200 font-black text-slate-800">{r.modelPN}</td>
                          <td className="px-4 py-4 border-r border-slate-200 font-bold text-slate-600">{r.defectDescription}</td>
                          <td className="px-4 py-4 border-r border-slate-200 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-tighter ${statusColors[r.status]}`}>{r.status}</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <button onClick={() => handleEdit(r)} className="text-blue-600 font-black hover:text-blue-800 transition-colors uppercase text-[10px]">Review</button>
                          </td>
                        </tr>
                      ))}
                      {filteredRequests.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">No records matching your search.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;