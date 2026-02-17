
import React, { useState, useEffect } from 'react';
import { RMARequest, RMAStatus } from './types';
import RMAForm from './components/RMAForm';
import Login from './components/Login';
import ExcelJS from 'exceljs';

const App: React.FC = () => {
  const [requests, setRequests] = useState<RMARequest[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'all' | 'new' | 'reports'>('dashboard');
  const [editingRequest, setEditingRequest] = useState<RMARequest | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    const auth = localStorage.getItem('rma_auth_token');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);

    // Load data
    const saved = localStorage.getItem('rma_requests_v4');
    if (saved) {
      setRequests(JSON.parse(saved));
    } else {
      const dummy: RMARequest[] = [
        { id: 'RMA-001', date: '08/01/2023', createdAt: new Date().toISOString(), status: RMAStatus.PENDING, customerCountry: 'ALGERIA', customer: 'Bomare Company', source: 'Market', size: '65"', odf: 'IDL2507002', bom: 'BOM-EX-001', brand: 'VisionPlus', modelPN: 'Intel G2 Pro', defectDescription: 'Vertical Line', ver: 'V2.2', wc: '24/03', ocSerialNumber: 'SE-803130306', remark: 'Initial factory assessment.', images: { defectSymptom: null, factoryBatch: null, ocSerial: null } },
        { id: 'RMA-002', date: '08/01/2023', createdAt: new Date().toISOString(), status: RMAStatus.APPROVED, customerCountry: 'ALGERIA', customer: 'Bomare Company', source: 'Market', size: '55"', odf: 'IDL2507003', bom: 'BOM-EX-002', brand: 'VisionPlus', modelPN: 'Intel GS', defectDescription: 'Horizontal Line', ver: 'V2.1', wc: '24/04', ocSerialNumber: 'SE-803120306', remark: 'Approved for replacement.', images: { defectSymptom: null, factoryBatch: null, ocSerial: null } },
        { id: 'RMA-003', date: '08/01/2023', createdAt: new Date().toISOString(), status: RMAStatus.APPROVED, customerCountry: 'ALGERIA', customer: 'Bomare Company', source: 'Market', size: '43"', odf: 'IDL2507004', bom: 'BOM-EX-003', brand: 'VisionPlus', modelPN: 'Intel GSB Pro', defectDescription: 'Bright Dot', ver: 'V1.0', wc: '24/05', ocSerialNumber: 'SE-801130305', remark: 'Standard warranty.', images: { defectSymptom: null, factoryBatch: null, ocSerial: null } },
        { id: 'RMA-004', date: '06/01/2023', createdAt: new Date().toISOString(), status: RMAStatus.REJECTED, customerCountry: 'ALGERIA', customer: 'Bomare Company', source: 'Market', size: '32"', odf: 'IDL2507005', bom: 'BOM-EX-004', brand: 'VisionPlus', modelPN: 'Intel 3 Pro', defectDescription: 'No Display', ver: 'V3.0', wc: '23/50', ocSerialNumber: 'SE-801170306', remark: 'External damage found.', images: { defectSymptom: null, factoryBatch: null, ocSerial: null } },
      ];
      setRequests(dummy);
    }
  }, []);

  const handleLogin = (email: string) => {
    localStorage.setItem('rma_auth_token', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('rma_auth_token');
    setIsAuthenticated(false);
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
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: h.color }
      };
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
        const imageId = workbook.addImage({
          base64: matches[2],
          extension: (extension === 'jpg' ? 'jpeg' : extension) as any,
        });
        worksheet.addImage(imageId, {
          tl: { col: colIndex - 1, row: rowIndex - 0.9 } as any,
          br: { col: colIndex, row: rowIndex - 0.1 } as any,
          editAs: 'oneCell'
        });
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

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
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
      <aside className="w-64 bg-[#f8fafc] border-r border-slate-200 flex flex-col">
        <div className="p-6 flex-1">
          <div className="flex items-center space-x-2 text-blue-700 mb-8">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            <span className="font-bold text-lg tracking-tight">RMA Portal</span>
          </div>
          
          <nav className="space-y-1">
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
        <header className="h-16 bg-[#1e40af] text-white flex items-center justify-between px-8 shadow-sm">
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
              <div className="w-8 h-8 rounded-full bg-slate-300 overflow-hidden shadow-sm"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="Admin" /></div>
              <span className="text-sm font-bold tracking-wide uppercase">Administrator</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
          {activeView === 'dashboard' && (
            <div className="max-w-7xl mx-auto space-y-6">
              <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total RMAs', value: '1,645', trend: '↑ 1,245', color: 'blue' },
                  { label: 'Pending Approval', value: '34', trend: '↑ 3', color: 'amber' },
                  { label: 'In Progress', value: '82', trend: '0 overview', color: 'slate' },
                  { label: 'Completed This Month', value: '138', trend: '127 as month', color: 'emerald' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                      <h3 className="text-3xl font-bold mt-1">{stat.value}</h3>
                      <p className={`text-[10px] mt-1 font-medium ${stat.trend.includes('↑') ? 'text-emerald-600' : 'text-slate-400'}`}>Trend {stat.trend}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-50 text-slate-400">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs">Recent Submissions</h4>
                    <button onClick={() => setActiveView('all')} className="text-xs font-bold text-blue-600 hover:text-blue-700">View All</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                          <th className="px-6 py-3 text-left">RMA ID</th>
                          <th className="px-6 py-3 text-left">Date</th>
                          <th className="px-6 py-3 text-left">Model</th>
                          <th className="px-6 py-3 text-left">Serial No.</th>
                          <th className="px-6 py-3 text-left">Status</th>
                          <th className="px-6 py-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {requests.slice(0, 8).map((req) => (
                          <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-semibold text-slate-700">{req.id}</td>
                            <td className="px-6 py-4 text-slate-500">{req.date}</td>
                            <td className="px-6 py-4 text-slate-600">{req.modelPN}</td>
                            <td className="px-6 py-4 text-slate-500 font-mono text-xs">{req.ocSerialNumber}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${statusColors[req.status]}`}>
                                {req.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center space-x-2">
                              <button onClick={() => handleEdit(req)} className="p-1 hover:bg-white rounded border border-transparent hover:border-slate-200 text-slate-400 hover:text-blue-600 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
                    <h4 className="font-bold text-slate-900 mb-6 uppercase tracking-wider text-xs">Analytics Summary</h4>
                    <div className="space-y-6">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Weekly RMA Volume</p>
                        <div className="h-24 w-full flex items-end space-x-1">
                          {[40, 60, 45, 90, 50, 40, 95].map((h, i) => (
                            <div key={i} className="flex-1 bg-blue-50 rounded-t-sm relative group">
                              <div className="absolute bottom-0 w-full bg-blue-600 rounded-t-sm transition-all" style={{ height: `${h}%` }}></div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="pt-6 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Top Defect Types</p>
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 rounded-full border-4 border-blue-600 border-t-emerald-400 border-r-rose-400"></div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center text-[10px] font-black text-slate-600 uppercase"><div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></div> Panel Defect</div>
                            <div className="flex items-center text-[10px] font-black text-slate-600 uppercase"><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-2"></div> Electronics</div>
                            <div className="flex items-center text-[10px] font-black text-slate-600 uppercase"><div className="w-1.5 h-1.5 bg-rose-400 rounded-full mr-2"></div> Damage</div>
                          </div>
                        </div>
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
                <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">{editingRequest ? `Modify Request ${editingRequest.id}` : 'File New RMA Case'}</h2>
              </div>
              <RMAForm 
                onSubmit={handleSaveRequest} 
                onCancel={() => setActiveView('dashboard')} 
                initialData={editingRequest || undefined}
              />
            </div>
          )}

          {activeView === 'all' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Active Repositories</h2>
                <div className="flex space-x-3">
                  <button 
                    onClick={handleExportExcel}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center space-x-2 transition-all shadow-lg shadow-emerald-100 uppercase tracking-widest"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    <span>Export Canvas</span>
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
                        <th className="px-4 py-4 border-r border-slate-200 text-left">Serial No</th>
                        <th className="px-4 py-4 border-r border-slate-200 text-left">Defect</th>
                        <th className="px-4 py-4 border-r border-slate-200 text-center">Images</th>
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
                          <td className="px-4 py-4 border-r border-slate-200 font-mono text-[10px] text-slate-400">{r.ocSerialNumber}</td>
                          <td className="px-4 py-4 border-r border-slate-200 font-bold text-slate-600">{r.defectDescription}</td>
                          <td className="px-4 py-4 border-r border-slate-200 text-center">
                            <div className="flex justify-center -space-x-1.5">
                              {r.images.defectSymptom && <div className="w-5 h-5 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm"><img src={r.images.defectSymptom} className="object-cover w-full h-full" alt="1" /></div>}
                              {r.images.factoryBatch && <div className="w-5 h-5 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm"><img src={r.images.factoryBatch} className="object-cover w-full h-full" alt="2" /></div>}
                              {r.images.ocSerial && <div className="w-5 h-5 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm"><img src={r.images.ocSerial} className="object-cover w-full h-full" alt="3" /></div>}
                            </div>
                          </td>
                          <td className="px-4 py-4 border-r border-slate-200 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-tighter ${statusColors[r.status]}`}>{r.status}</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <button onClick={() => handleEdit(r)} className="text-blue-600 font-black hover:text-blue-800 transition-colors uppercase text-[10px]">Review</button>
                          </td>
                        </tr>
                      ))}
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
