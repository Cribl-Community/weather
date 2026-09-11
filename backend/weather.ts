const SF_LATITUDE = 37.7749;
const SF_LONGITUDE = -122.4194;
const WEATHER_KV_KEY = 'weather/san-francisco';
const FORECAST_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=37.7749&longitude=-122.4194&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=America/Los_Angeles';

type WeatherTrigger = 'scheduled' | 'manual';

type WeatherSnapshot = {
  fetchedAt: string;
  trigger: WeatherTrigger;
  location: string;
  latitude: number;
  longitude: number;
  temperatureC: number | null;
  humidityPercent: number | null;
  windSpeedKmh: number | null;
  weatherCode: number | null;
  description: string;
};

type OpenMeteoCurrent = {
  temperature_2m?: number;
  relative_humidity_2m?: number;
  weather_code?: number;
  wind_speed_10m?: number;
};

function weatherDescription(code: number | null): string {
  if (code == null) return 'Unknown conditions';
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 85 && code <= 86) return 'Snow showers';
  if (code >= 95) return 'Thunderstorm';
  return `Weather code ${code}`;
}

async function resolveTrigger(request: Request): Promise<WeatherTrigger> {
  try {
    const text = await request.text();
    if (!text) return 'manual';
    const body = JSON.parse(text) as { scheduleId?: unknown; trigger?: unknown };
    if (typeof body.scheduleId === 'string' || body.trigger === 'scheduled') {
      return 'scheduled';
    }
  } catch {
    // Scheduled POSTs may include a body we cannot parse; treat as manual only when explicit.
  }
  return 'manual';
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Fetches San Francisco weather from Open-Meteo. Used by the hourly schedule and the UI refresh button.
 */
export async function onRequest(request: Request, context: { appId: string }): Promise<Response> {
  const trigger = await resolveTrigger(request);
  console.log('[weather] running', { trigger, at: new Date().toISOString() });

  const forecastRes = await fetch(FORECAST_URL);
  if (!forecastRes.ok) {
    const detail = await forecastRes.text();
    console.log('[weather] Open-Meteo request failed', { status: forecastRes.status, detail });
    return new Response(JSON.stringify({ error: 'Failed to fetch weather', detail }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }

  const forecast = (await forecastRes.json()) as { current?: OpenMeteoCurrent };
  const current = forecast.current ?? {};
  const weatherCode = asNumber(current.weather_code);
  const snapshot: WeatherSnapshot = {
    fetchedAt: new Date().toISOString(),
    trigger,
    location: 'San Francisco',
    latitude: SF_LATITUDE,
    longitude: SF_LONGITUDE,
    temperatureC: asNumber(current.temperature_2m),
    humidityPercent: asNumber(current.relative_humidity_2m),
    windSpeedKmh: asNumber(current.wind_speed_10m),
    weatherCode,
    description: weatherDescription(weatherCode),
  };

  const kvRes = await fetch(`/api/v1/a/${context.appId}/kvstore/${WEATHER_KV_KEY}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(snapshot),
  });
  if (!kvRes.ok) {
    console.log('[weather] failed to cache snapshot', { status: kvRes.status });
  }

  return new Response(JSON.stringify(snapshot), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
