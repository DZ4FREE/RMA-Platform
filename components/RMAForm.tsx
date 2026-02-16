
import React, { useState, useEffect } from 'react';
import { RMAStatus, RMARequest } from '../types';
import FileUpload from './FileUpload';
import { analyzeDefect, extractSerialNumberFromImage, extractDetailsFromFactoryLabel, detectDefectCategory } from '../services/geminiService';

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
  const [isScanningSN, setIsScanningSN] = useState(false);
  const [isScanningFactoryLabel, setIsScanningFactoryLabel] = useState(false);
  const [isDetectingDefect, setIsDetectingDefect] = useState(false);

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

    // Automatically detect defect type if defect symptom image is uploaded
    if (id === 'defectSymptom') {
      setIsDetectingDefect(true);
      try {
        const category = await detectDefectCategory(dataUrl);
        if (category) {
          setFormData(prev => ({ ...prev, defectDescription: category }));
        }
      } catch (err) {
        console.error("Failed to auto-detect defect:", err);
      } finally {
        setIsDetectingDefect(false);
      }
    }

    // Automatically scan Serial Number if the O/C Serial image is uploaded
    if (id === 'ocSerial') {
      setIsScanningSN(true);
      try {
        const extractedSN = await extractSerialNumberFromImage(dataUrl);
        if (extractedSN) {
          setFormData(prev => ({ ...prev, ocSerialNumber: extractedSN }));
        }
      } catch (err) {
        console.error("Failed to auto-scan serial number:", err);
      } finally {
        setIsScanningSN(false);
      }
    }

    // Automatically scan ODF and Size if the Factory Batch image is uploaded
    if (id === 'factoryBatch') {
      setIsScanningFactoryLabel(true);
      try {
        const details = await extractDetailsFromFactoryLabel(dataUrl);
        if (details) {
          setFormData(prev => ({ 
            ...prev, 
            odf: details.odf || prev.odf,
            size: details.size || prev.size
          }));
        }
      } catch (err) {
        console.error("Failed to auto-scan factory label details:", err);
      } finally {
        setIsScanningFactoryLabel(false);
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
    if (!images.defectSymptom) {
      alert("Please upload the 'Picture Of Defective Symptom' first for AI analysis.");
      return;
    }
    setIsAnalyzing(true);
    try {
      const suggestion = await analyzeDefect(images.defectSymptom, formData.defectDescription);
      // We append the professional description to the selected category if user wants
      setFormData(prev => ({ ...prev, remark: (prev.remark ? prev.remark + "\n" : "") + "AI Analysis: " + suggestion }));
      alert("Professional AI analysis added to Remarks section.");
    } catch (err) {
      alert("Failed to get AI suggestion. Check API key or connection.");
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
    <form onSubmit={handleSubmit} className="space-y-8 animate-fadeIn pb-12">
      {/* Visual Documentation Section */}
      <div className="bg-white rounded-xl shadow-sm border-t-4 border-t-blue-500 border border-gray-200 overflow-hidden">
        <div className="bg-blue-50 px-6 py-4 flex items-center justify-between border-b border-gray-200">
          <h2 className="text-lg font-bold text-blue-900 flex items-center uppercase tracking-wider">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Visual Evidence (Required)
          </h2>
          <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">EXCEL COL 14-16</span>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <FileUpload label="Picture Of Defective Symptom" id="defectSymptom" onFileChange={handleImageChange} onDelete={handleImageDelete} previewUrl={images.defectSymptom} />
          <FileUpload label="Factory Batch No. / ODF No." id="factoryBatch" onFileChange={handleImageChange} onDelete={handleImageDelete} previewUrl={images.factoryBatch} />
          <FileUpload label="Picture Of O/C Serial Number" id="ocSerial" onFileChange={handleImageChange} onDelete={handleImageDelete} previewUrl={images.ocSerial} />
        </div>
      </div>

      {/* Main Form Fields Section */}
      <div className="bg-white rounded-xl shadow-sm border-t-4 border-t-amber-400 border border-gray-200 overflow-hidden">
        <div className="bg-amber-50 px-6 py-4 flex items-center justify-between border-b border-gray-200">
          <h2 className="text-lg font-bold text-amber-900 flex items-center uppercase tracking-wider">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Case Metadata
          </h2>
          <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded">EXCEL COL 2-13</span>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-5">
          {/* Customer Group - Non-Editable */}
          <div className="md:col-span-2 lg:col-span-1">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Customer Country</label>
            <input 
              readOnly 
              name="customerCountry" 
              value={formData.customerCountry} 
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed outline-none text-sm font-semibold select-none" 
            />
          </div>
          <div className="md:col-span-2 lg:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Customer Name</label>
            <input 
              readOnly 
              name="customer" 
              value={formData.customer} 
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed outline-none text-sm font-semibold select-none" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
            <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 outline-none text-sm" />
          </div>

          {/* Product Logistics */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Source (Market/Factory)</label>
            <select name="source" value={formData.source} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 outline-none text-sm">
              <option value="">Select Source</option>
              <option value="Market">From Market</option>
              <option value="Factory">From Factory</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Size</label>
            <div className="relative">
              <input 
                name="size" 
                value={formData.size} 
                onChange={handleChange} 
                className={`w-full px-3 py-2 border ${isScanningFactoryLabel ? 'border-blue-400 bg-blue-50' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-amber-500 outline-none text-sm font-bold`} 
                placeholder={isScanningFactoryLabel ? "Scanning..." : 'e.g. 65"'} 
              />
              {isScanningFactoryLabel && (
                <div className="absolute right-3 top-2 flex items-center">
                  <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
            </div>
          </div>
          <div className="md:col-span-2 lg:col-span-1 relative">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ODF</label>
            <div className="relative">
              <input 
                name="odf" 
                value={formData.odf} 
                onChange={handleChange} 
                className={`w-full px-3 py-2 border ${isScanningFactoryLabel ? 'border-blue-400 bg-blue-50' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-amber-500 outline-none text-sm font-mono`} 
                placeholder={isScanningFactoryLabel ? "Extracting..." : "ODF Number"} 
              />
              {isScanningFactoryLabel && (
                <div className="absolute right-3 top-2 flex items-center">
                  <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Expressluck BOM</label>
            <input name="bom" value={formData.bom} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 outline-none text-sm" />
          </div>

          {/* Identification */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Brand</label>
            <input name="brand" value={formData.brand} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 outline-none text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Model P/N (Panel Part No)</label>
            <input required name="modelPN" value={formData.modelPN} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ver.</label>
            <input name="ver" value={formData.ver} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">W/C (Week/Cycle)</label>
            <input name="wc" value={formData.wc} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 outline-none text-sm" />
          </div>
          <div className="md:col-span-2 relative">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">OC Serial Number</label>
            <div className="relative">
              <input 
                required 
                name="ocSerialNumber" 
                value={formData.ocSerialNumber} 
                onChange={handleChange} 
                className={`w-full px-3 py-2 border ${isScanningSN ? 'border-blue-400 bg-blue-50' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-amber-500 outline-none text-sm font-mono transition-colors`}
                placeholder={isScanningSN ? "Scanning Label..." : "Enter or auto-scan S/N"}
              />
              {isScanningSN && (
                <div className="absolute right-3 top-2 flex items-center">
                   <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Description and Remarks */}
          <div className="md:col-span-4">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-gray-500 uppercase">Defect Description</label>
              <div className="flex space-x-2 items-center">
                {isDetectingDefect && (
                  <span className="text-[10px] font-bold text-blue-600 animate-pulse uppercase">🤖 Auto-Detecting...</span>
                )}
                <button 
                  type="button"
                  onClick={handleAISuggestion}
                  disabled={isAnalyzing}
                  className="text-[10px] flex items-center bg-blue-600 text-white px-3 py-1 rounded shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors uppercase font-bold"
                >
                  {isAnalyzing ? "Analyzing..." : "✨ Detailed AI Analysis"}
                </button>
              </div>
            </div>
            <select 
              required
              name="defectDescription"
              value={formData.defectDescription}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${isDetectingDefect ? 'border-blue-400 bg-blue-50' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-amber-500 outline-none text-sm font-semibold transition-colors`}
            >
              <option value="">Select Defect Category</option>
              {DEFECT_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
              <option value="Other">Other (See Remarks)</option>
            </select>
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Remark</label>
            <textarea 
              name="remark"
              rows={4}
              value={formData.remark}
              onChange={handleChange}
              placeholder="Internal notes or detailed technical findings from AI..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 outline-none text-sm bg-yellow-50/30"
            />
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-4 border-t border-gray-200">
          <button 
            type="button" 
            onClick={onCancel}
            className="px-6 py-2 text-sm text-gray-600 font-bold rounded hover:bg-gray-200 transition-colors uppercase tracking-wide"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="px-10 py-2 bg-blue-600 text-white font-black rounded shadow-lg hover:bg-blue-700 transform hover:-translate-y-0.5 active:translate-y-0 transition-all uppercase tracking-widest text-sm"
          >
            {initialData ? 'Update Record' : 'Save RMA Record'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default RMAForm;
