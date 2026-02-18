import { GoogleGenAI, Type } from "@google/genai";

/**
 * Helper to handle potential markdown formatting in AI JSON responses.
 * Gemini sometimes wraps JSON in markdown blocks even when responseMimeType is set.
 */
function safeJsonParse(text: string | undefined) {
  if (!text) return {};
  try {
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse AI JSON response:", text);
    return {};
  }
}

/**
 * Validates and returns a fresh GoogleGenAI instance.
 * Instantiating inside the call ensures we pick up keys selected via window.aistudio.
 */
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Engine: Authentication Key Missing. Please set API_KEY in environment.");
  }
  return new GoogleGenAI({ apiKey });
};

const DEFAULT_MODEL = 'gemini-3-flash-preview';

export async function analyzeDefect(base64Image: string, prompt: string) {
  try {
    const ai = getClient();
    const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] } };
    const textPart = {
      text: `Analyze this defective electronic panel image and provide a professional technical description for an RMA record. 
             Focus on identifying specific visual artifacts: vertical/horizontal line clusters, spot clusters, or structural impact.
             User context: ${prompt}`
    };

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: { parts: [imagePart, textPart] },
    });

    return response.text || "No technical description generated.";
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
}

export async function detectDefectCategory(base64Image: string) {
  try {
    const ai = getClient();
    const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] } };
    const textPart = {
      text: `Analyze this electronic screen defect. Output EXACTLY one of these categories: Vertical Line, Horizontal Line, Vertical Bar, Horizontal Bar, Black Dot, Bright Dot, No Display, Abnormal Display. Output only the category name.`
    };

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: { parts: [imagePart, textPart] },
    });

    return response.text?.trim() || "Abnormal Display";
  } catch (error) {
    return "Abnormal Display";
  }
}

export interface OCDetails {
  ocSerialNumber: string;
  wc: string;
  modelPN: string;
  ver: string;
}

export async function extractOCDetailsFromImage(base64Image: string): Promise<OCDetails> {
  try {
    const ai = getClient();
    const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] } };
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: {
        parts: [
          imagePart,
          {
            text: `Extract technical specifications from this panel/OC label. 
            Prioritize scanning QR codes or Barcodes for the Serial Number.
            - ocSerialNumber: Typically 10-18 chars alphanumeric.
            - wc: 4-digit week code (e.g. 2415).
            - modelPN: Full model number or part number.
            - ver: Revision/Version (e.g. V1.1).
            Return as JSON.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ocSerialNumber: { type: Type.STRING },
            wc: { type: Type.STRING },
            modelPN: { type: Type.STRING },
            ver: { type: Type.STRING }
          },
          required: ["ocSerialNumber"]
        }
      }
    });

    return safeJsonParse(response.text) as OCDetails;
  } catch (error: any) {
    console.error("OC OCR Extraction failed", error);
    throw error;
  }
}

export async function extractDetailsFromFactoryLabel(base64Image: string) {
  try {
    const ai = getClient();
    const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] } };
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: {
        parts: [
          imagePart,
          {
            text: `Parse this Factory Batch/ODF label:
            - odf: ODF/PO alphanumeric number.
            - size: Diagonal screen size (e.g. 32", 65").
            - bom: Full Expressluck BOM string.
            Return as JSON.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            odf: { type: Type.STRING },
            size: { type: Type.STRING },
            bom: { type: Type.STRING }
          }
        }
      }
    });

    return safeJsonParse(response.text) as { odf: string; size: string; bom: string };
  } catch (error: any) {
    console.error("Factory Label OCR failed", error);
    throw error;
  }
}