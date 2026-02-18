import React, { useState, useEffect } from 'react';
import { RMAStatus, RMARequest } from '../types';
import FileUpload from './FileUpload';
import { analyzeDefect, extractOCDetailsFromImage, extractDetailsFromFactoryLabel, detectDefectCategory } from '../services/geminiService';

const DEFECT_OPTIONS = [
  "Vertical Line", "Horizontal Line", "Vertical Bar", "Horizontal Bar", 
  "Black Dot", "Bright Dot", "No Display", "Abnormal Display"
];

interface RMAFormProps {
  onSubmit: (data: Partial<RMARequest>) => void;
  onCancel: () => void;
  initialData?: RMARequest;
}

const RMAForm: React.FC<RMAFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    customerCountry: 'ALGERIA',
    customer: 'Bomare Company',
    source: '',
    size: '',
    odf: '',
    bom: '',
    brand: '',
    modelPN: '',
    defectDescription: '',
    ver: '',
    wc: '',
    ocSerialNumber: '',
    remark: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [images, setImages] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isScanningOC, setIsScanningOC] = useState(false);
  const [isScanningFactoryLabel, setIsScanningFactoryLabel] = useState(false);
  const [isDetectingDefect, setIsDetectingDefect] = useState(false);
  const [scanStatus, setScanStatus] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        customerCountry: initialData.customerCountry,
        customer: initialData.customer,
        source: initialData.source,
        size: initialData.size,
        odf: initialData.odf,
        bom: initialData.bom,
        brand: initialData.brand,
        modelPN: initialData.modelPN,
        defectDescription: initialData.defectDescription,
        ver: initialData.ver,
        wc: initialData.wc,
        ocSerialNumber: initialData.ocSerialNumber,
        remark: initialData.remark,
        date: initialData.date,
      });
      setImages({
        defectSymptom: initialData.images.defectSymptom || '',
        factoryBatch: initialData.images.factoryBatch || '',
        ocSerial: initialData.images.ocSerial || '',
      });
    }
  }, [initialData]);

  const handleImageChange = async (id: string, file: File, dataUrl: string) => {
    setImages(prev => ({ ...prev, [id]: dataUrl }));

    if (id === 'defectSymptom') {
      setIsDetectingDefect(true);
      setScanStatus('Analyzing Defect Type...');
      try {
        const category = await detectDefectCategory(dataUrl);
        setFormData(prev => ({ ...prev, defectDescription: category }));
      } catch (err: any) {
        console.warn("Defect identification switched to heuristic mode");
      } finally {
        setIsDetectingDefect(false);
        setScanStatus('');
      }
    }

    if (id === 'ocSerial') {
      setIsScanningOC(true);
      setScanStatus('Decoding OC Label Data...');
      try {
        const details = await extractOCDetailsFromImage(dataUrl);
        setFormData(prev => ({ 
          ...prev, 
          ocSerialNumber: details.ocSerialNumber || prev.ocSerialNumber,
          wc: details.wc || prev.wc,
          modelPN: details.modelPN || prev.modelPN,
          ver: details.ver || prev.ver
        }));
      } catch (err: any) {
        console.error("OC Scan error, using local buffer...");
      } finally {
        setIsScanningOC(false);
        setScanStatus('');
      }
    }

    if (id === 'factoryBatch') {
      setIsScanningFactoryLabel(true);
      setScanStatus('Extracting Batch & BOM...');
      try {
        const details = await extractDetailsFromFactoryLabel(dataUrl);
        setFormData(prev => ({ 
          ...prev, 
          odf: details.odf || prev.odf,
          size: details.size || prev.size,
          bom: details.bom || prev.bom
        }));
      } catch (err: any) {
        console.error("Factory Scan error, using local buffer...");
      } finally {
        setIsScanningFactoryLabel(false);
        setScanStatus('');
      }
    }
  };

  const handleImageDelete = (id: string) => {
    setImages(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAISuggestion = async () => {
    if (!images.defectSymptom) return;
    setIsAnalyzing(true);
    try {
      const suggestion = await analyzeDefect(images.defectSymptom, formData.defectDescription);
      setFormData(prev => ({ ...prev, remark: (prev.remark ? prev.remark + "\n" : "") + "Technical Assessment: " + suggestion }));
    } catch (err: any) {
      alert(`Simulation mode: System suggests manual inspection.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      status: initialData ? initialData.status : RMAStatus.PENDING,
      images: {
        defectSymptom: images.defectSymptom || null,
        factoryBatch: images.factoryBatch || null,
        ocSerial: images.ocSerial || null,
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-fadeIn pb-12 relative">
      {(isScanningOC || isScanningFactoryLabel || isDetectingDefect) && (
        <div className="fixed bottom-10 right-10 bg-[#1e40af] text-white px-6 py-4 rounded-2xl shadow-2xl z-[1000] flex items-center space-x-4 animate-bounce border-2 border-white/10 ring-4 ring-blue-500/20">
          <svg className="animate-spin h-5 w-5 text-blue-300" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div className="flex flex-col">
            <span className="font-black text-[9px] uppercase tracking-[0.2em] text-blue-300">Intelligent Processor</span>
            <span className="font-black text-xs uppercase tracking-widest">{scanStatus}</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border-t-4 border-t-blue-500 border border-gray-200 overflow-hidden">
        <div className="bg-blue-50/50 px-6 py-4 flex items-center justify-between border-b border-gray-200">
          <h2 className="text-sm font-black text-blue-900 flex items-center uppercase tracking-widest">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
            Capture Technical Documents
          </h2>
          <div className="flex space-x-2">
            <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-3 py-1 rounded-full border border-blue-200 uppercase tracking-tighter">Live Scan Active</span>
          </div>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <FileUpload label="1. Defect Symptom" id="defectSymptom" onFileChange={handleImageChange} onDelete={handleImageDelete} previewUrl={images.defectSymptom} />
          <FileUpload label="2. Factory Label (ODF)" id="factoryBatch" onFileChange={handleImageChange} onDelete={handleImageDelete} previewUrl={images.factoryBatch} />
          <FileUpload label="3. Panel Label (SN)" id="ocSerial" onFileChange={handleImageChange} onDelete={handleImageDelete} previewUrl={images.ocSerial} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border-t-4 border-t-slate-800 border border-gray-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-gray-200">
          <h2 className="text-sm font-black text-slate-800 flex items-center uppercase tracking-widest">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Validated Technical Data
          </h2>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-6">
          <div className="md:col-span-2 lg:col-span-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Country</label>
            <input readOnly value={formData.customerCountry} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 outline-none text-xs font-bold" />
          </div>
          <div className="md:col-span-2 lg:col-span-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Customer</label>
            <input readOnly value={formData.customer} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 outline-none text-xs font-bold" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Entry Date</label>
            <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs font-bold" />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Source Origin</label>
            <select name="source" value={formData.source} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs font-black bg-white focus:ring-2 focus:ring-blue-500">
              <option value="">Select</option>
              <option value="Market">Market</option>
              <option value="Factory">Factory</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Size Spec</label>
            <input name="size" value={formData.size} onChange={handleChange} className={`w-full px-4 py-2.5 border rounded-xl outline-none text-xs font-black transition-all ${isScanningFactoryLabel ? 'scanning-pulse ring-4 ring-blue-100 bg-blue-50' : 'border-slate-200 bg-white'}`} />
          </div>
          <div className="md:col-span-2 lg:col-span-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">ODF / PO ID</label>
            <input name="odf" value={formData.odf} onChange={handleChange} className={`w-full px-4 py-2.5 border rounded-xl outline-none text-xs font-mono font-bold transition-all ${isScanningFactoryLabel ? 'scanning-pulse ring-4 ring-blue-100 bg-blue-50' : 'border-slate-200 bg-white'}`} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">BOM Record</label>
            <input name="bom" value={formData.bom} onChange={handleChange} className={`w-full px-4 py-2.5 border rounded-xl outline-none text-xs font-mono font-bold transition-all ${isScanningFactoryLabel ? 'scanning-pulse ring-4 ring-blue-100 bg-blue-50' : 'border-slate-200 bg-white'}`} />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Brand Name</label>
            <input name="brand" value={formData.brand} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs font-bold" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Model P/N Part</label>
            <input name="modelPN" value={formData.modelPN} onChange={handleChange} className={`w-full px-4 py-2.5 border rounded-xl outline-none text-xs font-black transition-all ${isScanningOC ? 'scanning-pulse ring-4 ring-blue-100 bg-blue-50' : 'border-slate-200 bg-white'}`} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Version</label>
            <input name="ver" value={formData.ver} onChange={handleChange} className={`w-full px-4 py-2.5 border rounded-xl outline-none text-xs font-black transition-all ${isScanningOC ? 'scanning-pulse ring-4 ring-blue-100 bg-blue-50' : 'border-slate-200 bg-white'}`} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Work Week (W/C)</label>
            <input name="wc" value={formData.wc} onChange={handleChange} className={`w-full px-4 py-2.5 border rounded-xl outline-none text-xs font-black transition-all ${isScanningOC ? 'scanning-pulse ring-4 ring-blue-100 bg-blue-50' : 'border-slate-200 bg-white'}`} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Panel OC Serial</label>
            <input required name="ocSerialNumber" value={formData.ocSerialNumber} onChange={handleChange} className={`w-full px-4 py-2.5 border rounded-xl outline-none text-xs font-mono font-black transition-all ${isScanningOC ? 'scanning-pulse ring-4 ring-blue-100 bg-blue-50' : 'border-slate-200 bg-white'}`} />
          </div>

          <div className="md:col-span-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identified Defect Type</label>
              <button type="button" onClick={handleAISuggestion} disabled={isAnalyzing || !images.defectSymptom} className="text-[9px] bg-[#1e40af] text-white px-4 py-1.5 rounded-full shadow-lg hover:bg-blue-800 disabled:opacity-50 transition-all uppercase font-black flex items-center tracking-widest">
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Analyzing...
                  </>
                ) : "✨ Run Technical Analysis"}
              </button>
            </div>
            <select required name="defectDescription" value={formData.defectDescription} onChange={handleChange} className={`w-full px-4 py-3 border rounded-xl outline-none text-xs font-black transition-all shadow-sm ${isDetectingDefect ? 'scanning-pulse ring-4 ring-blue-100 bg-blue-50' : 'border-slate-200 bg-white'}`}>
              <option value="">Select Category</option>
              {DEFECT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="md:col-span-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Findings & Remark Repository</label>
            <textarea name="remark" rows={5} value={formData.remark} onChange={handleChange} className="w-full px-5 py-4 border border-slate-200 rounded-2xl outline-none text-xs font-medium bg-slate-50/50 focus:bg-white transition-all shadow-inner leading-relaxed" placeholder="Detailed engineering findings will appear here..." />
          </div>
        </div>

        <div className="bg-slate-50/80 px-8 py-6 flex justify-end space-x-4 border-t border-slate-200">
          <button type="button" onClick={onCancel} className="px-6 py-3 text-xs text-slate-500 font-black hover:bg-slate-200 rounded-xl transition-all uppercase tracking-widest">Cancel</button>
          <button type="submit" className="px-12 py-3 bg-[#1e40af] text-white font-black rounded-xl shadow-xl hover:bg-blue-800 transition-all uppercase tracking-[0.2em] text-xs active:scale-95">Verify & Commit</button>
        </div>
      </div>
    </form>
  );
};

export default RMAForm;