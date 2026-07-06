#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = __dirname;
const SITE = 'https://www.churchesnearme.co.za';
const BARE = 'https://churchesnearme.co.za';
const OG_IMAGE = `${SITE}/assets/og-image.png`;
const UPDATED = new Date().toISOString().slice(0, 10);
const SUPABASE_URL = 'https://npfbrorgnwhrbpfbqiuh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wZmJyb3JnbndocmJwZmJxaXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MjAyNTcsImV4cCI6MjA4ODA5NjI1N30.uQ5fMaYuQmaBCXmq84QWTpkUp9U-cZ3gEQyB4-kMzZ4';

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
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); } catch (err) { reject(err); }
        } else {
          reject(new Error(`Supabase request failed ${res.statusCode}: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function fetchChurches() {
  const all = [];
  let offset = 0;
  const limit = 1000;
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
    } else if (char === ',') {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function parseSeedFiles() {
  const files = fs.readdirSync(ROOT).filter(file => /^seed.*\.sql$/.test(file)).sort();
  const churches = [];
  for (const file of files) {
    const sql = fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/--.*$/gm, '');
    const blocks = sql.split(/INSERT INTO churches/gi).slice(1);
    for (const block of blocks) {
      const colMatch = block.match(/\(([^)]+)\)\s*VALUES/i);
      if (!colMatch) continue;
      const columns = colMatch[1].split(',').map(col => col.trim());
      const valuesPart = block.split(/VALUES/i)[1] || '';
      let depth = 0;
      let inQuote = false;
      let buf = '';
      for (let i = 0; i < valuesPart.length; i += 1) {
        const char = valuesPart[i];
        if (char === "'" && valuesPart[i + 1] === "'") {
          buf += "''";
          i += 1;
          continue;
        }
        if (char === "'") inQuote = !inQuote;
        if (!inQuote && char === '(') depth += 1;
        if (depth > 0) buf += char;
        if (!inQuote && char === ')') {
          depth -= 1;
          if (depth === 0) {
            const values = splitSqlValues(buf.slice(1, -1));
            const church = {};
            columns.forEach((col, idx) => {
              const raw = values[idx];
              church[col] = raw === 'NULL' ? null : raw;
            });
            churches.push(church);
            buf = '';
          }
        }
      }
    }
  }
  return churches;
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function attr(value) {
  return esc(value).replace(/\n/g, ' ');
}

function slugify(value) {
  return String(value || 'church')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'church';
}

function titleCase(value) {
  return String(value || '')
    .split(/[-\s]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function normalizeWebsite(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function normalizeServiceTimes(serviceTimes) {
  if (!serviceTimes) return '';
  if (typeof serviceTimes === 'object') {
    return Object.entries(serviceTimes)
      .map(([day, times]) => `${titleCase(day)}: ${Array.isArray(times) ? times.join(', ') : times}`)
      .join('; ');
  }
  return String(serviceTimes).replace(/\s+/g, ' ').trim();
}

function openingHours(serviceTimes) {
  const text = normalizeServiceTimes(serviceTimes);
  if (!text) return undefined;
  return text;
}

function withUrls(churches) {
  const seen = new Set();
  return churches.map(raw => {
    const church = {
      name: raw.name || 'Church',
      denomination: raw.denomination || 'Christian',
      address: raw.address || '',
      suburb: raw.suburb || raw.area || '',
      city: raw.city || 'South Africa',
      province: raw.province || 'South Africa',
      lat: Number(raw.lat),
      lng: Number(raw.lng),
      website: normalizeWebsite(raw.website),
      phone: raw.phone || '',
      email: raw.email || '',
      service_times: raw.service_times || raw.serviceTimes || '',
      description: raw.description || '',
      featured: raw.featured === true || raw.featured === 'TRUE',
      slug: raw.slug || slugify(`${raw.name || 'church'}-${raw.city || ''}`)
    };
    church.slug = slugify(church.slug);
    let unique = church.slug;
    let idx = 2;
    while (seen.has(unique)) {
      unique = `${church.slug}-${idx}`;
      idx += 1;
    }
    seen.add(unique);
    church.slug = unique;
    church.provinceSlug = slugify(church.province);
    church.citySlug = slugify(church.city);
    church.denominationSlug = slugify(church.denomination);
    church.oldPath = `/churches/${church.slug}/`;
    church.path = `/churches/${church.provinceSlug}/${church.citySlug}/${church.slug}.html`;
    church.url = `${SITE}${church.path}`;
    return church;
  }).sort((a, b) => a.name.localeCompare(b.name));
}

function groupBy(items, keyFn) {
  return items.reduce((map, item) => {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
    return map;
  }, new Map());
}

function header(active = '') {
  const is = value => active === value ? ' class="active"' : '';
  return `<a class="skip-link" href="#main">Skip to main content</a>
  <header>
    <div class="container">
      <div class="header-content">
        <a class="logo" href="/">ChurchesNearMe</a>
        <button class="nav-toggle" type="button" aria-label="Toggle navigation" aria-expanded="false" aria-controls="primary-nav"><span></span><span></span><span></span></button>
        <nav class="nav-menu" id="primary-nav" aria-label="Primary">
          <a href="/"${is('home')}>Home</a>
          <a href="/claim.html"${is('claim')}>Add or Claim Your Church</a>
          <a href="/featured.html"${is('featured')}>Get Featured</a>
          <a href="/blog/"${is('blog')}>Blog</a>
        </nav>
      </div>
    </div>
  </header>`;
}

function footer() {
  return `<footer>
    <div class="container">
      <p>&copy; 2026 ChurchesNearMe.co.za | Free church directory for South Africa</p>
      <p style="margin-top: 8px;">
        <a href="/about.html">About</a> |
        <a href="/contact.html">Contact</a> |
        <a href="/privacy.html">Privacy</a> |
        <a href="/claim.html">Add or Claim Your Church</a> |
        <a href="/featured.html">Get Featured</a> |
        <a href="/blog/">Blog</a>
      </p>
    </div>
  </footer>
  <script>
    var headerEl = document.querySelector('header');
    var navToggle = document.querySelector('.nav-toggle');
    if (navToggle && headerEl) {
      navToggle.addEventListener('click', function() {
        var isOpen = headerEl.classList.toggle('nav-open');
        navToggle.setAttribute('aria-expanded', isOpen);
      });
    }
  </script>`;
}

function head({ title, description, canonical, type = 'website', extra = '' }) {
  return `<meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${attr(description)}">
  <link rel="canonical" href="${canonical}">
  <meta name="robots" content="index,follow">
  <meta name="theme-color" content="#1a2744">
  <meta property="og:title" content="${attr(title)}">
  <meta property="og:description" content="${attr(description)}">
  <meta property="og:type" content="${type}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${OG_IMAGE}">
  <meta property="og:site_name" content="ChurchesNearMe.co.za">
  <meta property="og:locale" content="en_ZA">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${attr(title)}">
  <meta name="twitter:description" content="${attr(description)}">
  <meta name="twitter:image" content="${OG_IMAGE}">
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css?v=2">
  ${extra}`;
}

function page({ title, description, canonical, active, main, extraHead = '', type = 'website' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
${head({ title, description, canonical, type, extra: extraHead })}
</head>
<body>
  ${header(active)}
  ${main}
  ${footer()}
</body>
</html>`;
}

function scriptJson(data) {
  return `<script type="application/ld+json">\n${JSON.stringify(data, null, 2)}\n</script>`;
}

function churchCard(church) {
  const address = [church.address, church.suburb, church.city].filter(Boolean).join(', ');
  return `<a href="${church.path}" class="church-card-link">
    <article class="church-card${church.featured ? ' featured' : ''}" data-denomination="${attr(church.denomination)}" data-city="${attr(church.city)}" data-province="${attr(church.province)}">
      ${church.featured ? '<span class="featured-badge">FEATURED</span>' : ''}
      <h3>${esc(church.name)}</h3>
      <div class="church-denomination">${esc(church.denomination)}</div>
      <div class="church-address">${esc(address)}</div>
      ${normalizeServiceTimes(church.service_times) ? `<div class="church-service-times"><strong>Service Times:</strong> ${esc(normalizeServiceTimes(church.service_times))}</div>` : ''}
      <div class="church-contact"><span class="church-link-tag">View details</span>${church.website ? '<span class="church-link-tag">Website</span>' : ''}${church.phone ? '<span class="church-link-tag">Call</span>' : ''}</div>
    </article>
  </a>`;
}

function breadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}

function itemListSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: item.url || `${SITE}${item.path}`,
      name: item.name
    }))
  };
}

