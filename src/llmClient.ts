import { GoogleGenAI } from "@google/genai";
import { config } from "./config/index.js";

// Initialize the SDK client
const genAI = new GoogleGenAI({ apiKey: config.geminiApiKey });

export async function summarizeWithLLM(
	fullContext: string,
	prompt = config.prompt,
): Promise<string> {
	try {
		// Make the API call using the SDK
		const result = await genAI.models.generateContent({
			model: config.geminiModelName,
			contents: [
				{ role: "user", parts: [{ text: prompt }] },
				{ role: "user", parts: [{ text: fullContext }] },
			],
		});

		// Extract the text from the first candidate's content using optional chaining
		const summaryText = result.candidates?.[0]?.content?.parts?.[0]?.text;

		if (!summaryText) {
			console.warn("LLM response text was empty or in unexpected format.");
			return "(No summary was generated)";
		}

		return summaryText;
	} catch (err) {
		// Log the specific error from the SDK or network failure
		console.error("LLM summarization failed:", err);
		// You might want to check err type for more specific messages
		if (err instanceof Error) {
			console.error("Error Details:", err.message);
		}
		return "(LLM summarization error)";
	}
}
