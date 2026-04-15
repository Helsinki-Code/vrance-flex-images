import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ImageGenerationParams {
  prompt: string;
  aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" | "1:4" | "1:8" | "4:1" | "8:1";
  imageSize?: "512px" | "1K" | "2K" | "4K";
  model?: string;
}

export async function generateImage({
  prompt,
  aspectRatio = "16:9",
  imageSize = "1K",
  model = "gemini-2.5-flash-image"
}: ImageGenerationParams): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio,
          imageSize,
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    throw new Error("No image data returned from Gemini");
  } catch (error) {
    console.error("Image generation failed:", error);
    throw error;
  }
}