function churchSchema(church) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': ['Church', 'PlaceOfWorship'],
    name: church.name,
    description: church.description || `${church.name} is a ${church.denomination} church in ${church.suburb || church.city}, ${church.city}.`,
    url: church.url,
    address: {
      '@type': 'PostalAddress',
      streetAddress: church.address,
      addressLocality: church.city,
      addressRegion: church.province,
      addressCountry: 'ZA'
    }
  };
  if (Number.isFinite(church.lat) && Number.isFinite(church.lng)) {
    schema.geo = { '@type': 'GeoCoordinates', latitude: church.lat, longitude: church.lng };
  }
  if (church.phone) schema.telephone = church.phone;
  if (church.email) schema.email = church.email;
  if (church.website) schema.sameAs = [church.website];
  const hours = openingHours(church.service_times);
  if (hours) schema.openingHours = hours;
  return schema;
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function redirectStub({ title, fromPath, toPath, noindex = true }) {
  const to = `${SITE}${toPath}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${esc(title)}</title>
  <link rel="canonical" href="${to}">
  <meta http-equiv="refresh" content="0; url=${toPath}">
  <meta name="robots" content="${noindex ? 'noindex,follow' : 'index,follow'}">
  <meta property="og:url" content="${to}">
  <meta property="og:image" content="${OG_IMAGE}">
  <meta name="twitter:card" content="summary_large_image">
</head>
<body>
  <p>This page has moved to <a href="${toPath}">${esc(to)}</a>.</p>
</body>
</html>`;
}

