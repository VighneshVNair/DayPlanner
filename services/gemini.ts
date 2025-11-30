
import { GoogleGenAI, Type } from "@google/genai";
import { Task } from "../types";

const getClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.warn("API_KEY not found in environment variables");
        return null;
    }
    return new GoogleGenAI({ apiKey });
};

interface AIResponse {
    tasks: Partial<Task>[];
}

export const parseNaturalLanguagePlan = async (input: string, baseTime: number): Promise<AIResponse> => {
    const ai = getClient();
    if (!ai) return { tasks: [] };

    const nowStr = new Date(baseTime).toLocaleTimeString();

    const prompt = `
    I am a day planner. The current time is ${nowStr}.
    The user description is: "${input}".
    
    Return a JSON object with:
    1. "tasks": Array of tasks. Each has 'title' (string), 'duration' (number minutes), 'notes' (string).
    
    Estimate durations if not specified.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        tasks: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    duration: { type: Type.NUMBER },
                                    notes: { type: Type.STRING }
                                },
                                required: ["title", "duration"]
                            }
                        }
                    }
                }
            }
        });

        const result = JSON.parse(response.text || "{}");
        return {
            tasks: result.tasks || []
        };

    } catch (error) {
        console.error("Gemini API Error:", error);
        return { tasks: [] };
    }
};
