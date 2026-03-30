#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const SUPABASE_URL = 'https://npfbrorgnwhrbpfbqiuh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wZmJyb3JnbndocmJwZmJxaXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MjAyNTcsImV4cCI6MjA4ODA5NjI1N30.uQ5fMaYuQmaBCXmq84QWTpkUp9U-cZ3gEQyB4-kMzZ4';
const SITE_URL = 'https://churchesnearme.co.za';

const CITY_COORDS = {
  'cape town': { lat: -33.9249, lng: 18.4241 },
  'johannesburg': { lat: -26.2041, lng: 28.0473 },
  'durban': { lat: -29.8587, lng: 31.0218 },
  'pretoria': { lat: -25.7479, lng: 28.2293 },
  'bloemfontein': { lat: -29.1180, lng: 26.2140 },
  'polokwane': { lat: -23.9040, lng: 29.4689 },
  'nelspruit': { lat: -25.4750, lng: 30.9700 },
  'kimberley': { lat: -28.7282, lng: 24.7499 },
  'george': { lat: -33.9630, lng: 22.4600 },
  'knysna': { lat: -34.0363, lng: 23.0471 },
  'stellenbosch': { lat: -33.9340, lng: 18.8600 },
  'paarl': { lat: -33.7340, lng: 18.9620 },
  'worcester': { lat: -33.6450, lng: 19.4480 },
  'richards bay': { lat: -28.7800, lng: 32.0400 },
  'newcastle': { lat: -27.7570, lng: 29.9310 },
  'potchefstroom': { lat: -26.7140, lng: 27.0970 },
  'rustenburg': { lat: -25.6670, lng: 27.2420 }
};

const TARGET_CITIES = [
  'Cape Town',
  'Johannesburg',
  'Durban',
  'Pretoria',
  'Bloemfontein',
  'Polokwane',
  'Nelspruit',
  'Kimberley',
  'George',
  'Knysna',
  'Stellenbosch',
  'Paarl',
  'Worcester',
  'Richards Bay',
  'Newcastle',
  'Potchefstroom',
  'Rustenburg'
];

const CITY_BLURBS = {
  'cape town': 'From Southern Suburbs to the Atlantic Seaboard, Cape Town has a wide mix of traditional and modern congregations. It helps to check service times early, especially if you want family-friendly or student‑focused churches.',
  'johannesburg': 'Johannesburg churches tend to be spread across the suburbs. Look for options close to your daily routes to make Sunday mornings easier, and check midweek community groups if you want connection beyond services.',
  'durban': 'Durban has strong community churches across North and South. Many offer morning and evening services, so you can pick a time that fits your weekend rhythm.',
  'pretoria': 'Pretoria has established denominations as well as newer church plants. If you are new to the city, start with churches in your closest suburb and expand from there.',
  'stellenbosch': 'Stellenbosch has a big student population, so you will find lively young‑adult ministries alongside traditional congregations.'
};

const DENOM_BLURBS = {
  'baptist': 'Baptist churches in South Africa vary from traditional hymn‑based services to modern worship styles. Most are community‑focused and strong on teaching and small groups.',
  'catholic': 'Catholic churches follow a consistent liturgy, which makes it easy to know what to expect if you are new to a parish.',
  'ng kerk': 'NG Kerk congregations are common across South Africa and often have strong family ministries and community outreach.',
  'apostolic faith mission': 'AFM churches are often lively and community‑driven, with a focus on worship, prayer, and practical support.'
};

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: 'application/json'
      }
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(new Error(`Failed to parse JSON: ${err.message}`));
          }
        } else {
          reject(new Error(`Supabase request failed (${res.statusCode}): ${data.slice(0, 500)}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function fetchChurches() {
  const all = [];
  const limit = 1000;
  let offset = 0;

  while (true) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/churches`);
    url.searchParams.set('select', '*');
    url.searchParams.set('verified', 'eq.true');
    url.searchParams.set('order', 'name.asc');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));

    const batch = await httpsGetJson(url.toString());
    all.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
  }

  return all;
}

