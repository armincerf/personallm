import { describe, it, expect } from "vitest";
import { fetchIMessage } from "../../../src/fetchers/imessage.js";
import { config } from "../../../src/config.js";
import { existsSync } from "node:fs";

const skip =
	!config.enableIMessage ||
	!config.iMessageDbPath ||
	!existsSync(config.iMessageDbPath);
const describeIf = skip ? describe.skip : describe;

describeIf("iMessage Fetcher Reachability", () => {
	it("fetches recent messages without crashing", () => {
		let err: unknown = null;
		let res: string | undefined;
		try {
			res = fetchIMessage();
		} catch (e) {
			err = e;
		}
		expect(err).toBeNull();
		expect(typeof res).toBe("string");
	});
});
