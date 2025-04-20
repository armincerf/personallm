import { Database } from "bun:sqlite";
import { config } from "../config/index.js";
import {
	APPLE_EPOCH_OFFSET,
	appleToDate,
	detectNanoseconds,
} from "../utils/apple-timestamps.js";

const FORTNIGHT_SEC = 14 * 24 * 60 * 60;
const MAX_ROWS = 20;

export function fetchIMessage(): string {
	if (!config.enableIMessage || !config.iMessageDbPath) return "";

	try {
		const db = new Database(config.iMessageDbPath, { readonly: true });

		/* ---- Detect nanoseconds vs seconds ---- */
		const avgResult = db
			.query("SELECT AVG(date) AS avg FROM message LIMIT 10")
			.get() as { avg: bigint | null } | undefined;

		// Guard against null or undefined result
		const avgValue = avgResult?.avg ?? null;
		const isNanoseconds = detectNanoseconds(avgValue);

		// Using SQL parameter and calculation when possible to avoid JS number limitations
		const sinceSql = isNanoseconds
			? `
				SELECT (((strftime('%s', 'now') - ${FORTNIGHT_SEC} - ${APPLE_EPOCH_OFFSET}) * 1000000000))
			`
			: `
				SELECT (strftime('%s', 'now') - ${FORTNIGHT_SEC} - ${APPLE_EPOCH_OFFSET})
			`;

		const sinceDateResult = db.query(sinceSql).get() as [bigint] | undefined;
		const since = sinceDateResult ? sinceDateResult[0] : BigInt(0);

		const placeholders = config.iMessageChatsToRead.map(() => "?").join(",");
		const sql = `
			SELECT c.chat_identifier, m.text, m.is_from_me, m.date
			FROM chat AS c
			JOIN chat_message_join AS cmj ON cmj.chat_id = c.ROWID
			JOIN message AS m          ON m.ROWID     = cmj.message_id
			WHERE c.chat_identifier IN (${placeholders})
				AND m.date > ?
			ORDER BY m.date DESC
			LIMIT ${MAX_ROWS * config.iMessageChatsToRead.length};
		`;

		const rows = db
			.query(sql)
			.all(...config.iMessageChatsToRead, since) as Array<{
			chat_identifier: string;
			text: string | null;
			is_from_me: 0 | 1;
			date: bigint;
		}>;

		db.close();

		if (!rows.length) return "";

		const grouped: Record<string, string[]> = {};
		for (const r of rows) {
			const msg = r.text ?? "[(attachment or empty)]";
			const dir = r.is_from_me ? "→" : "←";
			const ts = appleToDate(r.date, isNanoseconds).toLocaleString("en-GB");
			grouped[r.chat_identifier] ??= [];
			grouped[r.chat_identifier].push(`* ${ts} ${dir} ${msg}`);
		}

		const sections = Object.entries(grouped).map(
			([chat, lines]) =>
				`iMessage (${chat}):\n${lines.slice(0, MAX_ROWS).join("\n")}`,
		);

		return sections.join("\n\n");
	} catch (err) {
		console.error("iMessage fetch error:", err);
		return "";
	}
}
