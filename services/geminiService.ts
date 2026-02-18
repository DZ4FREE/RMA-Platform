import { GoogleGenAI, Type } from "@google/genai";

// Helper to handle potential markdown formatting in AI JSON responses
function safeJsonParse(text: string | undefined) {
  if (!text) return {};
  try {
    // Remove markdown code blocks if they exist (Gemini sometimes adds them even in JSON mode)
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse AI JSON response:", text);
    return {};
  }
}

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please add 'API_KEY' to your Netlify Environment Variables.");
  }
  return new GoogleGenAI({ apiKey });
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
  } catch (error) {
    console.error("Gemini Error:", error);
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
            IMPORTANT: Look for QR codes or BARCODES first. The serial number is usually the string decoded from these or printed immediately above/below them.
            1. OC Serial Number: typically 10-20 alphanumeric chars (e.g. TA..., 150..., SE...).
            2. W/C: a 4-digit code (e.g. 2405).
            3. Model P/N: The specific panel model (e.g. ST3151A07).
            4. Ver: The version string (e.g. Ver.2.9, Rev:01).
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
    throw new Error(error.message || "Extraction failed");
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
            text: `Extract from Factory/Master Label:
            1. ODF/PO Number (e.g. IDL2507002).
            2. Screen Size (e.g. 65").
            3. Expressluck BOM (usually a long number string).
            Return JSON.`
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
    throw new Error(error.message || "Extraction failed");
  }
}