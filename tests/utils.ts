export function log(message: string, context?: Record<string, unknown>) {
	Bun.write(Bun.stdout, `${message}\n ${JSON.stringify(context)}\n`);
}
