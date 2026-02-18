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
      setScanStatus('Identifying Defect...');
      try {
        const category = await detectDefectCategory(dataUrl);
        setFormData(prev => ({ ...prev, defectDescription: category }));
      } finally {
        setIsDetectingDefect(false);
        setScanStatus('');
      }
    }

    if (id === 'ocSerial') {
      setIsScanningOC(true);
      setScanStatus('Decoding OC Label & Serial...');
      try {
        const details = await extractOCDetailsFromImage(dataUrl);
        setFormData(prev => ({ 
          ...prev, 
          ocSerialNumber: details.ocSerialNumber || prev.ocSerialNumber,
          wc: details.wc || prev.wc,
          modelPN: details.modelPN || prev.modelPN,
          ver: details.ver || prev.ver
        }));
      } catch (err) {
        alert("Smart Scan failed to extract details. Please enter manually.");
      } finally {
        setIsScanningOC(false);
        setScanStatus('');
      }
    }

    if (id === 'factoryBatch') {
      setIsScanningFactoryLabel(true);
      setScanStatus('Scanning Factory Batch & BOM...');
      try {
        const details = await extractDetailsFromFactoryLabel(dataUrl);
        setFormData(prev => ({ 
          ...prev, 
          odf: details.odf || prev.odf,
          size: details.size || prev.size,
          bom: details.bom || prev.bom
        }));
      } catch (err) {
        alert("Failed to auto-scan factory label.");
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
      setFormData(prev => ({ ...prev, remark: (prev.remark ? prev.remark + "\n" : "") + "AI Analysis: " + suggestion }));
    } catch (err) {
      alert("AI analysis failed.");
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
        <div className="fixed bottom-10 right-10 bg-blue-600 text-white px-6 py-4 rounded-2xl shadow-2xl z-[1000] flex items-center space-x-4 animate-bounce">
          <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="font-black text-sm uppercase tracking-widest">{scanStatus}</span>
        </div>
      )}

      {/* Visual Documentation Section */}
      <div className="bg-white rounded-xl shadow-sm border-t-4 border-t-blue-500 border border-gray-200 overflow-hidden">
        <div className="bg-blue-50 px-6 py-4 flex items-center justify-between border-b border-gray-200">
          <h2 className="text-lg font-bold text-blue-900 flex items-center uppercase tracking-wider">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
            Smart Visual Capture
          </h2>
          <div className="flex space-x-2">
            <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">AI AUTO-SCAN ACTIVE</span>
          </div>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <FileUpload label="Defect Symptom" id="defectSymptom" onFileChange={handleImageChange} onDelete={handleImageDelete} previewUrl={images.defectSymptom} />
          <FileUpload label="Factory Label / ODF" id="factoryBatch" onFileChange={handleImageChange} onDelete={handleImageDelete} previewUrl={images.factoryBatch} />
          <FileUpload label="Panel OC Label (SN/QR)" id="ocSerial" onFileChange={handleImageChange} onDelete={handleImageDelete} previewUrl={images.ocSerial} />
        </div>
      </div>

      {/* Main Form Fields Section */}
      <div className="bg-white rounded-xl shadow-sm border-t-4 border-t-amber-400 border border-gray-200 overflow-hidden">
        <div className="bg-amber-50 px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-amber-900 flex items-center uppercase tracking-wider">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Case Metadata (Auto-populated)
          </h2>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-5">
          <div className="md:col-span-2 lg:col-span-1">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Country</label>
            <input readOnly value={formData.customerCountry} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 outline-none text-sm font-semibold" />
          </div>
          <div className="md:col-span-2 lg:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Customer</label>
            <input readOnly value={formData.customer} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 outline-none text-sm font-semibold" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
            <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none text-sm" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Source</label>
            <select name="source" value={formData.source} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none text-sm font-bold">
              <option value="">Select</option>
              <option value="Market">Market</option>
              <option value="Factory">Factory</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Size</label>
            <input name="size" value={formData.size} onChange={handleChange} className={`w-full px-3 py-2 border rounded-md outline-none text-sm font-bold ${isScanningFactoryLabel ? 'border-blue-500 bg-blue-50 animate-pulse' : 'border-gray-300'}`} />
          </div>
          <div className="md:col-span-2 lg:col-span-1">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ODF / PO</label>
            <input name="odf" value={formData.odf} onChange={handleChange} className={`w-full px-3 py-2 border rounded-md outline-none text-sm font-mono ${isScanningFactoryLabel ? 'border-blue-500 bg-blue-50 animate-pulse' : 'border-gray-300'}`} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">BOM</label>
            <input name="bom" value={formData.bom} onChange={handleChange} className={`w-full px-3 py-2 border rounded-md outline-none text-sm font-mono ${isScanningFactoryLabel ? 'border-blue-500 bg-blue-50 animate-pulse' : 'border-gray-300'}`} />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Brand</label>
            <input name="brand" value={formData.brand} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Model P/N</label>
            <input name="modelPN" value={formData.modelPN} onChange={handleChange} className={`w-full px-3 py-2 border rounded-md outline-none text-sm font-semibold ${isScanningOC ? 'border-blue-500 bg-blue-50 animate-pulse' : 'border-gray-300'}`} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ver.</label>
            <input name="ver" value={formData.ver} onChange={handleChange} className={`w-full px-3 py-2 border rounded-md outline-none text-sm font-bold ${isScanningOC ? 'border-blue-500 bg-blue-50 animate-pulse' : 'border-gray-300'}`} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">W/C</label>
            <input name="wc" value={formData.wc} onChange={handleChange} className={`w-full px-3 py-2 border rounded-md outline-none text-sm font-bold ${isScanningOC ? 'border-blue-500 bg-blue-50 animate-pulse' : 'border-gray-300'}`} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">OC Serial Number</label>
            <input required name="ocSerialNumber" value={formData.ocSerialNumber} onChange={handleChange} className={`w-full px-3 py-2 border rounded-md outline-none text-sm font-mono ${isScanningOC ? 'border-blue-500 bg-blue-50 animate-pulse' : 'border-gray-300'}`} />
          </div>

          <div className="md:col-span-4">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-gray-500 uppercase">Defect Description</label>
              <button type="button" onClick={handleAISuggestion} disabled={isAnalyzing || !images.defectSymptom} className="text-[10px] bg-blue-600 text-white px-3 py-1 rounded shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors uppercase font-bold">
                {isAnalyzing ? "Analyzing..." : "✨ Technical AI Analysis"}
              </button>
            </div>
            <select required name="defectDescription" value={formData.defectDescription} onChange={handleChange} className={`w-full px-3 py-2 border rounded-md outline-none text-sm font-semibold ${isDetectingDefect ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}>
              <option value="">Select Category</option>
              {DEFECT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Remarks & Findings</label>
            <textarea name="remark" rows={4} value={formData.remark} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none text-sm bg-slate-50" />
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-4 flex justify-end space-x-4 border-t border-gray-200">
          <button type="button" onClick={onCancel} className="px-6 py-2 text-sm text-gray-600 font-bold hover:bg-gray-200 rounded transition-colors uppercase">Cancel</button>
          <button type="submit" className="px-10 py-2 bg-blue-700 text-white font-black rounded shadow-lg hover:bg-blue-800 transition-all uppercase tracking-widest text-sm">Save Entry</button>
        </div>
      </div>
    </form>
  );
};

export default RMAForm;