const CITIES = ['london', 'paris', 'dallas', 'miami'];
const REFRESH_MS = 60000;
const DAY_KEYS = ['today', 'tomorrow', 'after_tomorrow'];

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    setInterval(refreshAll, REFRESH_MS);
});

async function initDashboard() {
    const grid = document.getElementById('city-grid');
    const template = document.getElementById('city-card-template');

    CITIES.forEach(city => {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.city-card');
        card.id = `card-${city}`;
        card.dataset.city = city;
        card.querySelector('.city-name').textContent = city;

        // Wire up tab buttons
        card.querySelectorAll('.day-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                const dayKey = btn.dataset.day;
                // Toggle active tab
                card.querySelectorAll('.day-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                // Toggle active panel
                card.querySelectorAll('.day-panel').forEach(p => p.classList.remove('active'));
                card.querySelector(`.day-panel[data-day-panel="${dayKey}"]`).classList.add('active');
            });
        });

        grid.appendChild(clone);
    });

    await refreshAll();
}

async function refreshAll() {
    const statusEl = document.getElementById('global-status');
    statusEl.classList.add('updating');
    statusEl.textContent = 'Aggregating sources...';
    statusEl.classList.remove('error');

    let anyError = false;

    await Promise.all(CITIES.map(async (city) => {
        try {
            const res = await fetch(`/api/all/${city}`);
            if (res.status === 503) return;
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            renderCity(city, data);
        } catch (err) {
            console.error(`Failed to fetch ${city}:`, err);
            anyError = true;
            markStale(city);
        }
    }));

    statusEl.classList.remove('updating');
    if (anyError) {
        statusEl.classList.add('error');
        statusEl.textContent = 'Updates partial (some sources or cities failed)';
    } else {
        statusEl.textContent = 'All systems active';
    }
}

function renderCity(city, data) {
    const card = document.getElementById(`card-${city}`);
    if (!card) return;

    if (data.is_cache_stale) {
        card.classList.add('stale');
    } else {
        card.classList.remove('stale');
    }

    // Badges
    const confBadge = card.querySelector('.confidence-badge');
    confBadge.textContent = `${data.risk.confidence} CONFIDENCE`;
    confBadge.className = 'badge confidence-badge';
    if (data.risk.confidence === 'HIGH') confBadge.classList.add('green');
    else if (data.risk.confidence === 'MEDIUM') confBadge.classList.add('amber');
    else confBadge.classList.add('red');

    const sigBadge = card.querySelector('.signal-badge');
    sigBadge.textContent = data.risk.trade_signal;
    sigBadge.title = data.risk.no_trade_reasons.join('\n') || 'All safe';
    sigBadge.className = 'badge signal-badge';
    if (data.risk.trade_signal === 'TRADE') sigBadge.classList.add('green');
    else sigBadge.classList.add('red');

    // Current temp (always visible, not per-day)
    const curMax = card.querySelector('.current-max');
    curMax.textContent = data.current ? `${data.current.temp_c.toFixed(1)}°C` : '--.-°C';

    // Render each day panel
    DAY_KEYS.forEach(dayKey => {
        const panel = card.querySelector(`.day-panel[data-day-panel="${dayKey}"]`);
        if (!panel) return;

        const dayData = data.days && data.days[dayKey];
        const derived = dayData ? dayData.derived : null;
        const forecasts = dayData ? dayData.forecast_highs : [];

        // Forecast high median
        const fstMax = panel.querySelector('.forecast-max');
        fstMax.textContent = (derived && derived.median_c !== null) ? `${derived.median_c.toFixed(1)}°C` : '--.-°C';

        // Recorded max (only in today panel)
        const recMax = panel.querySelector('.recorded-max');
        if (recMax) {
            recMax.textContent = data.recorded ? `${data.recorded.daily_max_c.toFixed(1)}°C` : '--.-°C';
        }

        // Anchor (only in today panel)
        const anchorPanel = panel.querySelector('.anchor-details');
        if (anchorPanel) {
            if (data.resolution.resolution_ready) {
                anchorPanel.innerHTML = `
          <strong>Source:</strong> ${data.resolution.anchor_source} <br>
          <strong>Value:</strong> ${data.resolution.anchor_value_c.toFixed(1)}°C <br>
          <strong>Updated:</strong> ${formatAge(data.resolution.anchor_timestamp)}
        `;
            } else {
                anchorPanel.innerHTML = `<span style="color:var(--accent-red)">Not Ready</span><br>
        <small>${data.resolution.conflict_reason || 'Missing or invalid'}</small>`;
            }
        }

        // Spread viz
        renderSpread(panel, forecasts, derived);
    });

    // Sources table
    const tbody = card.querySelector('.sources-tbody');
    tbody.innerHTML = '';
    data.sources.forEach(src => {
        const tr = document.createElement('tr');
        const statusClass = src.status === 'ok' ? (src.stale ? 'stale' : 'ok') : 'error';
        tr.innerHTML = `
      <td>${src.id} <br><span style="color:var(--text-muted);font-size:0.65rem">${src.method}</span></td>
      <td>
        <span class="status-chip ${statusClass}" title="${src.status}"></span>
        ${src.status === 'ok' ? `${src.latency_ms}ms` : 'Error'}
      </td>
      <td>${formatAge(src.fetched_at)}</td>
    `;
        tbody.appendChild(tr);
    });

    card.querySelector('.last-updated').textContent = `Last server fetch: ${formatAge(data.fetchedAt)}`;
}

function renderSpread(panel, forecasts, derived) {
    const spreadTrack = panel.querySelector('.spread-track');
    if (!spreadTrack) return;

    if (forecasts.length > 0 && derived && derived.median_c !== null) {
        const vals = forecasts.map(f => f.value_c);
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        const med = derived.median_c;

        const rangeVal = Math.max(4, Math.ceil(max - min) + 2);
        const padding = rangeVal / 2;
        const center = med;
        const startPoint = Math.max(0, ((min - (center - padding)) / rangeVal) * 100);
        const endPoint = Math.min(100, ((max - (center - padding)) / rangeVal) * 100);
        const width = Math.max(2, endPoint - startPoint);

        spreadTrack.style.left = `${startPoint}%`;
        spreadTrack.style.width = `${width}%`;

        panel.querySelector('.spread-min').textContent = min.toFixed(1);
        panel.querySelector('.spread-median').textContent = `Med: ${med.toFixed(1)}`;
        panel.querySelector('.spread-max').textContent = max.toFixed(1);
    } else {
        spreadTrack.style.width = '0%';
        panel.querySelector('.spread-min').textContent = '--';
        panel.querySelector('.spread-median').textContent = 'Med: --';
        panel.querySelector('.spread-max').textContent = '--';
    }
}

function markStale(city) {
    const card = document.getElementById(`card-${city}`);
    if (card) {
        card.querySelector('.last-updated').textContent = 'Data fetch failed. Connection issue.';
    }
}

function formatAge(isoString) {
    if (!isoString) return 'Unknown';
    const ageMs = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(ageMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ago`;
}
