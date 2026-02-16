
import React, { useState, useEffect } from 'react';
import { RMARequest, RMAStatus } from './types';
import RMAForm from './components/RMAForm';
import ExcelJS from 'exceljs';

const App: React.FC = () => {
  const [requests, setRequests] = useState<RMARequest[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<RMARequest | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('rma_requests_v4');
    if (saved) {
      setRequests(JSON.parse(saved));
    } else {
      const dummy: RMARequest[] = [
        {
          id: '1',
          date: '2024-03-20',
          createdAt: new Date().toISOString(),
          status: RMAStatus.APPROVED,
          customerCountry: 'ALGERIA',
          customer: 'Bomare Company',
          source: 'Market',
          size: '65"',
          odf: 'IDL2507002',
          bom: 'BOM-EX-001',
          brand: 'VisionPlus',
          modelPN: 'ST6451D08-5 V2.2',
          defectDescription: 'Vertical Line',
          ver: 'V2.2',
          wc: '24/03',
          ocSerialNumber: '80879768B0123',
          remark: 'Initial factory assessment completed.',
          images: { defectSymptom: null, factoryBatch: null, ocSerial: null }
        }
      ];
      setRequests(dummy);
    }
  }, []);

  const handleSaveRequest = (data: Partial<RMARequest>) => {
    let updatedRequests: RMARequest[];
    
    if (editingRequest) {
      updatedRequests = requests.map(req => 
        req.id === editingRequest.id ? { ...req, ...data } : req
      );
    } else {
      const nextId = requests.length > 0 ? (Math.max(...requests.map(r => parseInt(r.id) || 0)) + 1).toString() : "1";
      const newRequest: RMARequest = {
        ...(data as RMARequest),
        id: nextId,
        createdAt: new Date().toISOString(),
      };
      updatedRequests = [newRequest, ...requests];
    }

    try {
      localStorage.setItem('rma_requests_v4', JSON.stringify(updatedRequests));
      setRequests(updatedRequests);
      setIsFormOpen(false);
      setEditingRequest(null);
    } catch (error) {
      console.error("Storage Error:", error);
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        alert("Browser storage quota exceeded! Please delete some old RMA records before adding new ones. This happens because high-resolution images take up significant space.");
      } else {
        alert("An error occurred while saving. Please try again.");
      }
    }
  };

  const handleReview = (request: RMARequest) => {
    setEditingRequest(request);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingRequest(null);
  };

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('RMA Records');

    // Define Columns exactly as per the Canvas image
    const headers = [
      { name: 'NO', color: 'FFFFC000' },
      { name: 'Customer Country', color: 'FFFFC000' },
      { name: 'Customer', color: 'FFFFC000' },
      { name: 'From Market or Factory', color: 'FF0070C0' },
      { name: 'Size', color: 'FFFFC000' },
      { name: 'ODF', color: 'FFFFC000' },
      { name: 'EXPRESSLUCK BOM', color: 'FFFFC000' },
      { name: 'Brand', color: 'FFFFC000' },
      { name: 'Model P/N(Panel Part No)', color: 'FFFFC000' },
      { name: 'Defect description', color: 'FF0070C0' },
      { name: 'Ver.', color: 'FFFFC000' },
      { name: 'W/C', color: 'FFFFC000' },
      { name: 'OC Serial Number', color: 'FF0070C0' },
      { name: 'Picture Of Defective Symptom', color: 'FF0070C0' },
      { name: 'Factory batch No. picture (ODF No. )', color: 'FF0070C0' },
      { name: 'Picture Of O/C Serial Number', color: 'FF0070C0' },
      { name: 'Remark', color: 'FFFFFF00' },
      { name: 'date', color: 'FFFFFFFF' }
    ];

    worksheet.columns = headers.map(h => ({ header: h.name, key: h.name, width: 25 }));

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.height = 35;
    headerRow.eachCell((cell, colNumber) => {
      const h = headers[colNumber - 1];
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: h.color }
      };
      cell.font = { bold: true, size: 9, name: 'Courier New' };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Helper to add image to worksheet
    const addImageToWorksheet = (base64Data: string | null, colIndex: number, rowIndex: number) => {
      if (!base64Data) return;
      try {
        const matches = base64Data.match(/^data:image\/([A-Za-z-+/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) return;

        const extension = matches[1] === 'jpeg' ? 'jpeg' : 'png';
        const imageBase64 = matches[2];

        const imageId = workbook.addImage({
          base64: imageBase64,
          extension: extension as any,
        });

        worksheet.addImage(imageId, {
          tl: { col: colIndex - 1, row: rowIndex - 1 },
          br: { col: colIndex, row: rowIndex },
          editAs: 'oneCell'
        });
      } catch (err) {
        console.error("Error embedding image:", err);
      }
    };

    // Add Data and Images
    requests.forEach((r, index) => {
      const currentRowIndex = index + 2; // +1 for headers, +1 because exceljs rows are 1-based
      const dataRow = worksheet.addRow({
        'NO': r.id,
        'Customer Country': r.customerCountry,
        'Customer': r.customer,
        'From Market or Factory': r.source,
        'Size': r.size,
        'ODF': r.odf,
        'EXPRESSLUCK BOM': r.bom,
        'Brand': r.brand,
        'Model P/N(Panel Part No)': r.modelPN,
        'Defect description': r.defectDescription,
        'Ver.': r.ver,
        'W/C': r.wc,
        'OC Serial Number': r.ocSerialNumber,
        'Picture Of Defective Symptom': '', // Image placeholder
        'Factory batch No. picture (ODF No. )': '', // Image placeholder
        'Picture Of O/C Serial Number': '', // Image placeholder
        'Remark': r.remark,
        'date': r.date
      });

      // Height to fit image thumbnail
      dataRow.height = 70;

      // Add actual images to the worksheet
      addImageToWorksheet(r.images.defectSymptom, 14, currentRowIndex);
      addImageToWorksheet(r.images.factoryBatch, 15, currentRowIndex);
      addImageToWorksheet(r.images.ocSerial, 16, currentRowIndex);
    });

    // Style data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell(cell => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          cell.font = { size: 9, name: 'Courier New' };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `RMA_Export_Canvas_with_Photos_${new Date().toISOString().split('T')[0]}.xlsx`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const filteredRequests = requests.filter(r => 
    r.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.ocSerialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.modelPN.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
      {/* Navigation */}
      <nav className="bg-slate-900 text-white shadow-2xl sticky top-0 z-50">
        <div className="max-w-full mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-amber-500 w-10 h-10 rounded-md flex items-center justify-center font-black text-xl text-slate-900">M</div>
            <div>
              <h1 className="text-lg font-black tracking-tighter uppercase leading-none">RMA Management</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">Quality Assurance Protocol</p>
            </div>
          </div>
          
          <div className="flex-1 max-w-md mx-8 hidden md:block">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search spreadsheet records..." 
                className="w-full bg-slate-800 border border-slate-700 rounded py-2 pl-10 pr-4 text-xs focus:ring-1 focus:ring-amber-500 transition-all outline-none text-slate-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <svg className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={handleExportExcel}
              className="flex items-center space-x-2 bg-emerald-700 hover:bg-emerald-600 px-4 py-2 rounded font-bold text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-95"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download Canvas (+Photos)</span>
            </button>
            <button 
              onClick={() => { setEditingRequest(null); setIsFormOpen(true); }}
              className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded font-black text-[10px] uppercase tracking-widest transition-all shadow-lg"
            >
              + Add Row
            </button>
          </div>
        </div>
      </nav>

      <main className="p-6">
        {isFormOpen ? (
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <button onClick={handleCloseForm} className="p-2 hover:bg-white rounded transition-colors border border-transparent hover:border-gray-300">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                  {editingRequest ? `Reviewing NO. ${editingRequest.id}` : 'Create New RMA Entry'}
                </h2>
              </div>
            </div>
            <RMAForm 
              onSubmit={handleSaveRequest} 
              onCancel={handleCloseForm} 
              initialData={editingRequest || undefined}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* The "Respect the Canvas" Table */}
            <div className="bg-white shadow-2xl border border-slate-300 overflow-hidden rounded-sm">
              <div className="bg-slate-800 text-white px-4 py-2 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center">
                  <svg className="w-3 h-3 mr-2 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                  </svg>
                  Operational Spreadsheet View
                </span>
                <span className="text-[10px] font-mono text-slate-400">Total Entries: {requests.length}</span>
              </div>
              
              <div className="overflow-x-auto spreadsheet-scroll">
                <table className="min-w-full border-collapse text-[10px] font-mono">
                  <thead>
                    <tr className="uppercase font-black text-center border-b border-slate-400">
                      <th className="px-3 py-4 border-r border-slate-400 bg-[#FFC000] text-slate-900 min-w-[50px]">NO</th>
                      <th className="px-3 py-4 border-r border-slate-400 bg-[#FFC000] text-slate-900 min-w-[120px]">Customer Country</th>
                      <th className="px-3 py-4 border-r border-slate-400 bg-[#FFC000] text-slate-900 min-w-[150px]">Customer</th>
                      <th className="px-3 py-4 border-r border-slate-400 bg-[#0070C0] text-white min-w-[150px]">From Market or Factory</th>
                      <th className="px-3 py-4 border-r border-slate-400 bg-[#FFC000] text-slate-900 min-w-[70px]">Size</th>
                      <th className="px-3 py-4 border-r border-slate-400 bg-[#FFC000] text-slate-900 min-w-[120px]">ODF</th>
                      <th className="px-3 py-4 border-r border-slate-400 bg-[#FFC000] text-slate-900 min-w-[150px]">EXPRESSLUCK BOM</th>
                      <th className="px-3 py-4 border-r border-slate-400 bg-[#FFC000] text-slate-900 min-w-[100px]">Brand</th>
                      <th className="px-3 py-4 border-r border-slate-400 bg-[#FFC000] text-slate-900 min-w-[180px]">Model P/N(Panel Part No)</th>
                      <th className="px-3 py-4 border-r border-slate-400 bg-[#0070C0] text-white min-w-[180px]">Defect description</th>
                      <th className="px-3 py-4 border-r border-slate-400 bg-[#FFC000] text-slate-900 min-w-[70px]">Ver.</th>
                      <th className="px-3 py-4 border-r border-slate-400 bg-[#FFC000] text-slate-900 min-w-[70px]">W/C</th>
                      <th className="px-3 py-4 border-r border-slate-400 bg-[#0070C0] text-white min-w-[180px]">OC Serial Number</th>
                      <th className="px-3 py-4 border-r border-slate-400 bg-[#0070C0] text-white min-w-[180px]">Picture Of Defective Symptom</th>
                      <th className="px-3 py-4 border-r border-slate-400 bg-[#0070C0] text-white min-w-[200px]">Factory batch No. picture (ODF No. )</th>
                      <th className="px-3 py-4 border-r border-slate-400 bg-[#0070C0] text-white min-w-[180px]">Picture Of O/C Serial Number</th>
                      <th className="px-3 py-4 border-r border-slate-400 bg-[#FFFF00] text-slate-900 min-w-[200px]">Remark</th>
                      <th className="px-3 py-4 border-r border-slate-400 bg-white text-slate-900 min-w-[100px]">date</th>
                      <th className="px-3 py-4 sticky right-0 bg-white border-l border-slate-300 shadow-[-4px_0_10px_rgba(0,0,0,0.05)] text-slate-400">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white text-center">
                    {filteredRequests.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors border-b border-slate-200 group">
                        <td className="px-2 py-3 border-r border-slate-200 font-bold">{r.id}</td>
                        <td className="px-2 py-3 border-r border-slate-200 font-bold">{r.customerCountry}</td>
                        <td className="px-2 py-3 border-r border-slate-200 font-bold">{r.customer}</td>
                        <td className="px-2 py-3 border-r border-slate-200 font-medium text-blue-600 italic">{r.source}</td>
                        <td className="px-2 py-3 border-r border-slate-200 font-black">{r.size}</td>
                        <td className="px-2 py-3 border-r border-slate-200">{r.odf}</td>
                        <td className="px-2 py-3 border-r border-slate-200 text-slate-400">{r.bom}</td>
                        <td className="px-2 py-3 border-r border-slate-200 font-bold">{r.brand}</td>
                        <td className="px-2 py-3 border-r border-slate-200 font-bold text-slate-700">{r.modelPN}</td>
                        <td className="px-2 py-3 border-r border-slate-200 font-black text-blue-800 uppercase">{r.defectDescription}</td>
                        <td className="px-2 py-3 border-r border-slate-200">{r.ver}</td>
                        <td className="px-2 py-3 border-r border-slate-200">{r.wc}</td>
                        <td className="px-2 py-3 border-r border-slate-200 font-bold bg-blue-50/50">{r.ocSerialNumber}</td>
                        <td className="px-2 py-3 border-r border-slate-200 text-[9px]">
                          {r.images.defectSymptom ? <img src={r.images.defectSymptom} className="h-10 mx-auto object-contain rounded border border-gray-100 shadow-sm" alt="Defect" /> : <span className="text-slate-300">EMPTY</span>}
                        </td>
                        <td className="px-2 py-3 border-r border-slate-200 text-[9px]">
                          {r.images.factoryBatch ? <img src={r.images.factoryBatch} className="h-10 mx-auto object-contain rounded border border-gray-100 shadow-sm" alt="Factory" /> : <span className="text-slate-300">EMPTY</span>}
                        </td>
                        <td className="px-2 py-3 border-r border-slate-200 text-[9px]">
                          {r.images.ocSerial ? <img src={r.images.ocSerial} className="h-10 mx-auto object-contain rounded border border-gray-100 shadow-sm" alt="Serial" /> : <span className="text-slate-300">EMPTY</span>}
                        </td>
                        <td className="px-2 py-3 border-r border-slate-200 text-left px-4 italic text-slate-500 max-w-xs truncate">{r.remark}</td>
                        <td className="px-2 py-3 border-r border-slate-200 font-bold">{r.date}</td>
                        <td className="px-2 py-3 sticky right-0 bg-white border-l border-slate-300 shadow-[-4px_0_10px_rgba(0,0,0,0.05)]">
                          <button 
                            onClick={() => handleReview(r)}
                            className="text-blue-600 hover:text-white hover:bg-blue-600 font-black uppercase text-[8px] tracking-widest px-2 py-1 border border-blue-600 rounded transition-all"
                          >
                            Review
                          </button>
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

      <footer className="mt-12 py-10 bg-slate-900 border-t border-slate-800">
        <div className="flex flex-col items-center">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">Precision Engineering Canvas System</p>
          <div className="flex items-center space-x-6 mt-4">
            <span className="text-[9px] text-slate-600 font-bold uppercase">System: 2.1.0-Release</span>
            <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
            <span className="text-[9px] text-slate-600 font-bold uppercase">Compliance: ISO 9001:2015</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
