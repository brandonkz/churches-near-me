# ChurchesNearMe.co.za

Free church directory for South Africa with Supabase backend.

## Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy your project URL and anon key
4. Run the SQL in `supabase-schema.sql` in the SQL Editor

### 2. Configure Site

Update these files with your Supabase credentials:

**index.html:**
```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

**submit.html:**
```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

### 3. Enable Row Level Security (RLS)

Run this SQL in Supabase to set permissions:

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

### 4. Deploy to GitHub Pages

```bash
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/brandonkz/churches-near-me.git
git push -u origin main
```

Go to Settings > Pages > Deploy from branch `main`

### 5. Point Domain

In your domain registrar (e.g., Cloudflare):
- Add CNAME: `www` → `brandonkz.github.io`
- Add CNAME: `@` → `brandonkz.github.io`

Add `CNAME` file to repo:
```
churchesnearme.co.za
```

## Features

✅ Search by city, denomination, province
✅ "Near me" geolocation search
✅ Church submission form (pending approval)
✅ Featured listings (R199/mo)
✅ Premium listings (R499/mo)
✅ Mobile-responsive
✅ Fast static site + API
✅ SEO-optimized
✅ Free forever (Supabase free tier)

## Revenue Model

- **Free listings:** Basic church info
- **Featured (R199/mo):** Top of search, highlighted, badge
- **Premium (R499/mo):** Homepage featured, photo gallery, video, extended description

## TODO

- [ ] Add Google Maps integration (need API key)
- [ ] City pages for SEO (/cape-town, /johannesburg)
- [ ] Denomination pages for SEO (/baptist, /pentecostal)
- [ ] Admin dashboard for approving submissions
- [ ] Email notifications when submissions are approved
- [ ] Analytics dashboard for featured/premium churches

## Stack

- **Frontend:** Static HTML/CSS/JS (GitHub Pages)
- **Backend:** Supabase (PostgreSQL)
- **Hosting:** GitHub Pages (free)
- **Database:** Supabase free tier (500MB, 50k reads/day)

## SEO Keywords

- "churches near me south africa"
- "baptist church cape town"
- "pentecostal church johannesburg"
- "[denomination] church [city]"
- "find a church in [city]"

## Support

Email: brandonkz@gmail.com
