import { GoogleGenAI, Type } from "@google/genai";

// Helper to handle potential markdown formatting in AI JSON responses
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

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  // If API_KEY is missing, we initialize with empty string and rely on the UI 
  // to handle key selection via window.aistudio if needed.
  return new GoogleGenAI({ apiKey: apiKey || "" });
};

export async function analyzeDefect(base64Image: string, prompt: string) {
  try {
    const ai = getAIClient();
    const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] } };
    const textPart = {
      text: `Analyze this defective electronic panel image and provide a professional technical description for an RMA. 
             Focus on patterns like vertical/horizontal lines, spot defects, or physical cracks.
             User context: ${prompt}`
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [imagePart, textPart] },
    });

    return response.text || "No description generated.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error.message?.includes("API key")) {
      throw new Error("Gemini API Key missing. Please set API_KEY in Netlify Environment Variables.");
    }
    throw error;
  }
}

export async function detectDefectCategory(base64Image: string) {
  try {
    const ai = getAIClient();
    const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] } };
    const textPart = {
      text: `Identify the primary defect category in this screen. Options: Vertical Line, Horizontal Line, Vertical Bar, Horizontal Bar, Black Dot, Bright Dot, No Display, Abnormal Display. Return ONLY the category name.`
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
    const ai = getAIClient();
    const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] } };
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          imagePart,
          {
            text: `Extract details from this PANEL/OC label. 
            SCANNING GUIDELINE: Look for any Barcodes or QR codes. The encoded data in the QR/Barcode is the most accurate OC Serial Number.
            1. OC Serial Number: typically 10-20 alphanumeric characters.
            2. W/C: a 4-digit week/code (e.g. 2405).
            3. Model P/N: The specific panel model number.
            4. Ver: Version/Revision string.
            Return valid JSON.`
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
          }
        }
      }
    });

    return safeJsonParse(response.text) as OCDetails;
  } catch (error: any) {
    console.error("OC Extraction failed", error);
    throw new Error(error.message?.includes("API key") ? "API Key Missing" : "OC Label could not be read. Please try a clearer photo.");
  }
}

export async function extractDetailsFromFactoryLabel(base64Image: string) {
  try {
    const ai = getAIClient();
    const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] } };
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          imagePart,
          {
            text: `Extract data from this Factory Batch Label:
            1. ODF/PO Number: alphanumeric code (e.g. IDL2507002).
            2. Size: Screen size in inches (e.g. 65").
            3. Expressluck BOM: Long sequence of numbers identifying the assembly.
            If data is in a QR code, decode the QR code first. Return valid JSON.`
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
    console.error("Factory Extraction failed", error);
    throw new Error(error.message?.includes("API key") ? "API Key Missing" : "Factory label unreadable. Please focus and re-capture.");
  }
}