import React, { useEffect, useState } from 'react';
import { api } from '../api';

const ADVICE_STYLE = {
  high: { border: 'stat-alert', icon: '🔥' },
  moderate: { border: 'stat-sales', icon: '☀️' },
  low: { border: '', icon: '🌤️' }
};

export default function InsightsPage() {
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(null);
  const [suggestions, setSuggestions] = useState(null);

  useEffect(() => {
    api.get('/insights/weather').then(setWeather).catch(e => setWeatherError(e.message));
    api.get('/insights/purchase-suggestions').then(setSuggestions).catch(() => setSuggestions(null));
  }, []);

  return (
    <div>
      <h3 style={{ marginBottom: 16 }}>Insights</h3>

      <div className="card">
        <h4 style={{ marginTop: 0 }}>🌦️ Weather & Demand</h4>
        {weatherError && <p style={{ color: 'var(--chocolate)' }}>Couldn't load weather right now — check your internet connection.</p>}
        {weather && (
          <div>
            {weather.advice && (
              <div className={`stat-card ${ADVICE_STYLE[weather.advice.level]?.border || ''}`} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 15 }}>{ADVICE_STYLE[weather.advice.level]?.icon} {weather.advice.message}</div>
              </div>
            )}
            <div className="row" style={{ gap: 12 }}>
              {weather.days.map(d => (
                <div key={d.date} className="card" style={{ flex: 1, minWidth: 140, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--chocolate)' }}>{d.date}</div>
                  <div style={{ fontFamily: 'Baloo 2', fontSize: 22, fontWeight: 700 }}>{d.max_temp}°C</div>
                  <div style={{ fontSize: 12, color: 'var(--chocolate)' }}>Low {d.min_temp}°C</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {!weather && !weatherError && <p>Loading forecast...</p>}
      </div>

      <div className="card">
        <h4 style={{ marginTop: 0 }}>📦 Suggested Purchases</h4>
        <p style={{ fontSize: 13, color: 'var(--chocolate)', marginTop: -8 }}>
          Based on raw materials at or below their reorder level, and your average consumption over the last 14 days.
        </p>
        {suggestions && suggestions.suggestions.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Raw Material</th><th>Current Stock</th><th>Avg Daily Use</th><th>Days Left</th><th>Suggested Order</th><th>Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.suggestions.map(s => (
                <tr key={s.raw_material_id}>
                  <td>{s.name}</td>
                  <td>{s.current_stock.toFixed(2)} {s.unit}</td>
                  <td>{s.avg_daily_consumption} {s.unit}/day</td>
                  <td style={{ color: s.days_of_stock_left != null && s.days_of_stock_left < 3 ? 'var(--danger-dark)' : 'inherit', fontWeight: 700 }}>
                    {s.days_of_stock_left != null ? `${s.days_of_stock_left} days` : '-'}
                  </td>
                  <td style={{ fontWeight: 700 }}>{s.suggested_qty} {s.unit}</td>
                  <td>{s.estimated_cost != null ? `₹${s.estimated_cost}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {suggestions && suggestions.suggestions.length === 0 && <p>Nothing needs restocking right now — all raw materials are above their reorder level.</p>}
        {!suggestions && <p>Loading...</p>}
      </div>
    </div>
  );
}
