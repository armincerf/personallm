import {
	describe,
	it,
	expect,
	vi,
	beforeEach,
	afterEach,
	type Mock,
} from "vitest";

// Define a minimal shape of what the fetch mock and its response look like
interface MockFetchResponse {
	ok: boolean;
	status?: number;
	json: () => Promise<unknown>;
}

type FetchFn = (url: string, init?: RequestInit) => Promise<MockFetchResponse>;


type MockFetch = Mock<FetchFn>;

function createWeatherFetcher(mockFetch: MockFetch) {
	return async function fetchWeather(): Promise<string> {
		const config = {
			weather: {
				latitude: 51.5,
				longitude: -0.13,
				useDaily: true,
				useCurrent: true,
			},
		};

		const { latitude, longitude, useDaily, useCurrent } = config.weather;
		let url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=auto`;
		if (useCurrent) url += "&current_weather=true";
		if (useDaily)
			url += "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum";

		try {
			const res = await mockFetch(url);
			if (!res.ok) {
				throw new Error(`HTTP ${res.status}`);
			}
			const data = (await res.json()) as {
				current_weather?: { temperature: number; windspeed: number };
				daily?: {
					temperature_2m_max: number[];
					temperature_2m_min: number[];
					precipitation_sum?: number[];
				};
			};
			const parts: string[] = [];

			if (useCurrent && data.current_weather) {
				const cw = data.current_weather as {
					temperature: number;
					windspeed: number;
				};
				parts.push(`Current: ${cw.temperature}°C, wind ${cw.windspeed} km/h`);
			}
			if (useDaily && data.daily) {
				const d = data.daily as {
					temperature_2m_max: number[];
					temperature_2m_min: number[];
					precipitation_sum?: number[];
				};
				if (d.temperature_2m_max?.length && d.temperature_2m_min?.length) {
					parts.push(
						`Today: high ${d.temperature_2m_max[0]}°C, low ${d.temperature_2m_min[0]}°C`,
					);
				}
				if (d.precipitation_sum && d.precipitation_sum[0] > 0) {
					parts.push(`precipitation: ${d.precipitation_sum[0]} mm`);
				}
			}
			return parts.length ? `Weather: ${parts.join(", ")}` : "";
		} catch (err) {
			console.error("Weather fetch error:", err);
			return "";
		}
	};
}

describe("Weather fetcher tests", () => {
	let mockFetch: MockFetch;
	let mockResponse: MockFetchResponse;
	let fetchWeather: () => Promise<string>;

	beforeEach(() => {
		// Create a fresh mock implementation for each test
		mockResponse = {
			ok: true,
			status: 200,
			json: vi.fn().mockResolvedValue({}),
		};
		mockFetch = vi.fn().mockResolvedValue(mockResponse);
		fetchWeather = createWeatherFetcher(mockFetch);

		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should fetch weather data and format it correctly", async () => {
		const mockData = {
			current_weather: { temperature: 18.5, windspeed: 10.2, weathercode: 0 },
			daily: {
				temperature_2m_max: [22.5],
				temperature_2m_min: [15.2],
				precipitation_sum: [0],
			},
		};
		mockResponse.json = vi.fn().mockResolvedValueOnce(mockData);

		const result = await fetchWeather();

		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.open-meteo.com/v1/forecast?latitude=51.5&longitude=-0.13&timezone=auto&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_sum",
		);
		expect(result).toBe(
			"Weather: Current: 18.5°C, wind 10.2 km/h, Today: high 22.5°C, low 15.2°C",
		);
	});

	it("should include precipitation when present", async () => {
		const mockData = {
			current_weather: { temperature: 20, windspeed: 5, weathercode: 61 },
			daily: {
				temperature_2m_max: [25],
				temperature_2m_min: [12],
				precipitation_sum: [3],
			},
		};
		mockResponse.json = vi.fn().mockResolvedValueOnce(mockData);

		const result = await fetchWeather();

		expect(result).toBe(
			"Weather: Current: 20°C, wind 5 km/h, Today: high 25°C, low 12°C, precipitation: 3 mm",
		);
	});

	it("should return empty string on network error", async () => {
		mockFetch.mockRejectedValueOnce(new Error("Network failure"));

		const result = await fetchWeather();
		expect(result).toBe("");
		expect(console.error).toHaveBeenCalled();
	});

	it("should return empty string on non-OK response", async () => {
		mockResponse.ok = false;
		mockResponse.status = 404;

		const result = await fetchWeather();
		expect(result).toBe("");
		expect(console.error).toHaveBeenCalled();
	});
});
