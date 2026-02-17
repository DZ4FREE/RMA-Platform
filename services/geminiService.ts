
import { GoogleGenAI, Type } from "@google/genai";

const PREDEFINED_DEFECTS = [
  "Vertical Line", "Horizontal Line", "Vertical Bar", "Horizontal Bar",
  "Black Dot", "Bright Dot", "No Display", "Abnormal Display"
];

export async function analyzeDefect(base64Image: string, prompt: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image.split(',')[1],
      },
    };

    const textPart = {
      text: `Analyze this defective electronic panel image and provide a professional, technical "Defect Description" for an RMA claim. 
             Focus on visible patterns, cracks, discolorations, or structural failures. Keep it concise. Current user notes: ${prompt}`
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [imagePart, textPart] },
    });

    return response.text || "No description generated.";
  } catch (error) {
    console.error("Error calling Gemini API for defect analysis:", error);
    throw error;
  }
}

export async function detectDefectCategory(base64Image: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image.split(',')[1],
      },
    };

    const textPart = {
      text: `Look at this electronic display defect. Categorize it into EXACTLY ONE of the following types: 
             ${PREDEFINED_DEFECTS.join(", ")}. 
             If it doesn't clearly fit one, choose the closest match or "Abnormal Display". 
             Return ONLY the category name string.`
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [imagePart, textPart] },
    });

    const category = response.text?.trim() || "";
    // Validate that the returned category is in our list
    const matched = PREDEFINED_DEFECTS.find(d => category.toLowerCase().includes(d.toLowerCase()));
    return matched || "Abnormal Display";
  } catch (error) {
    console.error("Error calling Gemini API for defect categorization:", error);
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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image.split(',')[1],
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          imagePart,
          {
            text: `Look at this panel label image and extract the following 4 specific values:
            1. The primary OC Serial Number. This is typically a long alphanumeric string near a barcode or QR code (e.g., 'TA5144...', '1500258...', '0MF2L9...').
            2. The W/C (Week/Cycle), usually a 4-digit code (e.g., '2505').
            3. The Model P/N (Panel Part No). Examples: 'ST3151A07-2', 'CV500U5-L04', 'V430DJ2-Q01'.
            4. The Ver. (Version or Revision). Examples: 'Ver.2.9', 'Rev: 02', 'P2'.
            Return ONLY a valid JSON object with keys: ocSerialNumber, wc, modelPN, ver.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ocSerialNumber: { type: Type.STRING, description: "The extracted OC Serial Number" },
            wc: { type: Type.STRING, description: "The extracted Week/Cycle code" },
            modelPN: { type: Type.STRING, description: "The extracted Model P/N" },
            ver: { type: Type.STRING, description: "The extracted Version/Revision code" }
          },
          required: ["ocSerialNumber", "wc", "modelPN", "ver"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result as OCDetails;
  } catch (error) {
    console.error("Error calling Gemini API for OC detail extraction:", error);
    return { ocSerialNumber: "", wc: "", modelPN: "", ver: "" };
  }
}

export async function extractDetailsFromFactoryLabel(base64Image: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image.split(',')[1],
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          imagePart,
          {
            text: `Look at this factory label image:
            1. Find the ODF Number or P/O Number. It is usually a string like 'TS2501-291' or 'IDL2507002'.
            2. Identify the Screen Size. Look for model codes like 'CX320...', 'LVU430...'. The digits after the prefix (like '32' in 'CX320') indicate the size.
            3. Find the Expressluck BOM. It is a specific alphanumeric string, often located at the bottom of the label, e.g., '2300132VA1Z01510'.
            Return the results as a JSON object with 'odf', 'size', and 'bom' keys.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            odf: { type: Type.STRING, description: "The extracted ODF/P/O Number" },
            size: { type: Type.STRING, description: "The extracted screen size (e.g., '32\"')" },
            bom: { type: Type.STRING, description: "The extracted Expressluck BOM string" }
          },
          required: ["odf", "size", "bom"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result as { odf: string; size: string; bom: string };
  } catch (error) {
    console.error("Error calling Gemini API for factory label extraction:", error);
    return { odf: "", size: "", bom: "" };
  }
}