function splitSqlValues(line) {
  const values = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuote) {
      if (char === "'") {
        if (line[i + 1] === "'") {
          current += "'";
          i += 1;
        } else {
          inQuote = false;
        }
      } else {
        current += char;
      }
      continue;
    }
    if (char === "'") {
      inQuote = true;
      continue;
    }
    if (char === ',') {
      values.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim().length) values.push(current.trim());
  return values;
}

function parseInsertStatements(sql) {
  const records = [];
  const withoutComments = sql.replace(/--.*$/gm, '');
  const insertBlocks = withoutComments.split(/INSERT INTO churches/gi).slice(1);
  for (const block of insertBlocks) {
    const columnsMatch = block.match(/\(([^)]+)\)\s*VALUES/i);
    if (!columnsMatch) continue;
    const columns = columnsMatch[1].split(',').map(col => col.trim());
    const valuesSection = block.split(/VALUES/i)[1];
    if (!valuesSection) continue;
    let buffer = '';
    let depth = 0;
    let inQuote = false;
    for (let i = 0; i < valuesSection.length; i += 1) {
      const char = valuesSection[i];
      if (inQuote) {
        buffer += char;
        if (char === "'" && valuesSection[i + 1] === "'") {
          buffer += "'";
          i += 1;
          continue;
        }
        if (char === "'") inQuote = false;
        continue;
      }
      if (char === "'") {
        inQuote = true;
        buffer += char;
        continue;
      }
      if (char === '(') {
        depth += 1;
        buffer += char;
        continue;
      }
      if (char === ')') {
        depth -= 1;
        buffer += char;
        if (depth === 0) {
          const tuple = buffer.trim();
          if (tuple.startsWith('(') && tuple.endsWith(')')) {
            const valuesLine = tuple.slice(1, -1);
            const values = splitSqlValues(valuesLine);
            if (values.length >= columns.length) {
              const record = {};
              columns.forEach((col, idx) => {
                record[col] = values[idx] === 'NULL' ? null : values[idx];
              });
              records.push(record);
            }
          }
          buffer = '';
        }
        continue;
      }
      if (depth > 0) {
        buffer += char;
      }
    }
  }
  return records;
}

function normalizeParsedValue(value, column) {
  if (value === null || value === undefined) return null;
  if (value === 'TRUE') return true;
  if (value === 'FALSE') return false;
  if (column === 'lat' || column === 'lng') return Number(value);
  return value;
}

