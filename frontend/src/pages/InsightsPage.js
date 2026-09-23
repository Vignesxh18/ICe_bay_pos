import React, { useEffect, useState } from 'react';
import { api } from '../api';

const ADVICE_STYLE = {
  high: {
    className: 'insight-demand-high',
    icon: '🔥',
    title: 'High demand opportunity',
  },
  moderate: {
    className: 'insight-demand-moderate',
    icon: '☀️',
    title: 'Moderate demand',
  },
  low: {
    className: 'insight-demand-low',
    icon: '🌤️',
    title: 'Normal demand',
  },
};

export default function InsightsPage() {
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadInsights = async () => {
    setLoading(true);
    setWeatherError(null);

    try {
      const [weatherResult, suggestionsResult] =
        await Promise.allSettled([
          api.get('/insights/weather'),
          api.get('/insights/purchase-suggestions'),
        ]);

      if (weatherResult.status === 'fulfilled') {
        setWeather(weatherResult.value);
      } else {
        setWeather(null);
        setWeatherError(weatherResult.reason?.message || 'Unable to load weather');
      }

      if (suggestionsResult.status === 'fulfilled') {
        setSuggestions(suggestionsResult.value);
      } else {
        setSuggestions(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  const advice = weather?.advice
    ? ADVICE_STYLE[weather.advice.level] || ADVICE_STYLE.low
    : ADVICE_STYLE.low;

  const suggestionRows = suggestions?.suggestions || [];

  const urgentItems = suggestionRows.filter(
    (item) =>
      item.days_of_stock_left != null &&
      Number(item.days_of_stock_left) < 3
  );

  const totalSuggestedCost = suggestionRows.reduce(
    (sum, item) => sum + Number(item.estimated_cost || 0),
    0
  );

  return (
    <div className="insights-page">

      {/* HEADER */}
      <div className="insights-header">

        <div>
          <div className="insights-breadcrumb">
            FINANCE / INSIGHTS
          </div>

          <h1>Insights</h1>

          <p>
            Smart demand and inventory recommendations for your shop
          </p>
        </div>

        <button
          className="insights-refresh-btn"
          onClick={loadInsights}
          disabled={loading}
        >
          ↻ {loading ? 'Refreshing...' : 'Refresh'}
        </button>

      </div>


      {/* QUICK SUMMARY */}
      <div className="insights-summary-grid">

        <div className="insight-summary-card">

          <div className="insight-summary-icon purple">
            ☀️
          </div>

          <div>
            <span>Demand Outlook</span>

            <strong>
              {weather?.advice
                ? weather.advice.level
                  ? weather.advice.level.charAt(0).toUpperCase() +
                    weather.advice.level.slice(1)
                  : 'Normal'
                : '—'}
            </strong>

            <small>
              Based on current weather
            </small>
          </div>

        </div>


        <div className="insight-summary-card">

          <div className="insight-summary-icon orange">
            📦
          </div>

          <div>
            <span>Purchase Suggestions</span>

            <strong>
              {suggestionRows.length}
            </strong>

            <small>
              Materials need attention
            </small>
          </div>

        </div>


        <div className="insight-summary-card">

          <div className="insight-summary-icon red">
            !
          </div>

          <div>
            <span>Urgent Stock</span>

            <strong>
              {urgentItems.length}
            </strong>

            <small>
              Less than 3 days stock
            </small>
          </div>

        </div>


        <div className="insight-summary-card">

          <div className="insight-summary-icon green">
            ₹
          </div>

          <div>
            <span>Estimated Purchase</span>

            <strong>
              ₹{totalSuggestedCost.toLocaleString('en-IN', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </strong>

            <small>
              Suggested order value
            </small>
          </div>

        </div>

      </div>


      {/* WEATHER */}
      <section className="insight-section">

        <div className="insight-section-header">

          <div>

            <div className="insight-mini-label">
              DEMAND INTELLIGENCE
            </div>

            <h2>
              Weather & Demand
            </h2>

            <p>
              Use weather conditions to understand potential ice-cream demand.
            </p>

          </div>

          <div className="insight-section-icon">
            🌦️
          </div>

        </div>


        {weatherError && (
          <div className="insight-error">
            <span>⚠️</span>

            <div>
              <strong>
                Weather data unavailable
              </strong>

              <p>
                Couldn't load weather right now. Check your internet
                connection and try refreshing.
              </p>
            </div>
          </div>
        )}


        {!weather && !weatherError && (
          <div className="insight-loading">
            <div className="insight-spinner">
              ◌
            </div>

            <strong>
              Loading weather insights...
            </strong>
          </div>
        )}


        {weather && (
          <>

            {/* DEMAND ADVICE */}
            {weather.advice && (
              <div
                className={`insight-demand-banner ${advice.className}`}
              >

                <div className="insight-demand-icon">
                  {advice.icon}
                </div>

                <div className="insight-demand-content">

                  <span>
                    {advice.title}
                  </span>

                  <strong>
                    {weather.advice.message}
                  </strong>

                </div>

                <div className="insight-demand-tag">
                  {String(
                    weather.advice.level || 'normal'
                  ).toUpperCase()}
                </div>

              </div>
            )}


            {/* FORECAST */}
            <div className="insight-forecast-card">

              <div className="insight-forecast-heading">

                <div>
                  <h3>
                    Upcoming Forecast
                  </h3>

                  <span>
                    Plan your stock based on the next few days.
                  </span>
                </div>

              </div>


              <div className="insight-weather-grid">

                {weather.days?.map((day, index) => (

                  <div
                    key={day.date || index}
                    className="insight-weather-day"
                  >

                    <div className="weather-day-top">

                      <span>
                        {index === 0
                          ? 'TODAY'
                          : day.date}
                      </span>

                      <span className="weather-day-icon">
                        {Number(day.max_temp) >= 32
                          ? '☀️'
                          : Number(day.max_temp) >= 28
                          ? '🌤️'
                          : '☁️'}
                      </span>

                    </div>


                    <strong>
                      {day.max_temp}°C
                    </strong>


                    <div className="weather-low">
                      Low {day.min_temp}°C
                    </div>


                    <div className="weather-temperature-bar">

                      <div
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(
                              10,
                              Number(day.max_temp || 0) * 2
                            )
                          )}%`,
                        }}
                      />

                    </div>

                  </div>

                ))}

              </div>

            </div>

          </>
        )}

      </section>


      {/* PURCHASE SUGGESTIONS */}
      <section className="insight-section">

        <div className="insight-section-header">

          <div>

            <div className="insight-mini-label">
              INVENTORY INTELLIGENCE
            </div>

            <h2>
              Suggested Purchases
            </h2>

            <p>
              Recommended raw material purchases based on stock levels
              and recent consumption.
            </p>

          </div>

          <div className="insight-section-icon">
            📦
          </div>

        </div>


        {suggestions && suggestionRows.length > 0 && (

          <div className="insight-purchase-card">

            {/* TABLE HEADER */}
            <div className="insight-purchase-header">

              <div>
                <strong>
                  Reorder Recommendations
                </strong>

                <span>
                  {suggestionRows.length} materials need attention
                </span>
              </div>

              <div className="insight-order-value">
                <span>
                  Estimated order
                </span>

                <strong>
                  ₹{totalSuggestedCost.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </strong>
              </div>

            </div>


            {/* TABLE */}
            <div className="insight-table-wrap">

              <table className="insight-table">

                <thead>

                  <tr>
                    <th>RAW MATERIAL</th>
                    <th>CURRENT STOCK</th>
                    <th>AVG. DAILY USE</th>
                    <th>DAYS LEFT</th>
                    <th>SUGGESTED ORDER</th>
                    <th>EST. COST</th>
                  </tr>

                </thead>


                <tbody>

                  {suggestionRows.map((item) => {

                    const daysLeft =
                      item.days_of_stock_left != null
                        ? Number(item.days_of_stock_left)
                        : null;

                    const status =
                      daysLeft != null && daysLeft < 3
                        ? 'urgent'
                        : daysLeft != null && daysLeft < 7
                        ? 'warning'
                        : 'normal';

                    return (
                      <tr key={item.raw_material_id}>

                        <td>

                          <div className="insight-material">

                            <div className="insight-material-icon">
                              ◈
                            </div>

                            <div>
                              <strong>
                                {item.name}
                              </strong>

                              <span>
                                Raw material
                              </span>
                            </div>

                          </div>

                        </td>


                        <td>

                          <strong>
                            {Number(item.current_stock || 0).toFixed(2)}
                          </strong>

                          <span className="insight-unit">
                            {item.unit}
                          </span>

                        </td>


                        <td>

                          {item.avg_daily_consumption}{' '}
                          {item.unit}/day

                        </td>


                        <td>

                          <span
                            className={`insight-days-badge ${status}`}
                          >

                            {daysLeft != null
                              ? `${daysLeft} days`
                              : '—'}

                          </span>

                        </td>


                        <td>

                          <strong className="suggested-qty">
                            {item.suggested_qty}{' '}
                            {item.unit}
                          </strong>

                        </td>


                        <td>

                          <strong>
                            {item.estimated_cost != null
                              ? `₹${Number(
                                  item.estimated_cost
                                ).toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}`
                              : '—'}
                          </strong>

                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </div>

          </div>

        )}


        {suggestions && suggestionRows.length === 0 && (

          <div className="insight-all-good">

            <div className="insight-all-good-icon">
              ✓
            </div>

            <div>

              <strong>
                Everything looks good
              </strong>

              <p>
                Nothing needs restocking right now. All raw materials
                are above their reorder level.
              </p>

            </div>

          </div>

        )}


        {!suggestions && !loading && (

          <div className="insight-error">

            <span>
              ⚠️
            </span>

            <div>

              <strong>
                Purchase suggestions unavailable
              </strong>

              <p>
                We couldn't load the current inventory recommendations.
              </p>

            </div>

          </div>

        )}

      </section>


      {/* FOOTER NOTE */}
      <div className="insight-footer-note">

        <span>
          ✦
        </span>

        <div>
          <strong>
            Smart insights
          </strong>

          <p>
            Recommendations are generated from your current inventory,
            recent consumption and available weather information.
          </p>
        </div>

      </div>

    </div>
  );
}