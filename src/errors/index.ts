export class AppError extends Error {
	code: string;

	constructor(message: string, code = "APP_ERROR") {
		super(message);
		this.name = this.constructor.name;
		this.code = code;
	}
}

export class ConfigError extends AppError {
	constructor(message: string, code = "CONFIG_ERROR") {
		super(message, code);
	}
}

export class FetcherError extends AppError {
	fetcherName: string;

	constructor(message: string, fetcherName: string, code = "FETCHER_ERROR") {
		super(message, code);
		this.fetcherName = fetcherName;
	}
}

export class LLMError extends AppError {
	model: string | undefined;

	constructor(message: string, model?: string, code = "LLM_ERROR") {
		super(message, code);
		this.model = model;
	}
}

export class DatabaseError extends AppError {
	dbPath: string | undefined;

	constructor(message: string, dbPath?: string, code = "DATABASE_ERROR") {
		super(message, code);
		this.dbPath = dbPath;
	}
}

export class NetworkError extends AppError {
	url: string | undefined;

	constructor(message: string, url?: string, code = "NETWORK_ERROR") {
		super(message, code);
		this.url = url;
	}
}
