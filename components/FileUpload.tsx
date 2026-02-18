import React, { useRef, useState } from 'react';

interface FileUploadProps {
  label: string;
  id: string;
  onFileChange: (id: string, file: File, dataUrl: string) => void;
  onDelete: (id: string) => void;
  previewUrl?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ label, id, onFileChange, onDelete, previewUrl }) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const compressImage = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // High resolution for barcode scanning accuracy
        const MAX_WIDTH = 1600; 
        const MAX_HEIGHT = 1600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
        }
        // Use high quality JPEG for OCR readability
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.src = dataUrl;
    });
  };

  const processFile = (file: File | undefined) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const originalDataUrl = reader.result as string;
        const compressedDataUrl = await compressImage(originalDataUrl);
        onFileChange(id, file, compressedDataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      alert("Could not access camera. Please ensure permissions are granted.");
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = async () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(videoRef.current, 0, 0);
      }
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const compressedDataUrl = await compressImage(dataUrl);
      
      const blob = await (await fetch(compressedDataUrl)).blob();
      const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      onFileChange(id, file, compressedDataUrl);
      stopCamera();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    processFile(file);
    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) processFile(blob);
        }
      }
    }
  };

  return (
    <div className="flex flex-col space-y-2 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-400 transition-colors shadow-sm">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
        {!previewUrl && (
          <button 
            type="button"
            onClick={startCamera}
            className="text-[10px] bg-blue-600 text-white px-3 py-1 rounded-full font-black hover:bg-blue-700 uppercase transition-all shadow-sm"
          >
            Open Scanner
          </button>
        )}
      </div>

      <div 
        onPaste={handlePaste}
        tabIndex={0}
        className="relative group cursor-pointer border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center min-h-[160px] hover:bg-blue-50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all bg-slate-50/50"
      >
        {previewUrl ? (
          <div className="w-full h-full relative flex flex-col items-center justify-center animate-fadeIn">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(id); }}
              className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full p-1.5 shadow-xl hover:bg-red-700 transition-colors z-20 border-2 border-white"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <img src={previewUrl} alt={label} className="w-full h-28 object-contain rounded-lg shadow-sm" />
            <p className="mt-3 text-[10px] text-slate-400 text-center truncate w-full font-black uppercase tracking-widest">Update Photo</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-3 border border-slate-100 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
            </div>
            <span className="text-xs text-slate-500 font-bold">Select Photo</span>
            <span className="text-[9px] text-slate-400 uppercase mt-1 tracking-widest">Drag & Drop or Paste</span>
          </div>
        )}
        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleFileChange} />
      </div>

      {isCameraActive && (
        <div className="camera-overlay">
          <div className="relative w-full max-w-2xl bg-black rounded-3xl overflow-hidden shadow-2xl m-4 border-4 border-slate-800">
            <video ref={videoRef} autoPlay playsInline className="w-full h-auto" />
            
            <div className="absolute inset-0 border-[60px] border-black/40 pointer-events-none">
              <div className="w-full h-full border-2 border-blue-400 border-dashed rounded-2xl flex items-center justify-center relative">
                <div className="w-80 h-40 border-2 border-white rounded-lg bg-white/5 shadow-[0_0_50px_rgba(255,255,255,0.2)]"></div>
                <div className="absolute top-4 left-0 right-0 text-center">
                   <span className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg">Align Barcode / QR here</span>
                </div>
              </div>
            </div>

            <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center space-x-12 px-6">
              <button onClick={stopCamera} className="bg-white/10 hover:bg-white/20 text-white p-4 rounded-full transition-colors backdrop-blur-md border border-white/20">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <button onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full border-8 border-slate-500/30 flex items-center justify-center active:scale-90 transition-all shadow-2xl">
                <div className="w-14 h-14 bg-white border-4 border-slate-900 rounded-full"></div>
              </button>
              <div className="w-14"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;