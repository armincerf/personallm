import { z } from "zod";

// Configuration schema with validation for paths
export const ConfigSchema = z
	.object({
		intervalMinutes: z.number().int().positive(),
		prompt: z.string(),
		healthDataDir: z.string().optional(),
		transcriptsDbPath: z.string().optional(),
		screenTimeDbPath: z.string().optional(),
		iMessageDbPath: z.string().optional(),
		weather: z.object({
			latitude: z.number(),
			longitude: z.number(),
		}),
		news: z.object({
			rssFeeds: z.array(z.string().url()),
			includeHackerNews: z.boolean(),
			subreddits: z.array(z.string()),
			numTopPosts: z.number().int().nonnegative(),
		}),
		geminiModelName: z.string(),
		geminiApiKey: z.string().min(1, { message: "GEMINI_API_KEY is required" }),
		outputCsvPath: z.string(),
		enableScreenTime: z.boolean(),
		enableMail: z.boolean(),
		enableCalendar: z.boolean(),
		enableCalendarIcalBuddy: z.boolean(),
		enableHealth: z.boolean(),
		enableTranscripts: z.boolean(),
		enableIMessage: z.boolean(),
		iMessageChatsToRead: z.array(z.string()),
	})
	.refine(
		(data) => {
			// Validate that paths are provided when features are enabled
			if (data.enableHealth && !data.healthDataDir) return false;
			if (data.enableTranscripts && !data.transcriptsDbPath) return false;
			if (data.enableScreenTime && !data.screenTimeDbPath) return false;
			if (data.enableIMessage && !data.iMessageDbPath) return false;
			return true;
		},
		{
			message: "Paths must be provided for enabled features",
			path: ["paths"], // This will show up in the error message
		},
	);
export type Config = z.infer<typeof ConfigSchema>;

// Health data schemas
export const HealthRecordSchema = z.object({
	date: z.string(),
	steps: z.number().optional(),
	calories: z.number().optional(),
	heartRate: z.number().optional(),
});
export const HealthDataSchema = z.union([
	HealthRecordSchema,
	z.array(HealthRecordSchema),
]);

// LLM response schema
export const GeminiResponseSchema = z.object({
	summary: z.string().optional(),
	choices: z
		.array(z.object({ message: z.object({ content: z.string() }) }))
		.optional(),
	error: z.object({ message: z.string() }).optional(),
});

// Hacker News API schema
export const HackerNewsResponseSchema = z.object({
	hits: z.array(
		z.object({
			title: z.string(),
			url: z.string().url().optional(),
			objectID: z.string(),
		}),
	),
});

// Reddit API schema
export const RedditResponseSchema = z.object({
	data: z
		.object({
			children: z.array(
				z.object({
					data: z.object({
						title: z.string(),
						permalink: z.string(),
					}),
				}),
			),
		})
		.optional(),
});
// Transcript row schema
export const TranscriptRowSchema = z.object({
	content: z.string(),
});

// App usage schema for Screen Time
export const AppUsageSchema = z.object({
	appBundle: z.string(),
	totalSeconds: z.number(),
});
