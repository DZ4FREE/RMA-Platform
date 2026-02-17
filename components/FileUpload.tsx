
import React, { useRef } from 'react';

interface FileUploadProps {
  label: string;
  id: string;
  onFileChange: (id: string, file: File, dataUrl: string) => void;
  onDelete: (id: string) => void;
  previewUrl?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ label, id, onFileChange, onDelete, previewUrl }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const compressImage = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
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
        
        // Compress to JPEG with 0.6 quality to significantly reduce size
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = dataUrl;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    processFile(file);
    e.target.value = '';
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

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            processFile(blob);
          }
        }
      }
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(id);
  };

  return (
    <div className="flex flex-col space-y-2 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-400 transition-colors">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
      <div 
        ref={containerRef}
        onPaste={handlePaste}
        tabIndex={0}
        className="relative group cursor-pointer border-2 border-dashed border-gray-300 rounded-md p-4 flex flex-col items-center justify-center min-h-[140px] hover:bg-blue-50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all"
      >
        {previewUrl ? (
          <div className="w-full h-full relative flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={handleDelete}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors z-20"
              title="Remove image"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img src={previewUrl} alt={label} className="w-full h-24 object-contain rounded" />
            <p className="mt-2 text-[10px] text-gray-400 text-center truncate w-full font-medium">Click to change or Paste (Ctrl+V)</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="text-xs text-gray-400 font-medium">Choose file or Paste</span>
            <span className="text-[9px] text-gray-300 uppercase mt-1">Ctrl+V Supported</span>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};

export default FileUpload;
