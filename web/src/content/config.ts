import { defineCollection, z } from "astro:content";

const summaries = defineCollection({
	schema: z.object({
		date: z.coerce.date(),
		index: z.number().optional().default(1),
		title: z.string().optional(),
		contextFile: z.string().optional(),
	}),
});

export const collections = {
	summaries,
};