function buildChurchPage(church) {
  const address = [church.address, church.suburb, church.city, church.province].filter(Boolean).join(', ');
  const service = normalizeServiceTimes(church.service_times);
  const cityUrl = `${SITE}/churches/${church.citySlug}.html`;
  const denomUrl = `${SITE}/denominations/${church.denominationSlug}.html`;
  const title = `${church.name} &mdash; ${church.denomination} Church in ${church.suburb || church.city}, ${church.city} | Service Times & Contact`;
  const description = church.description || `${church.name} is a ${church.denomination} church in ${church.suburb || church.city}, ${church.city}. Find the address, service times, contact details and map link.`;
  const mapLink = Number.isFinite(church.lat) && Number.isFinite(church.lng)
    ? `https://www.google.com/maps/dir/?api=1&destination=${church.lat},${church.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return page({
    title: title.replace(/&mdash;/g, '—'),
    description,
    canonical: church.url,
    active: 'home',
    extraHead: `${scriptJson(churchSchema(church))}
  ${scriptJson(breadcrumbSchema([
    { name: 'Home', url: `${SITE}/` },
    { name: `${church.city} churches`, url: cityUrl },
    { name: `${church.denomination} churches`, url: denomUrl },
    { name: church.name, url: church.url }
  ]))}`,
    main: `<main class="container--medium" id="main">
    <nav class="breadcrumb"><a href="/">Home</a> <span>/</span> <a href="/churches/${church.citySlug}.html">${esc(church.city)}</a> <span>/</span> <a href="/denominations/${church.denominationSlug}.html">${esc(church.denomination)}</a></nav>
    <article class="content-page">
      <h1>${esc(church.name)}</h1>
      <p class="lead">${esc(description)}</p>
      <section class="detail-card">
        <h2>Church Details</h2>
        <p><strong>Denomination:</strong> ${esc(church.denomination)}</p>
        <p><strong>Address:</strong> ${esc(address)}</p>
        ${service ? `<p><strong>Service times:</strong> ${esc(service)}</p>` : ''}
        ${church.phone ? `<p><strong>Phone:</strong> <a href="tel:${attr(church.phone)}">${esc(church.phone)}</a></p>` : ''}
        ${church.email ? `<p><strong>Email:</strong> <a href="mailto:${attr(church.email)}">${esc(church.email)}</a></p>` : ''}
        ${church.website ? `<p><strong>Website:</strong> <a href="${attr(church.website)}" target="_blank" rel="noopener">${esc(church.website.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a></p>` : ''}
        <p><a class="btn-primary" href="${attr(mapLink)}" target="_blank" rel="noopener">Open map</a></p>
      </section>
      <section class="content-section">
        <h2>Explore Nearby</h2>
        <p><a href="/churches/${church.citySlug}.html">View all churches in ${esc(church.city)}</a>.</p>
        <p><a href="/denominations/${church.denominationSlug}.html">View all ${esc(church.denomination)} churches in South Africa</a>.</p>
      </section>
    </article>
  </main>`
  });
}

function buildCityPage(city, churches) {
  const slug = slugify(city);
  const grouped = Array.from(groupBy(churches, c => c.denomination).entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const title = `Churches in ${city}: Full Directory by Denomination & Suburb (2026)`;
  const description = `Browse ${churches.length} churches in ${city}. Find addresses, service times, denominations, suburbs and contact details.`;
  const cards = grouped.map(([denom, items]) => `<section class="content-section">
      <h2>${esc(denom)}</h2>
      <div class="church-grid">${items.map(churchCard).join('')}</div>
    </section>`).join('');
  return page({
    title,
    description,
    canonical: `${SITE}/churches/${slug}.html`,
    active: 'home',
    extraHead: `${scriptJson(itemListSchema(churches))}
  ${scriptJson(breadcrumbSchema([{ name: 'Home', url: `${SITE}/` }, { name: `Churches in ${city}`, url: `${SITE}/churches/${slug}.html` }]))}`,
    main: `<main class="container--medium" id="main">
      <h1>Churches in ${esc(city)}</h1>
      <p class="lead">${esc(description)}</p>
      ${cards}
      <section class="content-section"><h2>City Guide</h2><p><a href="/blog/churches-near-me-${slug}.html">Read the ${esc(city)} church guide</a>.</p></section>
    </main>`
  });
}

function buildDenominationPage(denom, churches) {
  const slug = slugify(denom);
  const grouped = Array.from(groupBy(churches, c => c.city).entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const title = `${denom} Churches in South Africa: Directory by City`;
  const description = `Browse ${churches.length} ${denom} churches in South Africa. Find listings by city with addresses, contact details and service times.`;
  const sections = grouped.map(([city, items]) => `<section class="content-section">
      <h2>${esc(city)}</h2>
      <div class="church-grid">${items.map(churchCard).join('')}</div>
    </section>`).join('');
  return page({
    title,
    description,
    canonical: `${SITE}/denominations/${slug}.html`,
    active: 'home',
    extraHead: `${scriptJson(itemListSchema(churches))}
  ${scriptJson(breadcrumbSchema([{ name: 'Home', url: `${SITE}/` }, { name: `${denom} churches`, url: `${SITE}/denominations/${slug}.html` }]))}`,
    main: `<main class="container--medium" id="main">
      <h1>${esc(denom)} Churches in South Africa</h1>
      <p class="lead">${esc(description)}</p>
      ${sections}
    </main>`
  });
}

function buildCombinedPage(city, denom, churches) {
  const citySlug = slugify(city);
  const denomSlug = slugify(denom);
  const title = `${denom} Churches in ${city}: Directory by Suburb (2026)`;
  const description = `Browse ${churches.length} ${denom} churches in ${city}. Find addresses, contact details and service times.`;
  return page({
    title,
    description,
    canonical: `${SITE}/churches/${citySlug}/${denomSlug}.html`,
    active: 'home',
    extraHead: `${scriptJson(itemListSchema(churches))}
  ${scriptJson(breadcrumbSchema([
    { name: 'Home', url: `${SITE}/` },
    { name: `Churches in ${city}`, url: `${SITE}/churches/${citySlug}.html` },
    { name: `${denom} churches in ${city}`, url: `${SITE}/churches/${citySlug}/${denomSlug}.html` }
  ]))}`,
    main: `<main class="container--medium" id="main">
      <h1>${esc(denom)} Churches in ${esc(city)}</h1>
      <p class="lead">${esc(description)}</p>
      <div class="church-grid">${churches.map(churchCard).join('')}</div>
    </main>`
  });
}

function buildHome(churches) {
  const cities = Array.from(groupBy(churches, c => c.city).keys()).sort();
  const denoms = Array.from(groupBy(churches, c => c.denomination).keys()).sort();
  const organization = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', name: 'ChurchesNearMe.co.za', url: `${SITE}/`, logo: OG_IMAGE },
      {
        '@type': 'WebSite',
        name: 'ChurchesNearMe.co.za',
        url: `${SITE}/`,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE}/?search={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      }
    ]
  };
  return page({
    title: 'Churches Near Me South Africa | Find Local Churches by City & Denomination',
    description: 'Find churches near you in South Africa. Search by city, denomination, address and service times. Browse verified church listings.',
    canonical: `${SITE}/`,
    active: 'home',
    extraHead: scriptJson(organization),
    main: `<section class="hero">
      <div class="container">
        <h1>Find Your Church Home</h1>
        <p>Discover churches across South Africa by city, denomination, and service times</p>
        <div class="search-bar">
          <label class="sr-only" for="searchInput">Search churches</label>
          <input type="text" id="searchInput" placeholder="Search churches, cities, denominations...">
          <button class="btn-primary" type="button" onclick="applyFilters()">Search</button>
        </div>
      </div>
    </section>
    <main class="container" id="main">
      <div class="filters">
        <div class="filters-header"><h2>Filter Churches</h2><button type="button" id="clearFiltersLink" class="clear-filters">Clear all</button></div>
        <div class="filter-grid">
          <div class="filter-group"><label for="cityFilter">City</label><select id="cityFilter"><option value="">All Cities</option>${cities.map(c => `<option value="${attr(c)}">${esc(c)}</option>`).join('')}</select></div>
          <div class="filter-group"><label for="denominationFilter">Denomination</label><select id="denominationFilter"><option value="">All Denominations</option>${denoms.map(d => `<option value="${attr(d)}">${esc(d)}</option>`).join('')}</select></div>
        </div>
      </div>
      <div class="results">
        <div class="results-header"><h2 id="resultsTitle">${churches.length} Churches Found</h2></div>
        <div id="churchList" class="church-grid">${churches.map(churchCard).join('')}</div>
      </div>
    </main>
    <script>
      function applyFilters() {
        var city = document.getElementById('cityFilter').value.toLowerCase();
        var denom = document.getElementById('denominationFilter').value.toLowerCase();
        var search = document.getElementById('searchInput').value.toLowerCase();
        var count = 0;
        document.querySelectorAll('#churchList .church-card-link').forEach(function(link) {
          var card = link.querySelector('.church-card');
          var text = link.textContent.toLowerCase();
          var ok = (!city || (card.dataset.city || '').toLowerCase() === city) && (!denom || (card.dataset.denomination || '').toLowerCase() === denom) && (!search || text.indexOf(search) !== -1);
          link.style.display = ok ? 'block' : 'none';
          if (ok) count += 1;
        });
        document.getElementById('resultsTitle').textContent = count + ' Churches Found';
      }
      document.getElementById('cityFilter').addEventListener('change', applyFilters);
      document.getElementById('denominationFilter').addEventListener('change', applyFilters);
      document.getElementById('searchInput').addEventListener('input', applyFilters);
      document.getElementById('clearFiltersLink').addEventListener('click', function() {
        document.getElementById('cityFilter').value = '';
        document.getElementById('denominationFilter').value = '';
        document.getElementById('searchInput').value = '';
        applyFilters();
      });
    </script>`
  });
}

function extractTitle(html, fallback) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return (h1 || title) ? (h1 || title)[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : fallback;
}

function extractDescription(html) {
  const match = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)/i);
  return match ? match[1] : 'Church guide and directory resource for South Africa.';
}

function buildBlogIndex(redirectPosts) {
  const blogDir = path.join(ROOT, 'blog');
  const files = fs.readdirSync(blogDir).filter(file => file.endsWith('.html') && file !== 'index.html' && !redirectPosts.has(file));
  const posts = files.map(file => {
    const html = fs.readFileSync(path.join(blogDir, file), 'utf8');
    const title = extractTitle(html, file.replace(/-/g, ' ').replace(/\.html$/, ''));
    const description = extractDescription(html);
    let group = 'Resources';
    if (/churches-near-me-|best-churches-johannesburg/.test(file)) group = 'City Guides';
    if (/best-(afm|anglican|baptist|catholic|methodist|ng-kerk|pentecostal)/.test(file)) group = 'Denomination Guides';
    return { file, title, description, group };
  }).sort((a, b) => a.title.localeCompare(b.title));
  const sections = ['City Guides', 'Denomination Guides', 'Resources'].map(group => {
    const items = posts.filter(post => post.group === group);
    if (!items.length) return '';
    return `<section class="content-section"><h2>${group}</h2><div class="blog-grid">${items.map(post => `<article class="post-card"><h3>${esc(post.title)}</h3><p>${esc(post.description)}</p><a class="read-more" href="/blog/${post.file}">Read guide</a></article>`).join('')}</div></section>`;
  }).join('');
  const faq = [
    ['How do I find a church near me?', 'Start with churches in your suburb or nearby areas, then filter by denomination and service time. Visiting two or three options usually makes the choice clear.'],
    ['Are listings on ChurchesNearMe verified?', 'Yes. Churches in the directory are checked before they go live. The About page explains the verification process.'],
    ['Can I add or update a church listing?', 'Yes. Use the Add or Claim Your Church page to submit a listing or update details.']
  ];
  return page({
    title: 'Church Guides & Resources | ChurchesNearMe.co.za Blog',
    description: 'Church guides and resources for South Africa. Browse city guides, denomination guides and practical church directory resources.',
    canonical: `${SITE}/blog/`,
    active: 'blog',
    extraHead: `${scriptJson({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } }))
    })}
  ${scriptJson(itemListSchema(posts.map(post => ({ name: post.title, url: `${SITE}/blog/${post.file}` }))))}`,
    main: `<section class="hero"><div class="container"><h1>Church Guides &amp; Resources</h1><p>Browse city guides, denomination guides and practical resources.</p></div></section>
    <main class="container" id="main">
      ${sections}
      <section class="content-section"><h2>Questions</h2>${faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}</section>
    </main>`
  });
}

function buildChangelog(redirectPosts) {
  const entries = Array.from(redirectPosts).map(file => {
    const html = fs.readFileSync(path.join(ROOT, 'blog', file), 'utf8');
    return { file, title: extractTitle(html, file), description: extractDescription(html) };
  }).sort((a, b) => b.file.localeCompare(a.file));
  return page({
    title: 'Directory Updates | ChurchesNearMe.co.za',
    description: 'A single changelog for new verified church listings added to ChurchesNearMe.co.za.',
    canonical: `${SITE}/blog/directory-updates.html`,
    active: 'blog',
    main: `<main class="container--medium" id="main">
      <h1>Directory Updates</h1>
      <p class="lead">New listing updates now live on this page. We update it in place.</p>
      <section class="content-section">
        ${entries.map(entry => `<article class="post-card"><h2>${esc(entry.title)}</h2><p>${esc(entry.description)}</p></article>`).join('')}
      </section>
    </main>`
  });
}

function buildTrustPages() {
  write(path.join(ROOT, 'about.html'), page({
    title: 'About ChurchesNearMe.co.za | Verification Process',
    description: 'Learn who runs ChurchesNearMe.co.za and how church listings are checked before they go live.',
    canonical: `${SITE}/about.html`,
    main: `<main class="container--narrow" id="main"><h1>About ChurchesNearMe.co.za</h1><p>ChurchesNearMe.co.za is a South African church directory built to help people find local congregations by city, suburb and denomination.</p><h2>How verification works</h2><p>We check each listing before it goes live. We review the church name, address, city, denomination, public website or contact details, and map location where available. Claimed listings can be updated by a church representative.</p><h2>Corrections</h2><p>If a listing is wrong or outdated, use the contact page or claim the church page so we can update it.</p></main>`
  }));
  write(path.join(ROOT, 'contact.html'), page({
    title: 'Contact ChurchesNearMe.co.za',
    description: 'Contact ChurchesNearMe.co.za to update a church listing, report an error, or ask about featured church pages.',
    canonical: `${SITE}/contact.html`,
    main: `<main class="container--narrow" id="main"><h1>Contact</h1><p>Need to update a church listing or report an error? Send the details through the Add or Claim Your Church page.</p><p><a class="btn-primary" href="/claim.html">Add or Claim Your Church</a></p></main>`
  }));
  write(path.join(ROOT, 'privacy.html'), page({
    title: 'Privacy Policy | ChurchesNearMe.co.za',
    description: 'Privacy policy for ChurchesNearMe.co.za.',
    canonical: `${SITE}/privacy.html`,
    main: `<main class="container--narrow" id="main"><h1>Privacy Policy</h1><p>We collect listing details submitted by churches and public contact information used for directory pages. We use this information to maintain the directory and respond to listing requests.</p><p>We do not sell personal information. Third-party services such as analytics, maps, payment providers, and hosting platforms may process standard technical data.</p></main>`
  }));
}

function ensureOgImage() {
  const dir = path.join(ROOT, 'assets');
  fs.mkdirSync(dir, { recursive: true });
  const png = 'iVBORw0KGgoAAAANSUhEUgAABAAAAAJACAIAAADwZLhVAAAB8ElEQVR4nO3VwQ3AIBDAsNL9d25XIC+EZE8QZKZnVgEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALzY7wAAgN83AAAAAAAAAAAAAABgQAEAAAAAAAAAAADAggIAAAAAAAAAAACAAgUAAAAAAAAAAEDBAQAAAAAAAAAAAEGBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIEBAAAAAAAAAAAAQIHhAT7nBCFiHNhNAAAAAElFTkSuQmCC';
  fs.writeFileSync(path.join(dir, 'og-image.png'), Buffer.from(png, 'base64'));
}

function updateExistingHtmlMetadata(redirectPosts) {
  const htmlFiles = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      if (entry.isFile() && entry.name.endsWith('.html')) htmlFiles.push(full);
    }
  }
  walk(ROOT);
  for (const file of htmlFiles) {
    const rel = path.relative(ROOT, file);
    if (redirectPosts.has(path.basename(file))) continue;
    if (/^churches\//.test(rel) || /^denominations\//.test(rel) || /^about\.html|^contact\.html|^privacy\.html|^index\.html|^blog\/index\.html|^blog\/directory-updates\.html/.test(rel)) continue;
    let html = fs.readFileSync(file, 'utf8');
    html = html.replaceAll(BARE, SITE);
    html = html.replaceAll('/blog/index.html', '/blog/');
    html = html.replace(/<meta name="twitter:card" content="summary">/g, '<meta name="twitter:card" content="summary_large_image">');
    if (!/link rel="canonical"/.test(html)) {
      const relPath = rel === 'blog/index.html' ? 'blog/' : rel.replace(/index\.html$/, '');
      html = html.replace(/<\/title>\n?/i, match => `${match}  <link rel="canonical" href="${SITE}/${relPath}">\n`);
    }
    if (!/property="og:url"/.test(html)) {
      const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/i) || [null, `${SITE}/${rel}`])[1];
      html = html.replace(/<\/title>\n?/i, match => `${match}  <meta property="og:url" content="${canonical}">\n`);
    }
    if (!/property="og:image"/.test(html)) {
      html = /<meta property="og:site_name"[^>]*>\n?/i.test(html)
        ? html.replace(/<meta property="og:site_name"[^>]*>\n?/i, match => `${match}  <meta property="og:image" content="${OG_IMAGE}">\n`)
        : html.replace(/<\/head>/i, `  <meta property="og:image" content="${OG_IMAGE}">\n</head>`);
    }
    if (!/name="twitter:card"/.test(html)) {
      html = html.replace(/<\/head>/i, `  <meta name="twitter:card" content="summary_large_image">\n</head>`);
    }
    if (!/name="twitter:image"/.test(html)) {
      html = /<meta name="twitter:description"[^>]*>\n?/i.test(html)
        ? html.replace(/<meta name="twitter:description"[^>]*>\n?/i, match => `${match}  <meta name="twitter:image" content="${OG_IMAGE}">\n`)
        : html.replace(/<\/head>/i, `  <meta name="twitter:image" content="${OG_IMAGE}">\n</head>`);
    }
    html = html.replace(/<a href="\/claim\.html">Claim Your Church<\/a>\s*/g, '');
    html = html.replace(/<a href="\/claim\.html">Add Your Church<\/a>/g, '<a href="/claim.html">Add or Claim Your Church</a>');
    html = html.replace(/<a href="\/submit\.html">Add Your Church<\/a>/g, '<a href="/claim.html">Add or Claim Your Church</a>');
    html = html.replace(/\|\s*\|/g, '|');
    html = html.replace(/Get Featured \(R199\/mo\)/g, 'Get Featured');
    if (!/<h1\b/i.test(html) && rel === 'war-room.html') {
      html = /<main[^>]*>/i.test(html)
        ? html.replace(/<main[^>]*>/i, match => `${match}\n    <h1 class="sr-only">ChurchesNearMe War Room</h1>`)
        : html.replace(/<body[^>]*>/i, match => `${match}\n    <h1 class="sr-only">ChurchesNearMe War Room</h1>`);
    }
    fs.writeFileSync(file, html, 'utf8');
  }
}

function rewriteLegacyChurchLinks(churches) {
  const map = new Map(churches.map(church => [church.slug, church.path]));
  const htmlFiles = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      if (entry.isFile() && entry.name.endsWith('.html')) htmlFiles.push(full);
    }
  }
  walk(ROOT);
  for (const file of htmlFiles) {
    let html = fs.readFileSync(file, 'utf8');
    for (const [slug, newPath] of map) {
      html = html.replaceAll(`/churches/${slug}/`, newPath);
      html = html.replaceAll(`${SITE}/churches/${slug}/`, `${SITE}${newPath}`);
      html = html.replaceAll(`${BARE}/churches/${slug}/`, `${SITE}${newPath}`);
    }
    html = html.replace(/href="\/churches\/([^/"']+)\/"/g, 'href="/church.html?slug=$1"');
    html = html.replace(/href='\/churches\/([^/"']+)\/'/g, "href='/church.html?slug=$1'");
    html = html.replace(/"\/churches\/"\s*\+\s*escapeHtml\(church\.slug\)\s*\+\s*"\/"/g, '"/church.html?slug=" + escapeHtml(church.slug)');
    html = html.replace(/'\/churches\/'\s*\+\s*escapeHtml\(church\.slug\)\s*\+\s*'\/'/g, "'/church.html?slug=' + escapeHtml(church.slug)");
    html = html.replace(/"\/churches\/"\s*\+\s*escapeHtml\(c\.slug\)\s*\+\s*"\/"/g, '"/church.html?slug=" + escapeHtml(c.slug)');
    html = html.replace(/'\/churches\/'\s*\+\s*escapeHtml\(c\.slug\)\s*\+\s*'\/'/g, "'/church.html?slug=' + escapeHtml(c.slug)");
    html = html.replace(/"\/churches\/"\s*\+\s*c\.slug\s*\+\s*"\/"/g, '"/church.html?slug=" + c.slug');
    html = html.replace(/'\/churches\/'\s*\+\s*c\.slug\s*\+\s*'\/'/g, "'/church.html?slug=' + c.slug");
    html = html.replaceAll('href="/churches/\' + c.slug + \'/','href="/church.html?slug=\' + c.slug + \'');
    html = html.replaceAll('href="/churches/\' + escapeHtml(church.slug) + \'/','href="/church.html?slug=\' + escapeHtml(church.slug) + \'');
    html = html.replaceAll('href="/churches/\' + escapeHtml(c.slug) + \'/','href="/church.html?slug=\' + escapeHtml(c.slug) + \'');
    html = html.replace(/https:\/\/www\.churchesnearme\.co\.za\/churches\/"\s*\+\s*church\.slug\s*\+\s*"\/"/g, 'https://www.churchesnearme.co.za/church.html?slug=" + church.slug');
    html = html.replace(/https:\/\/www\.churchesnearme\.co\.za\/churches\/'\s*\+\s*church\.slug\s*\+\s*'\/'/g, "https://www.churchesnearme.co.za/church.html?slug=' + church.slug");
    fs.writeFileSync(file, html, 'utf8');
  }
}

function buildSitemap(urls) {
  const body = urls.sort().map(url => `  <url><loc>${url}</loc><lastmod>${UPDATED}</lastmod></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function cleanOldGeneratedDirs() {
  for (const dir of ['churches', 'denominations']) {
    fs.rmSync(path.join(ROOT, dir), { recursive: true, force: true });
    fs.mkdirSync(path.join(ROOT, dir), { recursive: true });
  }
}

