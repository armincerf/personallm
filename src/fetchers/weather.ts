import { config } from "../config.js";

export async function fetchWeather(): Promise<string> {
	const { latitude, longitude } = config.weather;
	// Construct API URL
	const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=auto&daily=precipitation_probability_max,temperature_2m_max,temperature_2m_min,sunset,sunshine_duration,uv_index_max,precipitation_hours,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max&hourly=temperature_2m,precipitation_probability,precipitation,rain,showers,cloud_cover,wind_speed_10m,temperature_80m`;
	try {
		const res = await fetch(url);
		if (!res.ok) {
			throw new Error(`HTTP ${res.status}`);
		}
		// Get raw JSON
		const json = await res.json();
		return JSON.stringify(json);
	} catch (err) {
		console.error("Weather fetch error:", err);
		return "";
	}
}
