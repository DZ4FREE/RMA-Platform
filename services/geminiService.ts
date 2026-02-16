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

export async function extractSerialNumberFromImage(base64Image: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image.split(',')[1],
      },
    };

    const textPart = {
      text: "Look at this label image. Find the primary Serial Number, typically associated with the main barcode (e.g., strings like '80879768B...' or 'CEN430250...'). Return ONLY the alphanumeric serial number string. Do not include labels like 'S/N' or 'Serial'. If not found, return an empty string."
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [imagePart, textPart] },
    });

    return response.text?.trim() || "";
  } catch (error) {
    console.error("Error calling Gemini API for serial number extraction:", error);
    throw error;
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
            text: `Look at this label image:
            1. Find the ODF Number or Batch Number. It is usually annotated/highlighted with a light blue box (e.g., 'IDL2507002' or 'TS2501-271').
            2. Identify the Screen Size. Look for model codes like 'CX430...', 'LVU430...', 'M8-43...'. The digits '43' typically indicate a 43-inch size. Common sizes are 32, 40, 43, 50, 55, 65, 75, 85.
            Return the results as a JSON object with 'odf' and 'size' keys.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            odf: { type: Type.STRING, description: "The extracted ODF/Batch Number" },
            size: { type: Type.STRING, description: "The extracted screen size (e.g., '43\"')" }
          },
          required: ["odf", "size"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result as { odf: string; size: string };
  } catch (error) {
    console.error("Error calling Gemini API for factory label extraction:", error);
    throw { odf: "", size: "" };
  }
}
