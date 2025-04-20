type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

export function createLogger(options: { namespace?: string } = {}) {
	const namespace = options.namespace ? `[${options.namespace}] ` : "";
	const configuredLevel =
		(process.env["LOG_LEVEL"]?.toLowerCase() as LogLevel) || "info";
	const minLevel = LOG_LEVELS[configuredLevel] || LOG_LEVELS.info;

	function shouldLog(level: LogLevel): boolean {
		return LOG_LEVELS[level] >= minLevel;
	}

	function formatMessage(level: LogLevel, message: string): string {
		const timestamp = new Date().toISOString();
		return `${timestamp} ${level.toUpperCase()} ${namespace}${message}`;
	}

	function log(level: LogLevel, message: string, ...args: unknown[]): void {
		if (!shouldLog(level)) return;

		const argsStr = args.length
			? args
					.map((arg) =>
						arg instanceof Error
							? `${arg.name}: ${arg.message}`
							: JSON.stringify(arg),
					)
					.join(" ")
			: "";

		const logMessage = formatMessage(level, `${message} ${argsStr}`.trim());

		// Use Bun.write for stdout for optimal performance
		Bun.write(Bun.stdout, `${logMessage}\n`);
	}

	return {
		debug: (message: string, ...args: unknown[]) =>
			log("debug", message, ...args),
		info: (message: string, ...args: unknown[]) =>
			log("info", message, ...args),
		warn: (message: string, ...args: unknown[]) =>
			log("warn", message, ...args),
		error: (message: string, ...args: unknown[]) =>
			log("error", message, ...args),
	};
}

export const logger = createLogger();
