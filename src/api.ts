export type WeatherTrigger = 'scheduled' | 'manual';

export type WeatherSnapshot = {
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

export type WelcomeResponse = {
  message: string;
};

function endpointUrl(name: string): string {
  const apiUrl = window.CRIBL_API_URL;
  const path = `/endpoints/${name}`;
  const url = `${apiUrl}${path}`;
  console.log('[endpointUrl] constructing backend invoke URL', {
    CRIBL_API_URL: apiUrl,
    name,
    path,
    url,
    CRIBL_BASE_PATH: window.CRIBL_BASE_PATH,
    CRIBL_APP_ID: window.CRIBL_APP_ID, // diagnostic only; not used in url
  });
  return url;
}

async function readError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const parsed = JSON.parse(text) as { message?: string; error?: string };
    return parsed.message ?? parsed.error ?? text ?? res.statusText;
  } catch {
    return text || res.statusText;
  }
}

export async function invokeWelcome(): Promise<WelcomeResponse> {
  console.log('[welcome] invoking Welcome to cribl Apps');
  const res = await fetch(endpointUrl('welcome'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ trigger: 'manual' }),
  });
  if (!res.ok) {
    throw new Error(await readError(res));
  }
  return (await res.json()) as WelcomeResponse;
}

export async function refreshWeather(): Promise<WeatherSnapshot> {
  console.log('[weather] manual refresh requested');
  const res = await fetch(endpointUrl('weather'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ trigger: 'manual' }),
  });
  if (!res.ok) {
    throw new Error(await readError(res));
  }
  return (await res.json()) as WeatherSnapshot;
}

export async function loadCachedWeather(): Promise<WeatherSnapshot | null> {
  const res = await fetch(`${window.CRIBL_API_URL}/kvstore/weather/san-francisco`);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(await readError(res));
  }
  const body: unknown = await res.json();
  if (body && typeof body === 'object' && 'temperatureC' in body) {
    return body as WeatherSnapshot;
  }
  if (body && typeof body === 'object' && 'value' in body) {
    const value = (body as { value: unknown }).value;
    if (typeof value === 'string') {
      return JSON.parse(value) as WeatherSnapshot;
    }
    if (value && typeof value === 'object') {
      return value as WeatherSnapshot;
    }
  }
  return null;
}
