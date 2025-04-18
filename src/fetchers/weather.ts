import { config } from "../config.js";

interface OpenMeteoCurrent {
  temperature: number;
  windspeed: number;
  weathercode: number;
}

interface OpenMeteoDaily {
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum?: number[];
}

interface OpenMeteoResponse {
  current_weather?: OpenMeteoCurrent;
  daily?: OpenMeteoDaily;
}

export async function fetchWeather(): Promise<string> {
  const { latitude, longitude, useDaily, useCurrent } = config.weather;
  // Construct API URL
  let url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=auto`;
  if (useCurrent) url += "&current_weather=true";
  if (useDaily) url += "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum";
  
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json() as OpenMeteoResponse;
    const parts: string[] = [];

    if (useCurrent && data.current_weather) {
      const cw = data.current_weather;
      parts.push(`Current: ${cw.temperature}°C, wind ${cw.windspeed} km/h`);
    }
    if (useDaily && data.daily) {
      // Assuming daily arrays with at least one entry (today)
      const d = data.daily;
      if (d.temperature_2m_max && d.temperature_2m_min) {
        parts.push(`Today: high ${d.temperature_2m_max[0]}°C, low ${d.temperature_2m_min[0]}°C`);
      }
      if (d.precipitation_sum) {
        const precip = d.precipitation_sum[0];
        if (precip > 0) {
          parts.push(`precipitation: ${precip} mm`);
        }
      }
    }
    return parts.length ? `Weather: ${parts.join(", ")}` : "";
  } catch (err) {
    console.error("Weather fetch error:", err);
    return "";
  }
} 