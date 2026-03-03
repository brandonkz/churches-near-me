# ChurchesNearMe Setup Checklist

## ✅ Step 1: Create Supabase Project (5 min)

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Name: `churches-near-me`
4. Database password: (save this securely)
5. Region: Choose closest to South Africa (e.g., `eu-west-1` or `ap-southeast-1`)
6. Wait for project to provision (~2 minutes)

## ✅ Step 2: Run Database Schema (2 min)

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy entire contents of `supabase-schema.sql`
4. Paste and click "Run"
5. Should see: "Success. No rows returned"

## ✅ Step 3: Enable Row Level Security (1 min)

Run this SQL in a new query:

```sql
-- Allow public read access to verified churches
CREATE POLICY "Public read access to verified churches"
  ON churches FOR SELECT
  USING (verified = true);

-- Allow public insert to submissions
CREATE POLICY "Public can submit churches"
  ON church_submissions FOR INSERT
  WITH CHECK (true);

-- Enable RLS
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_submissions ENABLE ROW LEVEL SECURITY;
```

## ✅ Step 4: Get Supabase Credentials (1 min)

1. In Supabase dashboard, go to **Settings** > **API**
2. Copy:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

## ✅ Step 5: Update Site Files (2 min)

Replace in **index.html** (line ~459):
```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';  // <- paste your URL here
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';  // <- paste your key here
```

Replace in **submit.html** (line ~204):
```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';  // <- paste your URL here
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';  // <- paste your key here
```

## ✅ Step 6: Create GitHub Repo (2 min)

1. Go to https://github.com/new
2. Repository name: `churches-near-me`
3. Public
4. Don't add README (we already have one)
5. Create repository

## ✅ Step 7: Push to GitHub (1 min)

```bash
cd /Users/brandonkatz/.openclaw/workspace/churches-near-me
git remote add origin https://github.com/brandonkz/churches-near-me.git
git push -u origin main
```

## ✅ Step 8: Enable GitHub Pages (1 min)

1. Go to repo **Settings** > **Pages**
2. Source: "Deploy from a branch"
3. Branch: `main` / `/ (root)`
4. Click "Save"
5. Wait ~1 minute for deploy
6. Site will be live at: `https://brandonkz.github.io/churches-near-me/`

## ✅ Step 9: Add Custom Domain (Optional, 5 min)

### Buy domain (if you don't have it):
- Cloudflare Domains: ~R200/year for `.co.za`
- Bluehost: ~R180/year

### Point domain to GitHub Pages:

1. In your domain registrar (Cloudflare, etc.):
   - Add DNS record: `CNAME` | `www` | `brandonkz.github.io`
   - Add DNS record: `CNAME` | `@` | `brandonkz.github.io`

2. Create file `CNAME` in repo root:
   ```
   churchesnearme.co.za
   ```

3. Commit and push:
   ```bash
   git add CNAME
   git commit -m "Add custom domain"
   git push
   ```

4. In GitHub repo **Settings** > **Pages**:
   - Custom domain: `churchesnearme.co.za`
   - Wait for DNS check (can take 5-60 min)
   - Enable "Enforce HTTPS" (after DNS propagates)

## ✅ Step 10: Test Everything (5 min)

1. Visit your site (GitHub Pages URL or custom domain)
2. Search should work (might be empty if no churches yet)
3. Test filters (city, denomination, province)
4. Click "Add Your Church" → fill form → submit
5. Check Supabase dashboard → **Table Editor** → `church_submissions` → should see your test submission
6. Approve test submission:
   - In Supabase, click "Insert row" in `churches` table
   - Copy data from submission
   - Add: `verified = true`, `slug = "test-church-cape-town"`

## 🎉 You're Live!

Site is now running on:
- Supabase free tier: 500MB DB, 50k reads/day (plenty for 10k+ users)
- GitHub Pages: Free hosting, global CDN
- Zero monthly costs until you hit 100k+ users

## 📊 Next Steps

1. **Seed churches:** Add 20-30 real churches manually via Supabase dashboard
2. **SEO pages:** Create `/cape-town.html`, `/johannesburg.html` for city-specific SEO
3. **Submit to Google:** https://search.google.com/search-console
4. **Reddit post:** r/southafrica "Made a free directory of all SA churches"
5. **Reach out to churches:** Email 50 churches in Cape Town/JHB offering free listing

## 🚨 Troubleshooting

**Churches not loading?**
- Check browser console (F12) for errors
- Make sure Supabase URL/key are correct
- Verify RLS policies are enabled

**Submission form not working?**
- Check browser console
- Verify `church_submissions` table exists
- Check RLS policy allows inserts

**Need help?**
- Email: brandonkz@gmail.com
- Supabase docs: https://supabase.com/docs

---

**Total setup time:** ~20 minutes
**Cost:** R0/month (free tier)
**Scalability:** 100k+ users on free tier
