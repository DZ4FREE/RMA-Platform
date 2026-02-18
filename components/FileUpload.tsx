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
        const MAX_WIDTH = 1200; // Increased for better OCR
        const MAX_HEIGHT = 1200;
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
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
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
        video: { facingMode: 'environment' } 
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
      ctx?.drawImage(videoRef.current, 0, 0);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      const compressedDataUrl = await compressImage(dataUrl);
      
      // Create a dummy file object
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
    <div className="flex flex-col space-y-2 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-400 transition-colors">
      <div className="flex justify-between items-center">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
        {!previewUrl && (
          <button 
            type="button"
            onClick={startCamera}
            className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-black hover:bg-blue-200 uppercase"
          >
            Scan Live
          </button>
        )}
      </div>

      <div 
        onPaste={handlePaste}
        tabIndex={0}
        className="relative group cursor-pointer border-2 border-dashed border-gray-300 rounded-md p-4 flex flex-col items-center justify-center min-h-[140px] hover:bg-blue-50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all"
      >
        {previewUrl ? (
          <div className="w-full h-full relative flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(id); }}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors z-20"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <img src={previewUrl} alt={label} className="w-full h-24 object-contain rounded" />
            <p className="mt-2 text-[10px] text-gray-400 text-center truncate w-full font-medium">Click to replace or Paste</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
            <span className="text-xs text-gray-400 font-medium">Drop label image or click</span>
            <span className="text-[9px] text-gray-300 uppercase mt-1">Ctrl+V Supported</span>
          </div>
        )}
        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleFileChange} />
      </div>

      {isCameraActive && (
        <div className="camera-overlay">
          <div className="relative w-full max-w-lg bg-black rounded-2xl overflow-hidden shadow-2xl m-4">
            <video ref={videoRef} autoPlay playsInline className="w-full h-auto" />
            
            {/* Camera Guide UI */}
            <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
              <div className="w-full h-full border-2 border-white/50 border-dashed rounded-lg flex items-center justify-center">
                <div className="w-64 h-32 border-2 border-blue-500 rounded-sm bg-blue-500/10"></div>
              </div>
            </div>

            <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center space-x-8 px-6">
              <button onClick={stopCamera} className="bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <button onClick={capturePhoto} className="w-16 h-16 bg-white rounded-full border-4 border-slate-300 flex items-center justify-center active:scale-95 transition-all">
                <div className="w-12 h-12 bg-white border-2 border-slate-900 rounded-full"></div>
              </button>
              <div className="w-12"></div> {/* Spacer */}
            </div>
            <p className="absolute top-4 left-0 right-0 text-center text-white text-xs font-black uppercase tracking-widest drop-shadow-md">Center the Label in the box</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;