import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Spinner, Text } from '@capra/core';
import { AppsOutlined, ReloadOutlined } from '@capra/icons';
import { invokeWelcome, loadCachedWeather, refreshWeather, type WeatherSnapshot } from '../api';

function formatFetchedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

function formatTemp(celsius: number | null): string {
  if (celsius == null) return '—';
  const fahrenheit = (celsius * 9) / 5 + 32;
  return `${Math.round(celsius)}°C / ${Math.round(fahrenheit)}°F`;
}

export function HomePage() {
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const [welcomeError, setWelcomeError] = useState<string | null>(null);
  const [welcomePending, setWelcomePending] = useState(false);

  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherPending, setWeatherPending] = useState(false);
  const [weatherLoadingCache, setWeatherLoadingCache] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadCachedWeather()
      .then((cached) => {
        if (!cancelled) setWeather(cached);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setWeatherError(err instanceof Error ? err.message : 'Failed to load cached weather');
        }
      })
      .finally(() => {
        if (!cancelled) setWeatherLoadingCache(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onWelcome = useCallback(async () => {
    setWelcomePending(true);
    setWelcomeError(null);
    try {
      const result = await invokeWelcome();
      setWelcomeMessage(result.message);
    } catch (err: unknown) {
      setWelcomeError(err instanceof Error ? err.message : 'Welcome request failed');
    } finally {
      setWelcomePending(false);
    }
  }, []);

  const onRefreshWeather = useCallback(async () => {
    setWeatherPending(true);
    setWeatherError(null);
    try {
      const snapshot = await refreshWeather();
      setWeather(snapshot);
    } catch (err: unknown) {
      setWeatherError(err instanceof Error ? err.message : 'Weather refresh failed');
    } finally {
      setWeatherPending(false);
    }
  }, []);

  return (
    <div className="page">
      <div className="page-intro">
        <Text as="h1" variant="heading">
          Cribl Apps weather
        </Text>
        <Text>
          Invoke the welcome backend function, or pull San Francisco weather from Open-Meteo. Weather also runs on an
          hourly schedule — use refresh if you do not want to wait.
        </Text>
      </div>

      <div className="card-grid">
        <Card>
          <Card.Header>
            <Card.Title>Welcome</Card.Title>
            <Card.Description>Calls the welcome backend function.</Card.Description>
            <Card.Action>
              <Button
                variant="primary"
                leadingIcon={AppsOutlined}
                pending={welcomePending}
                onClick={() => {
                  void onWelcome();
                }}
              >
                Welcome to cribl Apps
              </Button>
            </Card.Action>
          </Card.Header>
          <Card.Content>
            {welcomeError && (
              <Alert appearance="danger" title="Welcome failed">
                {welcomeError}
              </Alert>
            )}
            {!welcomeError && welcomeMessage && (
              <Alert appearance="success" title="Backend response">
                {welcomeMessage}
              </Alert>
            )}
            {!welcomeError && !welcomeMessage && (
              <Text>Push the button to invoke the function. Check the console for a run log.</Text>
            )}
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>San Francisco weather</Card.Title>
            <Card.Description>Hourly schedule, with a manual refresh.</Card.Description>
            <Card.Action>
              <Button
                variant="secondary"
                leadingIcon={ReloadOutlined}
                pending={weatherPending}
                onClick={() => {
                  void onRefreshWeather();
                }}
              >
                Refresh weather
              </Button>
            </Card.Action>
          </Card.Header>
          <Card.Content>
            {weatherError && (
              <Alert appearance="danger" title="Weather failed">
                {weatherError}
              </Alert>
            )}
            {weatherLoadingCache && !weather && !weatherError && (
              <Spinner size="md" title="Loading last weather snapshot" />
            )}
            {weather && (
              <div className="weather-stats">
                <Text as="p" variant="heading">
                  {formatTemp(weather.temperatureC)}
                </Text>
                <Text>{weather.description}</Text>
                <Text>
                  Humidity {weather.humidityPercent ?? '—'}% · Wind {weather.windSpeedKmh ?? '—'} km/h
                </Text>
                <Text>
                  Last run {formatFetchedAt(weather.fetchedAt)} ({weather.trigger})
                </Text>
              </div>
            )}
            {!weatherLoadingCache && !weather && !weatherError && (
              <Text>
                No snapshot yet. Wait for the hourly schedule, or refresh now. Both paths log to the console when they
                run.
              </Text>
            )}
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
