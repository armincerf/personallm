import { config } from "./config.js";

interface GeminiResponse {
  summary?: string;
  choices?: Array<{
    message?: {
      content: string;
    };
  }>;
  error?: {
    message: string;
  };
}

export async function summarizeWithLLM(fullContext: string): Promise<string> {
  // Construct request payload
  const payload = {
    model: "gemini-2.5-pro",         // hypothetical model identifier
    prompt: fullContext,            // sending the entire context as the prompt
    max_tokens: 1000,               // expected max length of summary (adjust as needed)
    temperature: 0.2                // example parameter for a concise summary
  };
  try {
    const res = await fetch(config.geminiApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.geminiApiKey}`
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error(`LLM API error: ${res.status}`);
    }
    const data = await res.json() as GeminiResponse;
    
    // Handle error in response
    if (data.error) {
      throw new Error(`Gemini API error: ${data.error.message}`);
    }
    
    // Assuming the API returns the summary text in a field `summary` or similar.
    const summaryText = data.summary || 
                        data.choices?.[0]?.message?.content || 
                        "(No summary was generated)";
    
    return summaryText;
  } catch (err) {
    console.error("LLM summarization failed:", err);
    return "(LLM summarization error)";
  }
} 