function fetchChurchesFromSeeds() {
  const seedFiles = [
    'seed-verified-churches.sql',
    'seed-churches.sql',
    'seed-churches-batch2.sql',
    'seed-churches-expansion.sql'
  ].map(file => path.join(__dirname, file));

  const churches = [];
  for (const filePath of seedFiles) {
    if (!fs.existsSync(filePath)) continue;
    const sql = fs.readFileSync(filePath, 'utf8');
    const records = parseInsertStatements(sql);
    records.forEach(record => {
      const church = {
        name: normalizeParsedValue(record.name, 'name'),
        denomination: normalizeParsedValue(record.denomination, 'denomination'),
        address: normalizeParsedValue(record.address, 'address'),
        city: normalizeParsedValue(record.city, 'city'),
        province: normalizeParsedValue(record.province, 'province'),
        lat: normalizeParsedValue(record.lat, 'lat'),
        lng: normalizeParsedValue(record.lng, 'lng'),
        website: normalizeParsedValue(record.website, 'website'),
        phone: normalizeParsedValue(record.phone, 'phone'),
        slug: normalizeParsedValue(record.slug, 'slug'),
        verified: normalizeParsedValue(record.verified, 'verified'),
        featured: normalizeParsedValue(record.featured, 'featured')
      };
      churches.push(church);
    });
  }

  const seen = new Set();
  return churches.filter(church => {
    const slug = church.slug || `${church.name || ''}-${church.city || ''}`;
    if (seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80) || 'church';
}

function normalizeWebsite(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function hasCoordinates(church) {
  const lat = Number(church.lat);
  const lng = Number(church.lng);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function titleCase(value) {
  return String(value || '')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function buildLocalBusinessSchema(churches) {
  const graph = churches.map(church => {
    const lat = Number(church.lat);
    const lng = Number(church.lng);
    const schema = {
      '@type': 'LocalBusiness',
      name: church.name || 'Church',
      url: `${SITE_URL}/churches/${church.slug}/`,
      address: {
        '@type': 'PostalAddress',
        streetAddress: church.address || '',
        addressLocality: church.city || '',
        addressRegion: church.province || '',
        addressCountry: 'ZA'
      }
    };

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      schema.geo = {
        '@type': 'GeoCoordinates',
        latitude: lat,
        longitude: lng
      };
    }

    return schema;
  });

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': graph
  }, null, 2);
}

function buildChurchCards(churches) {
  if (!churches.length) {
    return '<p class="empty-state">No churches found yet. Check back soon.</p>';
  }

  return `<div class="church-grid">
    ${churches.map(church => {
      const address = [church.address, church.city].filter(Boolean).join(', ');
      const website = normalizeWebsite(church.website);
      return `<article class="church-card" data-denomination="${escapeHtml(church.denomination || 'Other')}" data-city="${escapeHtml(church.city || '')}">
        <h3><a href="/churches/${escapeHtml(church.slug)}/">${escapeHtml(church.name || 'Church')}</a></h3>
        ${church.denomination ? `<div class="church-denom">${escapeHtml(church.denomination)}</div>` : ''}
        ${address ? `<div class="church-address">${escapeHtml(address)}</div>` : ''}
        <div class="church-links">
          <a href="/churches/${escapeHtml(church.slug)}/" class="church-link">View details</a>
          ${website ? `<a href="${escapeHtml(website)}" target="_blank" rel="noopener" class="church-link">Website</a>` : ''}
        </div>
      </article>`;
    }).join('')}
  </div>`;
}

function buildFilterControls(options, labelText, selectId) {
  if (!options.length) return '';
  return `<label class="filter-label" for="${selectId}">${labelText}</label>
  <select id="${selectId}" class="filter-select">
    <option value="all">All</option>
    ${options.map(option => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join('')}
  </select>`;
}

function buildCityPage(city, churches) {
  const cityKey = city.toLowerCase();
  const coords = CITY_COORDS[cityKey] || { lat: -29.0, lng: 24.0 };
  const denominations = Array.from(new Set(churches.map(c => c.denomination).filter(Boolean))).sort();
  const description = `Find ${city} churches near me. Browse ${churches.length} verified churches across ${denominations.length} denominations, view locations on a map, and connect with local congregations in ${city}.`;
  const blurb = CITY_BLURBS[cityKey] || `If you are searching for churches in ${city}, start with the suburbs closest to home and expand from there. Smaller communities can be just as welcoming as the biggest congregations.`;
  const updated = new Date().toISOString().slice(0, 10);
  const schemaJson = buildLocalBusinessSchema(churches);

  const cityFaq = [
    {
      q: `How do I find a church in ${city}?`,
      a: `Start with churches in your suburb or nearby areas, then filter by denomination or service time. Visiting two or three options is usually enough to find a good fit.`
    },
    {
      q: `Are these ${city} churches verified?`,
      a: `Yes. The churches listed on this page are marked as verified in our directory.`
    },
    {
      q: `Can I add a church in ${city}?`,
      a: `Yes. Use the Add Your Church page to submit a listing and we will verify it.`
    }
  ];

  const cityFaqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: cityFaq.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a }
    }))
  };

  const mapData = churches
    .filter(hasCoordinates)
    .map(church => ({
      name: church.name,
      slug: church.slug,
      denomination: church.denomination || 'Church',
      lat: Number(church.lat),
      lng: Number(church.lng)
    }));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Churches in ${escapeHtml(city)} | Find a Church Near You</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${SITE_URL}/cities/${slugify(city)}.html">
  <meta property="og:title" content="Churches in ${escapeHtml(city)} | Find a Church Near You">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${SITE_URL}/cities/${slugify(city)}.html">
  <meta property="og:type" content="website">
  <link rel="stylesheet" href="/styles.css?v=2">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
  <style>
    .city-hero { padding: 48px 20px 24px; max-width: 1100px; margin: 0 auto; }
    .city-hero h1 { margin-bottom: 12px; }
    .city-hero p { max-width: 720px; }
    .city-blurb { color: #475569; margin-top: 8px; }
    .updated { font-size: 13px; color: #94a3b8; margin-top: 8px; }
    .filters { display: flex; gap: 16px; flex-wrap: wrap; margin: 24px 0; }
    .filter-label { font-weight: 600; }
    .filter-select { padding: 8px 12px; border-radius: 8px; border: 1px solid #d0d5dd; background: #fff; }
    .church-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
    .church-card { background: #ffffff; border-radius: 16px; padding: 16px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); }
    .church-card h3 { margin: 0 0 8px; }
    .church-denom { font-weight: 600; color: #0f172a; margin-bottom: 6px; }
    .church-address { color: #475569; margin-bottom: 12px; }
    .church-links { display: flex; gap: 12px; flex-wrap: wrap; }
    .church-link { color: #1d4ed8; font-weight: 600; text-decoration: none; }
    .map-wrapper { margin: 32px 0; }
    #city-map { height: 420px; border-radius: 16px; overflow: hidden; }
    .empty-state { color: #64748b; }
    .back-link { display: inline-block; margin-top: 24px; font-weight: 600; }
    .faq-section { margin-top: 28px; }
    .faq-section h2 { color: #0f172a; margin-bottom: 12px; font-size: 22px; }
    .faq-list { display: grid; gap: 12px; }
    .faq-item { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; }
    .faq-item h3 { margin: 0 0 6px 0; font-size: 16px; color: #0f172a; }
    .faq-item p { margin: 0; color: #475569; line-height: 1.6; }
  </style>
</head>
<body>
  <main class="city-hero">
    <a href="/" class="back-link">← Back to homepage</a>
    <h1>Churches in ${escapeHtml(city)}</h1>
    <p>${escapeHtml(description)}</p>
    <p class="city-blurb">${escapeHtml(blurb)}</p>
    <div class="updated">Last updated: ${updated}</div>

    <div class="filters">
      ${buildFilterControls(denominations, 'Filter by denomination', 'denomination-filter')}
    </div>

    <div class="map-wrapper">
      <div id="city-map" aria-label="Map of churches in ${escapeHtml(city)}"></div>
    </div>

    ${buildChurchCards(churches)}

    <section class="faq-section">
      <h2>Frequently Asked Questions</h2>
      <div class="faq-list">
        ${cityFaq.map(item => `
          <div class="faq-item">
            <h3>${escapeHtml(item.q)}</h3>
            <p>${escapeHtml(item.a)}</p>
          </div>
        `).join('')}
      </div>
    </section>
  </main>

  <script type="application/ld+json">
${schemaJson}
  </script>
  <script type="application/ld+json">
${JSON.stringify(cityFaqSchema, null, 2)}
  </script>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
  <script>
    const churches = ${JSON.stringify(mapData)};
    const map = L.map('city-map').setView([${coords.lat}, ${coords.lng}], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const markers = [];
    churches.forEach(church => {
      if (!Number.isFinite(church.lat) || !Number.isFinite(church.lng)) return;
      const marker = L.marker([church.lat, church.lng]).addTo(map);
      marker.bindPopup('<strong>' + escapeHtml(church.name) + '</strong><br>' + escapeHtml(church.denomination) + '<br><a href=\"/churches/' + escapeHtml(church.slug) + '/\">View page</a>');
      markers.push(marker);
    });

    if (markers.length) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.2));
    }

    const denomFilter = document.getElementById('denomination-filter');
    if (denomFilter) {
      denomFilter.addEventListener('change', event => {
        const value = event.target.value;
        const cards = document.querySelectorAll('.church-card');
        cards.forEach(card => {
          const denom = card.dataset.denomination || '';
          const show = value === 'all' || denom === value;
          card.style.display = show ? 'block' : 'none';
        });
      });
    }

    function escapeHtml(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  </script>
</body>
</html>`;
}

function buildDenominationPage(denomination, churches) {
  const topCities = Array.from(new Set(churches.map(c => c.city).filter(Boolean))).slice(0, 4);
  const description = `Explore ${denomination} churches near me across South Africa. Browse ${churches.length} verified churches, view locations by city, and connect with ${denomination} congregations.`;
  const denomKey = denomination.toLowerCase();
  const denomBlurb = DENOM_BLURBS[denomKey] || `Every ${denomination} church has its own culture and service style. Use the city filter to find congregations closest to you and explore a few before you settle.`;
  const updated = new Date().toISOString().slice(0, 10);
  const cityOptions = Array.from(new Set(churches.map(c => c.city).filter(Boolean))).sort();
  const schemaJson = buildLocalBusinessSchema(churches);

  const denomFaq = [
    {
      q: `What is a ${denomination} church?`,
      a: `${denomination} churches share a common tradition, but each congregation has its own worship style and community culture.`
    },
    {
      q: `Which cities have ${denomination} churches?`,
      a: topCities.length ? `You can find ${denomination} churches in cities like ${topCities.join(', ')} and more across South Africa.` : `There are ${denomination} churches across multiple South African cities.`
    },
    {
      q: `Can I add a ${denomination} church listing?`,
      a: `Yes. Use the Add Your Church page to submit a listing and we will verify it.`
    }
  ];

  const denomFaqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: denomFaq.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a }
    }))
  };

  const mapData = churches
    .filter(hasCoordinates)
    .map(church => ({
      name: church.name,
      slug: church.slug,
      city: church.city,
      lat: Number(church.lat),
      lng: Number(church.lng)
    }));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(denomination)} Churches in South Africa | Churches Near Me</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${SITE_URL}/denominations/${slugify(denomination)}.html">
  <meta property="og:title" content="${escapeHtml(denomination)} Churches in South Africa">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${SITE_URL}/denominations/${slugify(denomination)}.html">
  <meta property="og:type" content="website">
  <link rel="stylesheet" href="/styles.css?v=2">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
  <style>
    .denom-hero { padding: 48px 20px 24px; max-width: 1100px; margin: 0 auto; }
    .denom-hero h1 { margin-bottom: 12px; }
    .denom-hero p { max-width: 760px; }
    .denom-blurb { color: #475569; margin-top: 8px; }
    .updated { font-size: 13px; color: #94a3b8; margin-top: 8px; }
    .filters { display: flex; gap: 16px; flex-wrap: wrap; margin: 24px 0; }
    .filter-label { font-weight: 600; }
    .filter-select { padding: 8px 12px; border-radius: 8px; border: 1px solid #d0d5dd; background: #fff; }
    .church-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
    .church-card { background: #ffffff; border-radius: 16px; padding: 16px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); }
    .church-card h3 { margin: 0 0 8px; }
    .church-address { color: #475569; margin-bottom: 12px; }
    .church-links { display: flex; gap: 12px; flex-wrap: wrap; }
    .church-link { color: #1d4ed8; font-weight: 600; text-decoration: none; }
    .map-wrapper { margin: 32px 0; }
    #denom-map { height: 420px; border-radius: 16px; overflow: hidden; }
    .empty-state { color: #64748b; }
    .back-link { display: inline-block; margin-top: 24px; font-weight: 600; }
    .faq-section { margin-top: 28px; }
    .faq-section h2 { color: #0f172a; margin-bottom: 12px; font-size: 22px; }
    .faq-list { display: grid; gap: 12px; }
    .faq-item { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; }
    .faq-item h3 { margin: 0 0 6px 0; font-size: 16px; color: #0f172a; }
    .faq-item p { margin: 0; color: #475569; line-height: 1.6; }
  </style>
</head>
<body>
  <main class="denom-hero">
    <a href="/" class="back-link">← Back to homepage</a>
    <h1>${escapeHtml(denomination)} Churches in South Africa</h1>
    <p>${escapeHtml(description)}</p>
    <p class="denom-blurb">${escapeHtml(denomBlurb)}</p>
    <div class="updated">Last updated: ${updated}</div>

    <div class="filters">
      ${buildFilterControls(cityOptions, 'Filter by city', 'city-filter')}
    </div>

    <div class="map-wrapper">
      <div id="denom-map" aria-label="Map of ${escapeHtml(denomination)} churches"></div>
    </div>

    ${buildChurchCards(churches)}

    <section class="faq-section">
      <h2>Frequently Asked Questions</h2>
      <div class="faq-list">
        ${denomFaq.map(item => `
          <div class="faq-item">
            <h3>${escapeHtml(item.q)}</h3>
            <p>${escapeHtml(item.a)}</p>
          </div>
        `).join('')}
      </div>
    </section>
  </main>

  <script type="application/ld+json">
${schemaJson}
  </script>
  <script type="application/ld+json">
${JSON.stringify(denomFaqSchema, null, 2)}
  </script>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
  <script>
    const churches = ${JSON.stringify(mapData)};
    const map = L.map('denom-map').setView([-29.0, 24.0], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const markers = [];
    churches.forEach(church => {
      if (!Number.isFinite(church.lat) || !Number.isFinite(church.lng)) return;
      const marker = L.marker([church.lat, church.lng]).addTo(map);
      marker.bindPopup('<strong>' + escapeHtml(church.name) + '</strong><br>' + escapeHtml(church.city || '') + '<br><a href=\"/churches/' + escapeHtml(church.slug) + '/\">View page</a>');
      markers.push(marker);
    });

    if (markers.length) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.2));
    }

    const cityFilter = document.getElementById('city-filter');
    if (cityFilter) {
      cityFilter.addEventListener('change', event => {
        const value = event.target.value;
        const cards = document.querySelectorAll('.church-card');
        cards.forEach(card => {
          const city = card.dataset.city || '';
          const show = value === 'all' || city === value;
          card.style.display = show ? 'block' : 'none';
        });
      });
    }

    function escapeHtml(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  </script>
</body>
</html>`;
}

function normalizeCity(value) {
  return String(value || '').trim().toLowerCase();
}

async function main() {
  let churches = [];
  try {
    churches = await fetchChurches();
  } catch (err) {
    console.warn('Supabase fetch failed, falling back to local seed files.', err.message);
    churches = fetchChurchesFromSeeds();
  }

  const citiesDir = path.join(__dirname, 'cities');
  const denomsDir = path.join(__dirname, 'denominations');
  fs.mkdirSync(citiesDir, { recursive: true });
  fs.mkdirSync(denomsDir, { recursive: true });

  for (const city of TARGET_CITIES) {
    const cityChurches = churches.filter(church => normalizeCity(church.city) === normalizeCity(city));
    const html = buildCityPage(city, cityChurches);
    fs.writeFileSync(path.join(citiesDir, `${slugify(city)}.html`), html, 'utf8');
  }

  const denominations = Array.from(new Set(churches.map(c => c.denomination).filter(Boolean))).sort();
  for (const denom of denominations) {
    const denomChurches = churches.filter(church => (church.denomination || '').trim() === denom);
    const html = buildDenominationPage(denom, denomChurches);
    fs.writeFileSync(path.join(denomsDir, `${slugify(denom)}.html`), html, 'utf8');
  }

  console.log(`Generated ${TARGET_CITIES.length} city pages and ${denominations.length} denomination pages.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
