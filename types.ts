
export enum RMAStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSING = 'PROCESSING'
}

export interface RMARequest {
  id: string; // Maps to "NO"
  date: string; // Maps to "date"
  createdAt: string; // System timestamp
  status: RMAStatus;
  
  // Excel Fields
  customerCountry: string;
  customer: string;
  source: string; // "From Market or Factory"
  size: string;
  odf: string;
  bom: string; // "EXPRESSLUCK BOM"
  brand: string;
  modelPN: string; // "Model P/N(Panel Part No)"
  defectDescription: string;
  ver: string;
  wc: string; // "W/C"
  ocSerialNumber: string;
  remark: string;

  // Images mapping to the blue headers in Excel
  images: {
    defectSymptom: string | null; // "Picture Of Defective Symptom"
    factoryBatch: string | null; // "Factory batch No. picture (ODF No.)"
    ocSerial: string | null; // "Picture Of O/C Serial Number"
  };
}
