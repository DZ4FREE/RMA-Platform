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
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

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
    // Priority 1: Netlify environment variable
    const envKey = process.env.API_KEY;
    if (envKey && envKey.length > 5) {
      setHasApiKey(true);
      console.log("Gemini Engine: Initialized via Environment Variable");
      return;
    }

    // Priority 2: AI Studio local selection
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
            <span className="font-bold text-lg tracking-tight tracking-widest uppercase text-blue-900">ProTrack</span>
          </div>
          
          <nav className="space-y-1 mb-8">
            <button onClick={() => setActiveView('dashboard')} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === 'dashboard' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              <span>Dashboard</span>
            </button>
            <button onClick={() => setActiveView('all')} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === 'all' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
              <span>RMA Repository</span>
            </button>
            <button onClick={() => { setEditingRequest(null); setActiveView('new'); }} className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === 'new' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              <span>New Request</span>
            </button>
          </nav>

          {!hasApiKey && (
            <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200 animate-fadeIn">
              <p className="text-[10px] font-black text-amber-600 uppercase mb-2">Gemini Engine Locked</p>
              <p className="text-[11px] text-amber-800 leading-tight mb-4">No API Key detected. AI scanning and analysis features are currently disabled.</p>
              <button 
                onClick={handleSelectKey}
                className="w-full py-2.5 bg-blue-600 text-white text-[10px] font-black rounded-lg hover:bg-blue-700 uppercase tracking-widest transition-all shadow-md active:scale-95"
              >
                Activate AI Engine
              </button>
            </div>
          )}
          
          {hasApiKey && (
            <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center space-x-2 animate-fadeIn">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-100"></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-tight">AI Status: Active</span>
                <span className="text-[8px] text-emerald-600 font-bold uppercase opacity-70">Gemini 3 Flash Ready</span>
              </div>
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
              placeholder="Filter by Serial, Model or RMA ID..." 
              className="w-full bg-blue-800/50 border border-blue-400/20 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-blue-300 focus:ring-2 focus:ring-blue-400 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3 pl-4 border-l border-blue-800">
              <div className="w-8 h-8 rounded-full bg-slate-300 overflow-hidden shadow-sm border border-blue-400 ring-2 ring-blue-500/20">
                <img src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'Guest'}`} alt="Avatar" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-blue-200 uppercase tracking-[0.1em] opacity-80">Administrator</span>
                <span className="text-xs font-bold tracking-wide">{profile?.full_name || user?.email?.split('@')[0] || 'User'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
          {activeView === 'dashboard' && (
            <div className="max-w-7xl mx-auto space-y-8">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Overview</p>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">RMA Analytics</h2>
                </div>
                <div className="flex space-x-2">
                  <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-500">Last updated: Just now</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Cases', value: requests.length, trend: '↑ 4%', color: 'blue' },
                  { label: 'Awaiting Action', value: requests.filter(r => r.status === RMAStatus.PENDING).length, trend: '!', color: 'amber' },
                  { label: 'Active Process', value: requests.filter(r => r.status === RMAStatus.PROCESSING).length, trend: '...', color: 'slate' },
                  { label: 'Validated', value: requests.filter(r => r.status === RMAStatus.APPROVED).length, trend: '✓ 92%', color: 'emerald' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 flex justify-between items-start shadow-sm hover:shadow-md transition-shadow group">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                      <h3 className="text-4xl font-black mt-2 text-slate-800">{stat.value}</h3>
                      <span className="text-[10px] font-bold text-slate-400 mt-2 block group-hover:text-slate-600 transition-colors">Trends monitored daily</span>
                    </div>
                    <div className={`px-2 py-1 rounded-md bg-slate-50 text-[10px] font-black text-slate-400 border border-slate-100`}>
                      {stat.trend}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
                      <h4 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">Recent Activity Stream</h4>
                    </div>
                    <button onClick={() => setActiveView('all')} className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest">Full History &rarr;</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                          <th className="px-6 py-4 text-left">Case ID</th>
                          <th className="px-6 py-4 text-left">Customer</th>
                          <th className="px-6 py-4 text-left">Panel Serial</th>
                          <th className="px-6 py-4 text-left">Status</th>
                          <th className="px-6 py-4 text-center">Operation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {requests.slice(0, 8).map((req) => (
                          <tr key={req.id} className="hover:bg-blue-50/30 transition-colors group">
                            <td className="px-6 py-4">
                              <span className="font-black text-slate-800">{req.id}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-700">{req.customer}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">{req.customerCountry}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-[11px] font-mono font-bold text-slate-500">{req.ocSerialNumber}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-tighter ${statusColors[req.status]}`}>
                                {req.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button onClick={() => handleEdit(req)} className="text-[10px] font-black text-blue-600 hover:text-white hover:bg-blue-600 px-3 py-1 rounded-lg border border-blue-600/20 transition-all uppercase tracking-widest">Inspect</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-blue-600 rounded-2xl p-8 text-white shadow-xl shadow-blue-200 relative overflow-hidden flex flex-col justify-between">
                   <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                   <div>
                      <h4 className="text-xl font-black mb-4">Quick Actions</h4>
                      <p className="text-blue-100 text-sm mb-8 leading-relaxed">Instantly generate new quality assurance records or extract batch reports for auditing.</p>
                      <div className="space-y-3">
                        <button onClick={() => { setEditingRequest(null); setActiveView('new'); }} className="w-full bg-white text-blue-700 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-all">Start New Entry</button>
                        <button onClick={handleExportExcel} className="w-full bg-blue-500 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest border border-blue-400/50 hover:bg-blue-400 transition-all">Bulk Export (XLSX)</button>
                      </div>
                   </div>
                   <div className="mt-8 pt-8 border-t border-blue-400/50">
                      <div className="flex items-center space-x-2 text-[10px] font-black uppercase opacity-70">
                         <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                         <span>System Health: Optimal</span>
                      </div>
                   </div>
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
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Quality Assurance</span>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">{editingRequest ? `Modify Entry ${editingRequest.id}` : 'Create Technical Record'}</h2>
                </div>
              </div>
              <RMAForm onSubmit={handleSaveRequest} onCancel={() => setActiveView('dashboard')} initialData={editingRequest || undefined} />
            </div>
          )}

          {activeView === 'all' && (
            <div className="space-y-6">
              <div className="flex items-end justify-between">
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Database</p>
                   <h2 className="text-3xl font-black text-slate-900 tracking-tight">Technical Repository</h2>
                </div>
                <div className="flex space-x-3">
                  <button onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl text-[10px] font-black flex items-center space-x-2 transition-all shadow-lg shadow-emerald-100 uppercase tracking-widest">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <span>Excel Export</span>
                  </button>
                  <button onClick={() => setActiveView('new')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-[10px] font-black transition-all shadow-lg shadow-blue-100 uppercase tracking-widest">+ New Entry</button>
                </div>
              </div>
              
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl shadow-slate-100">
                <div className="overflow-x-auto spreadsheet-scroll">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase font-black tracking-widest border-b border-slate-200 text-[10px]">
                        <th className="px-6 py-5 border-r border-slate-200 text-center w-16">#</th>
                        <th className="px-6 py-5 border-r border-slate-200 text-left">Entity</th>
                        <th className="px-6 py-5 border-r border-slate-200 text-left">Panel Spec</th>
                        <th className="px-6 py-5 border-r border-slate-200 text-left">Defect Type</th>
                        <th className="px-6 py-5 border-r border-slate-200 text-left">OC Serial</th>
                        <th className="px-6 py-5 border-r border-slate-200 text-center">Status</th>
                        <th className="px-6 py-5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRequests.map((r) => (
                        <tr key={r.id} className="hover:bg-blue-50/40 transition-colors group">
                          <td className="px-6 py-5 border-r border-slate-200 text-center font-black text-blue-600">{r.id}</td>
                          <td className="px-6 py-5 border-r border-slate-200">
                            <div className="flex flex-col">
                               <span className="font-bold text-slate-800 text-sm">{r.customer}</span>
                               <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{r.customerCountry}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 border-r border-slate-200">
                             <div className="flex flex-col">
                               <span className="font-black text-slate-700 text-xs">{r.modelPN}</span>
                               <span className="text-[10px] text-slate-400 font-bold uppercase">{r.size} • {r.odf}</span>
                             </div>
                          </td>
                          <td className="px-6 py-5 border-r border-slate-200 font-bold text-slate-600 text-xs uppercase tracking-tight">{r.defectDescription}</td>
                          <td className="px-6 py-5 border-r border-slate-200 font-mono text-[11px] font-bold text-slate-500">{r.ocSerialNumber}</td>
                          <td className="px-6 py-5 border-r border-slate-200 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black border uppercase tracking-tighter ${statusColors[r.status]}`}>{r.status}</span>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <button onClick={() => handleEdit(r)} className="text-[10px] font-black text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-widest border border-blue-100 px-3 py-1 rounded-lg bg-blue-50/50">Edit</button>
                          </td>
                        </tr>
                      ))}
                      {filteredRequests.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-24 text-center">
                             <div className="flex flex-col items-center opacity-40">
                                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                <span className="text-sm font-black uppercase tracking-widest">No matching records found</span>
                             </div>
                          </td>
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