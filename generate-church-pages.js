#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const SUPABASE_URL = 'https://npfbrorgnwhrbpfbqiuh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wZmJyb3JnbndocmJwZmJxaXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MjAyNTcsImV4cCI6MjA4ODA5NjI1N30.uQ5fMaYuQmaBCXmq84QWTpkUp9U-cZ3gEQyB4-kMzZ4';
const SITE_URL = 'https://churchesnearme.co.za';

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

function formatServiceTimes(serviceTimes) {
  if (!serviceTimes) return '';
  return escapeHtml(serviceTimes).replace(/\r?\n/g, '<br>');
}

function getDistance(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function hasCoordinates(church) {
  const lat = Number(church.lat);
  const lng = Number(church.lng);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function buildNearby(church, churches) {
  if (!hasCoordinates(church)) return [];
  const lat = Number(church.lat);
  const lng = Number(church.lng);

  return churches
    .filter(c => c.slug !== church.slug && hasCoordinates(c))
    .map(c => ({
      ...c,
      distance: getDistance(lat, lng, Number(c.lat), Number(c.lng))
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);
}

function buildChurchPage(church, nearby) {
  const name = escapeHtml(church.name || 'Church');
  const city = escapeHtml(church.city || '');
  const province = escapeHtml(church.province || '');
  const denomination = escapeHtml(church.denomination || 'Christian');
  const cityLabel = city || 'South Africa';
  const slug = church.slug || slugify(`${church.name || ''}-${church.city || ''}`);
  const canonicalUrl = `${SITE_URL}/churches/${slug}/`;
  const description = `Visit ${church.name || 'this church'}, a ${church.denomination || 'Christian'} church in ${church.city || 'South Africa'}, ${church.province || ''}. ${church.address ? `Located at ${church.address}, ${church.city || 'South Africa'}.` : ''} Find service times, contact details, directions and more.`.replace(/\s+,/g, ',').replace(/\s{2,}/g, ' ').trim();
  const safeDescription = escapeHtml(description);

  const phone = church.phone ? String(church.phone).trim() : '';
  const email = church.email ? String(church.email).trim() : '';
  const website = normalizeWebsite(church.website);
  const serviceTimes = formatServiceTimes(church.service_times);
  const address = escapeHtml([church.address, church.city, church.province].filter(Boolean).join(', '));
  const lat = Number(church.lat);
  const lng = Number(church.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Church',
    name: church.name || 'Church',
    address: {
      '@type': 'PostalAddress',
      streetAddress: church.address || '',
      addressLocality: church.city || '',
      addressRegion: church.province || '',
      addressCountry: 'ZA'
    },
    geo: hasCoords ? {
      '@type': 'GeoCoordinates',
      latitude: lat,
      longitude: lng
    } : undefined,
    telephone: phone || undefined,
    url: canonicalUrl
  };

  const schemaJson = JSON.stringify(schema, null, 2).replace(/\n\s+"geo": undefined,?/g, '').replace(/\n\s+"telephone": undefined,?/g, '');

  const nearbyHtml = nearby.length > 0
    ? `<section class="nearby-section">
        <h2>Nearby Churches</h2>
        <div class="nearby-grid">
          ${nearby.map(n => `
            <a href="/churches/${escapeHtml(n.slug)}/" class="nearby-card">
              <h3>${escapeHtml(n.name || 'Church')}</h3>
              ${n.denomination ? `<div class="nearby-denom">${escapeHtml(n.denomination)}</div>` : ''}
              <div class="nearby-addr">📍 ${escapeHtml([n.address, n.city].filter(Boolean).join(', '))} · ${n.distance.toFixed(1)} km</div>
            </a>
          `).join('')}
        </div>
      </section>`
    : '';

  const citySlug = city ? slugify(city) : '';
  const denomSlug = denomination ? slugify(denomination) : '';
  const cityPath = citySlug ? `/cities/${citySlug}.html` : '';
  const denomPath = denomSlug ? `/denominations/${denomSlug}.html` : '';
  const cityExists = citySlug ? fs.existsSync(path.join(__dirname, 'cities', `${citySlug}.html`)) : false;
  const denomExists = denomSlug ? fs.existsSync(path.join(__dirname, 'denominations', `${denomSlug}.html`)) : false;

  const exploreHtml = (cityExists || denomExists)
    ? `<section class="explore-section">
        <h2>Explore More</h2>
        <div class="explore-grid">
          ${cityExists ? `<a href="${cityPath}" class="explore-card">
            <div class="explore-label">More churches in</div>
            <div class="explore-title">${cityLabel}</div>
          </a>` : ''}
          ${denomExists ? `<a href="${denomPath}" class="explore-card">
            <div class="explore-label">More</div>
            <div class="explore-title">${denomination} churches</div>
          </a>` : ''}
        </div>
      </section>`
    : '';

  const localBlurb = `<section class="local-blurb">
      <h2>Churches in ${cityLabel}</h2>
      <p>If you're looking for a ${denomination} church in ${cityLabel}, this listing is a solid starting point. We keep verified churches in ${province || 'South Africa'} on one page so you can compare location, service times, and contact details without bouncing around.</p>
      <p>${cityLabel} has a wide mix of denominations and church styles — traditional, modern, family-focused, and youth-led. If this church isn’t the right fit, use the links below to explore nearby options or the broader ${denomination} directory.</p>
    </section>`;

  const faqItems = [
    {
      q: `What time are services at ${name}?`,
      a: serviceTimes ? `Service times listed: ${serviceTimes.replace(/<br>/g, ', ')}.` : `Service times aren't listed yet. Call the church or visit their website for the latest schedule.`
    },
    {
      q: `Where is ${name} located?`,
      a: address ? `${name} is located at ${address}.` : `The address isn't listed yet. Use the contact details to confirm the location.`
    },
    {
      q: `How do I contact ${name}?`,
      a: phone || email || website
        ? `You can contact ${name} ${phone ? `by phone at ${phone}` : ''}${phone && (email || website) ? ', ' : ''}${email ? `via email at ${email}` : ''}${(phone || email) && website ? ', or visit their website.' : website ? `through their website.` : '.'}`
        : `Contact details aren't listed yet. If you represent this church, use the Add Your Church form.`
    },
    {
      q: `Is this church verified?`,
      a: `Yes. This listing is marked as verified in our directory.`
    }
  ];

  const faqHtml = `<section class="faq-section">
      <h2>Frequently Asked Questions</h2>
      <div class="faq-list">
        ${faqItems.map(item => `
          <div class="faq-item">
            <h3>${escapeHtml(item.q)}</h3>
            <p>${escapeHtml(item.a)}</p>
          </div>
        `).join('')}
      </div>
    </section>`;

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a
      }
    }))
  };

  const breadcrumbs = [
    { name: 'Home', item: `${SITE_URL}/` },
    cityExists ? { name: `${cityLabel} churches`, item: `${SITE_URL}${cityPath}` } : null,
    denomExists ? { name: `${denomination} churches`, item: `${SITE_URL}${denomPath}` } : null,
    { name: name, item: canonicalUrl }
  ].filter(Boolean);

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: crumb.name,
      item: crumb.item
    }))
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} - ${denomination} Church in ${cityLabel} | ChurchesNearMe</title>
  <meta name="description" content="${safeDescription}">
  <link rel="canonical" href="${canonicalUrl}">
  <meta property="og:title" content="${name} - ${denomination} Church in ${cityLabel} | ChurchesNearMe">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:type" content="website">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css?v=2">
  <style>
    .church-hero {
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.94));
      color: white;
      padding: 48px 0 32px;
    }
    .church-hero .container {
      display: grid;
      gap: 12px;
    }
    .church-hero h1 {
      font-size: 36px;
      margin: 0;
    }
    .church-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
    }
    .church-badge {
      display: inline-flex;
      align-items: center;
      padding: 6px 14px;
      border-radius: 999px;
      background: var(--gold);
      color: var(--navy);
      font-weight: 600;
      font-size: 14px;
    }
    .featured-badge {
      display: inline-flex;
      align-items: center;
      padding: 6px 14px;
      border-radius: 999px;
      background: #fef3c7;
      color: #92400e;
      font-weight: 600;
      font-size: 13px;
    }
    .church-page {
      padding: 32px 0 64px;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
      gap: 24px;
      align-items: start;
    }
    .detail-card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
      border: 1px solid var(--border);
    }
    .detail-card h2 {
      margin-top: 0;
      margin-bottom: 16px;
      color: var(--navy);
      font-size: 22px;
    }
    .info-row {
      display: flex;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid #eef2f6;
    }
    .info-row:last-child { border-bottom: none; }
    .info-icon { font-size: 18px; }
    .info-label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .info-value { font-size: 16px; color: var(--text); font-weight: 500; margin-top: 4px; }
    .info-value a { color: var(--gold); text-decoration: none; }
    .info-value a:hover { text-decoration: underline; }
    .action-row {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 20px;
    }
    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 18px;
      border-radius: 10px;
      font-weight: 600;
      text-decoration: none;
      border: 1px solid transparent;
    }
    .action-primary {
      background: var(--gold);
      color: var(--navy);
    }
    .action-primary:hover { background: var(--gold-light); }
    .action-secondary {
      background: var(--navy);
      color: white;
    }
    .action-outline {
      border-color: var(--navy);
      color: var(--navy);
    }
    .action-outline:hover { background: var(--navy); color: white; }
    .map-card {
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
      border: 1px solid var(--border);
    }
    .map-card iframe {
      width: 100%;
      height: 320px;
      border: 0;
    }
    .map-card .map-info {
      padding: 16px 20px;
      background: #f8fafc;
    }
    .nearby-section {
      margin-top: 32px;
    }
    .nearby-section h2 {
      color: var(--navy);
      margin-bottom: 16px;
      font-size: 22px;
    }
    .nearby-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
    }
    .nearby-card {
      background: white;
      border-radius: 14px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
      border: 1px solid var(--border);
      text-decoration: none;
      color: inherit;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .nearby-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 18px rgba(15, 23, 42, 0.12);
    }
    .nearby-card h3 {
      margin: 0 0 6px 0;
      color: var(--navy);
      font-size: 16px;
    }
    .nearby-denom { color: var(--gold); font-size: 13px; font-weight: 600; }
    .nearby-addr { color: var(--muted); font-size: 13px; margin-top: 6px; }

    .explore-section { margin-top: 28px; }
    .explore-section h2 { color: var(--navy); margin-bottom: 14px; font-size: 22px; }
    .explore-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
    .explore-card { background: #f8fafc; border-radius: 14px; padding: 18px; border: 1px solid var(--border); text-decoration: none; color: var(--navy); transition: transform 0.15s ease, box-shadow 0.15s ease; }
    .explore-card:hover { transform: translateY(-2px); box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12); }
    .explore-label { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
    .explore-title { font-size: 18px; font-weight: 700; color: #1d4ed8; }

    .local-blurb { margin-top: 28px; background: #f8fafc; border: 1px solid var(--border); border-radius: 16px; padding: 20px 22px; }
    .local-blurb h2 { color: var(--navy); margin-bottom: 10px; font-size: 22px; }
    .local-blurb p { color: var(--muted); line-height: 1.7; margin: 0 0 10px 0; }

    .faq-section { margin-top: 28px; }
    .faq-section h2 { color: var(--navy); margin-bottom: 12px; font-size: 22px; }
    .faq-list { display: grid; gap: 12px; }
    .faq-item { background: #fff; border: 1px solid var(--border); border-radius: 14px; padding: 16px; }
    .faq-item h3 { margin: 0 0 6px 0; font-size: 16px; color: var(--navy); }
    .faq-item p { margin: 0; color: var(--muted); line-height: 1.6; }

    @media (max-width: 900px) {
      .detail-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 640px) {
      .church-hero h1 { font-size: 28px; }
      .detail-card { padding: 20px; }
      .action-row { flex-direction: column; }
      .action-btn { justify-content: center; }
    }
  </style>
  <script type="application/ld+json">
${schemaJson}
  </script>
  <script type="application/ld+json">
${JSON.stringify(faqSchema, null, 2)}
  </script>
  <script type="application/ld+json">
${JSON.stringify(breadcrumbSchema, null, 2)}
  </script>
</head>
<body>
  <header>
    <div class="container">
      <div class="header-content">
        <div class="logo">⛪ ChurchesNearMe</div>
        <button class="nav-toggle" type="button" aria-label="Toggle navigation" aria-expanded="false">
          <span></span>
          <span></span>
          <span></span>
        </button>
        <nav class="nav-menu">
          <a href="/">Home</a>
          <a href="/submit.html">Add Your Church</a>
          <a href="/featured.html">Get Featured</a>
        </nav>
      </div>
    </div>
  </header>

  <section class="church-hero">
    <div class="container">
      <div class="church-meta">
        <span class="church-badge">${denomination}</span>
        ${church.featured ? '<span class="featured-badge">Featured</span>' : ''}
      </div>
      <h1>${name}</h1>
      <div>${address}</div>
    </div>
  </section>

  <main class="church-page">
    <div class="container">
      <div class="detail-grid">
        <div class="detail-card">
          <h2>Church Details</h2>
          <div class="info-row">
            <div class="info-icon">📍</div>
            <div>
              <div class="info-label">Address</div>
              <div class="info-value">${address}</div>
            </div>
          </div>
          ${phone ? `
          <div class="info-row">
            <div class="info-icon">📞</div>
            <div>
              <div class="info-label">Phone</div>
              <div class="info-value"><a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a></div>
            </div>
          </div>` : ''}
          ${email ? `
          <div class="info-row">
            <div class="info-icon">✉️</div>
            <div>
              <div class="info-label">Email</div>
              <div class="info-value"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></div>
            </div>
          </div>` : ''}
          ${website ? `
          <div class="info-row">
            <div class="info-icon">🌐</div>
            <div>
              <div class="info-label">Website</div>
              <div class="info-value"><a href="${escapeHtml(website)}" target="_blank" rel="noopener">${escapeHtml(website.replace(/^https?:\/\//i, '').replace(/\/$/, ''))}</a></div>
            </div>
          </div>` : ''}
          ${serviceTimes ? `
          <div class="info-row">
            <div class="info-icon">🕐</div>
            <div>
              <div class="info-label">Service Times</div>
              <div class="info-value">${serviceTimes}</div>
            </div>
          </div>` : ''}

          <div class="action-row">
            ${hasCoords ? `<a class="action-btn action-primary" href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" rel="noopener">📍 Get Directions</a>` : ''}
            ${phone ? `<a class="action-btn action-secondary" href="tel:${escapeHtml(phone)}">📞 Call</a>` : ''}
            ${website ? `<a class="action-btn action-outline" href="${escapeHtml(website)}" target="_blank" rel="noopener">🌐 Visit Website</a>` : ''}
          </div>
        </div>

        <div class="map-card">
          ${hasCoords ? `<iframe src="https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005},${lat - 0.003},${lng + 0.005},${lat + 0.003}&marker=${lat},${lng}&layers=M" allowfullscreen loading="lazy"></iframe>` : ''}
          <div class="map-info">
            <strong>Location</strong>
            <div>${address || 'Location details not available yet.'}</div>
          </div>
        </div>
      </div>

      ${localBlurb}
      ${nearbyHtml}
      ${exploreHtml}
      ${faqHtml}
    </div>
  </main>

  <footer>
    <div class="container">
      <p>&copy; 2026 ChurchesNearMe.co.za | Free church directory for South Africa</p>
      <p style="margin-top: 8px;">
        <a href="/submit.html">Add Your Church</a> | 
        <a href="/featured.html">Get Featured (R199/mo)</a>
      </p>
    </div>
  </footer>

  <script>
    var header = document.querySelector('header');
    var navToggle = document.querySelector('.nav-toggle');
    if (navToggle && header) {
      navToggle.addEventListener('click', function() {
        var isOpen = header.classList.toggle('nav-open');
        navToggle.setAttribute('aria-expanded', isOpen);
      });
    }
  </script>
</body>
</html>`;
}

function writeSitemap(churches) {
  const staticPages = [
    '/',
    '/submit.html',
    '/featured.html',
    '/church.html'
  ];

  const urls = [
    ...staticPages.map(page => `${SITE_URL}${page}`),
    ...churches.map(church => `${SITE_URL}/churches/${church.slug || slugify(`${church.name || ''}-${church.city || ''}`)}/`)
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(loc => `  <url><loc>${loc}</loc></url>`).join('\n') +
    `\n</urlset>\n`;

  fs.writeFileSync(path.join(process.cwd(), 'sitemap.xml'), xml, 'utf8');
}

async function main() {
  let churches = [];
  try {
    churches = await fetchChurches();
  } catch (err) {
    console.warn('Supabase fetch failed, falling back to seed file:', err.message);
    churches = loadChurchesFromSeed();
  }
  if (!churches.length) {
    console.error('No churches returned from Supabase.');
    process.exit(1);
  }

  const churchesDir = path.join(process.cwd(), 'churches');
  fs.mkdirSync(churchesDir, { recursive: true });

  const churchesWithSlugs = churches.map(church => ({
    ...church,
    slug: church.slug || slugify(`${church.name || ''}-${church.city || ''}`)
  }));

  for (const church of churchesWithSlugs) {
    const nearby = buildNearby(church, churchesWithSlugs);
    const html = buildChurchPage(church, nearby);
    const pageDir = path.join(churchesDir, church.slug);
    fs.mkdirSync(pageDir, { recursive: true });
    fs.writeFileSync(path.join(pageDir, 'index.html'), html, 'utf8');
  }

  writeSitemap(churchesWithSlugs);

  console.log(`Generated ${churchesWithSlugs.length} church pages.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

function loadChurchesFromSeed() {
  const seedPath = path.join(process.cwd(), 'seed-verified-churches.sql');
  if (!fs.existsSync(seedPath)) return [];
  const sql = fs.readFileSync(seedPath, 'utf8');
  const insertIndex = sql.indexOf('INSERT INTO churches');
  if (insertIndex === -1) return [];
  const valuesIndex = sql.indexOf('VALUES', insertIndex);
  if (valuesIndex === -1) return [];
  const endIndex = sql.indexOf(';', valuesIndex);
  if (endIndex === -1) return [];

  const valuesBlock = sql.slice(valuesIndex + 'VALUES'.length, endIndex);
  const tuples = parseSqlTuples(valuesBlock);
  const columns = ['name', 'denomination', 'address', 'city', 'province', 'lat', 'lng', 'website', 'phone', 'slug', 'verified', 'featured'];

  return tuples.map(row => {
    const church = {};
    columns.forEach((col, idx) => {
      church[col] = row[idx];
    });
    return church;
  }).filter(church => church.verified === true || church.verified === 'TRUE');
}

function parseSqlTuples(input) {
  const rows = [];
  let i = 0;

  function skipWhitespace() {
    while (i < input.length && /\s/.test(input[i])) i++;
  }

  while (i < input.length) {
    skipWhitespace();
    if (input[i] === '-' && input[i + 1] === '-') {
      while (i < input.length && input[i] !== '\n') i++;
      continue;
    }
    if (input[i] !== '(') { i++; continue; }
    i++; // skip '('
    const row = [];
    while (i < input.length) {
      skipWhitespace();
      let value = '';
      if (input[i] === '\'') {
        i++; // skip opening quote
        let str = '';
        while (i < input.length) {
          if (input[i] === '\'' && input[i + 1] === '\'') {
            str += '\'';
            i += 2;
            continue;
          }
          if (input[i] === '\'') {
            i++;
            break;
          }
          str += input[i];
          i++;
        }
        value = str;
      } else {
        let token = '';
        while (i < input.length && input[i] !== ',' && input[i] !== ')') {
          token += input[i];
          i++;
        }
        const trimmed = token.trim();
        if (/^null$/i.test(trimmed)) value = null;
        else if (/^true$/i.test(trimmed)) value = true;
        else if (/^false$/i.test(trimmed)) value = false;
        else if (trimmed !== '' && !Number.isNaN(Number(trimmed))) value = Number(trimmed);
        else value = trimmed;
      }
      row.push(value);
      skipWhitespace();
      if (input[i] === ',') { i++; continue; }
      if (input[i] === ')') { i++; break; }
    }
    rows.push(row);
  }

  return rows;
}
