import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { summarizeWithLLM } from "../src/llmClient.js";

const skipTests = true;
const describeIf = skipTests ? describe.skip : describe;

// --- Test Suite ---
describeIf("LLM Client Integration Tests", () => {
	beforeEach(() => {
		// No need to reset mocks since we're using the real API
	});

	afterEach(() => {
		// No cleanup needed
	});

	test("should generate a summary using the Gemini API", async () => {
		// Simple context to summarize
		const testContext = `
		The weather today is sunny with a high of 75°F.
		You have a meeting with Alex at 2 PM.
		There were 7,500 steps taken yesterday.
		Top news: New climate agreement signed by 150 countries.
		`;

		// Call the actual LLM function
		const result = await summarizeWithLLM(testContext);

		// Verify we got a non-empty result
		expect(result).toBeTruthy();
		expect(typeof result).toBe("string");
		expect(result.length).toBeGreaterThan(10);

		// Verify it's not an error message
		expect(result).not.toBe("(LLM summarization error)");
		expect(result).not.toBe("(No summary was generated)");

		// The result should contain some of the key information from the input
		// but exact content verification is difficult with LLMs
		console.log("Generated summary:", result);
	}, 15000); // Increased timeout for API call

	test("should handle empty input gracefully", async () => {
		// Empty context
		const result = await summarizeWithLLM("");

		// Should still return some kind of response, not an error
		expect(result).toBeTruthy();
		expect(typeof result).toBe("string");
	}, 15000);

	test("should handle invalid input format gracefully", async () => {
		// Deliberately malformed context that might confuse the model
		const badContext = "<<<>>>```JSON ERROR```<<<>>>";

		// Function should not throw but return a valid string
		const result = await summarizeWithLLM(badContext);
		expect(typeof result).toBe("string");
	}, 15000);
});
