# SlideSage 🎯

> AI-powered PowerPoint presentation analyzer — get instant, actionable feedback on your slides.

**Live URL:** https://slidesage.netlify.app *(update once deployed)*

---

## What is SlideSage?

SlideSage analyzes your PowerPoint presentations using Claude AI and gives you a structured report covering:

- **Clarity** — Are your messages clear and concise?
- **Design** — Visual consistency, layout, and use of whitespace
- **Content** — Depth, accuracy, and relevance of slide content
- **Flow** — Narrative structure and logical progression
- **Impact** — How memorable and persuasive the deck is

Upload your `.pptx` file, get a scored breakdown in seconds, and walk into your next presentation with confidence.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend Functions | Netlify Functions (Node.js) |
| Database | Supabase (PostgreSQL) |
| AI Engine | Anthropic Claude AI |
| Hosting | Netlify |

---

## Project Structure

```
slidesage/
├── index.html                    # Landing page
├── analyze.html                  # Upload & analysis page
├── results.html                  # Results display page
├── netlify.toml                  # Netlify config
├── netlify/
│   └── functions/
│       ├── analyze.js            # Main AI analysis function
│       ├── newsletter.js         # Newsletter signup
│       └── save-analysis.js      # Persist analysis results
└── README.md
```

---

## Setup Instructions

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Netlify CLI](https://docs.netlify.com/cli/get-started/) (`npm install -g netlify-cli`)
- A [Supabase](https://supabase.com/) project
- An [Anthropic](https://console.anthropic.com/) API key

### 1. Clone the repo

```bash
git clone https://github.com/martyffinny-creator/SlideSage.git
cd SlideSage
```

### 2. Set up environment variables

Create a `.env` file (or configure in Netlify dashboard):

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

> **Note:** Supabase credentials are embedded in the Netlify functions. For production, move them to environment variables too:
> ```env
> SUPABASE_URL=https://your-project.supabase.co
> SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
> ```

### 3. Set up Supabase tables

Run these SQL statements in your Supabase SQL editor:

```sql
-- Stores presentation analysis results
CREATE TABLE IF NOT EXISTS analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_session TEXT,
  file_name TEXT,
  slide_count INT,
  overall_score INT,
  report_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores newsletter subscribers
CREATE TABLE IF NOT EXISTS slidesage_newsletter (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE,
  source TEXT DEFAULT 'website',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Run locally

```bash
netlify dev
```

Open [http://localhost:8888](http://localhost:8888)

### 5. Deploy to Netlify

```bash
netlify login
netlify init
netlify deploy --prod
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | ✅ Yes | Your Anthropic API key for Claude AI |
| `SUPABASE_URL` | Optional* | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional* | Supabase service role key (keep secret!) |

*Currently hardcoded in functions — move to env vars for production.

---

## API Endpoints

### `POST /.netlify/functions/analyze`
Upload and analyze a presentation.
- **Body:** `multipart/form-data` with `file` field (`.pptx`)
- **Returns:** `{ overallScore, categories, suggestions, slideCount }`

### `POST /.netlify/functions/save-analysis`
Save an analysis result to the database.
- **Body:** `{ userSession, fileName, slideCount, overallScore, reportJson }`
- **Returns:** `{ success, id }`

### `POST /.netlify/functions/newsletter`
Subscribe to the SlideSage newsletter.
- **Body:** `{ email }`
- **Returns:** `{ success, message }`

---

## Contributing

PRs welcome! Please open an issue first to discuss what you'd like to change.

---

## License

MIT © SlideSage