async function main() {
  let churches;
  try {
    churches = await fetchChurches();
  } catch (err) {
    console.warn(`Supabase fetch failed. Using local seed files. ${err.message}`);
    churches = parseSeedFiles();
  }
  churches = withUrls(churches);
  cleanOldGeneratedDirs();
  ensureOgImage();

  const urls = new Set([`${SITE}/`, `${SITE}/about.html`, `${SITE}/contact.html`, `${SITE}/privacy.html`, `${SITE}/claim.html`, `${SITE}/featured.html`, `${SITE}/blog/`, `${SITE}/blog/directory-updates.html`]);

  write(path.join(ROOT, 'index.html'), buildHome(churches));
  for (const church of churches) {
    write(path.join(ROOT, church.path.replace(/^\//, '')), buildChurchPage(church));
    write(path.join(ROOT, church.oldPath.replace(/^\//, ''), 'index.html'), redirectStub({ title: `${church.name} moved`, fromPath: church.oldPath, toPath: church.path }));
    urls.add(church.url);
  }

  const cityGroups = groupBy(churches, c => c.city);
  for (const [city, items] of cityGroups) {
    const citySlug = slugify(city);
    write(path.join(ROOT, 'churches', `${citySlug}.html`), buildCityPage(city, items));
    write(path.join(ROOT, 'cities', `${citySlug}.html`), redirectStub({ title: `Churches in ${city} moved`, fromPath: `/cities/${citySlug}.html`, toPath: `/churches/${citySlug}.html` }));
    urls.add(`${SITE}/churches/${citySlug}.html`);
  }

  const denomGroups = groupBy(churches, c => c.denomination);
  for (const [denom, items] of denomGroups) {
    const denomSlug = slugify(denom);
    write(path.join(ROOT, 'denominations', `${denomSlug}.html`), buildDenominationPage(denom, items));
    urls.add(`${SITE}/denominations/${denomSlug}.html`);
  }

  let combinedCount = 0;
  for (const [city, cityChurches] of cityGroups) {
    for (const [denom, items] of groupBy(cityChurches, c => c.denomination)) {
      if (items.length < 5) continue;
      const citySlug = slugify(city);
      const denomSlug = slugify(denom);
      write(path.join(ROOT, 'churches', citySlug, `${denomSlug}.html`), buildCombinedPage(city, denom, items));
      urls.add(`${SITE}/churches/${citySlug}/${denomSlug}.html`);
      combinedCount += 1;
    }
  }

  const redirectPosts = new Set(fs.readdirSync(path.join(ROOT, 'blog')).filter(file => /^(new-|fresh-verified-).+\.html$/.test(file)));
  write(path.join(ROOT, 'blog', 'directory-updates.html'), buildChangelog(redirectPosts));
  for (const file of redirectPosts) {
    write(path.join(ROOT, 'blog', file), redirectStub({ title: 'Directory update moved', fromPath: `/blog/${file}`, toPath: '/blog/directory-updates.html', noindex: false }));
  }
  write(path.join(ROOT, 'blog', 'index.html'), buildBlogIndex(redirectPosts));
  buildTrustPages();
  rewriteLegacyChurchLinks(churches);
  updateExistingHtmlMetadata(redirectPosts);

  const blogFiles = fs.readdirSync(path.join(ROOT, 'blog')).filter(file => file.endsWith('.html') && !redirectPosts.has(file) && file !== 'index.html');
  for (const file of blogFiles) urls.add(`${SITE}/blog/${file}`);
  write(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
  write(path.join(ROOT, 'sitemap.xml'), buildSitemap(Array.from(urls)));
  write(path.join(ROOT, 'CNAME'), 'www.churchesnearme.co.za\n');
  write(path.join(ROOT, 'SEO-BUILD-REPORT.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    churches: churches.length,
    churchPages: churches.length,
    oldChurchRedirects: churches.length,
    cityPages: cityGroups.size,
    denominationPages: denomGroups.size,
    combinedPages: combinedCount,
    directoryUpdateRedirects: redirectPosts.size,
    canonicalHost: SITE,
    manualGscSubmissionNeeded: true,
    bareDomainRedirect: 'Set DNS/provider redirect from churchesnearme.co.za to www.churchesnearme.co.za if not already configured.'
  }, null, 2));

  console.log(`Generated ${churches.length} church pages, ${cityGroups.size} city pages, ${denomGroups.size} denomination pages, ${combinedCount} combined pages.`);
  console.log(`Redirected ${churches.length} old church URLs and ${redirectPosts.size} dated update posts.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
