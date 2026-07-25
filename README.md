# Marathon — movie marathon survey builder

Build a shortlist of movies, split it into sections, send one link, and let
everyone rate each title 1-5. Creator sees live results and flips voting on/off.

## Stack

- **Frontend:** React + Vite + Tailwind v4, deployed on Netlify
- **Data:** Supabase (Postgres) - surveys, sections, movies, responses, votes
- **Movie data:** TMDb (search, posters, cast, trailer, genres, runtime) + OMDb
  (IMDb / Rotten Tomatoes / Metacritic ratings), proxied through a Netlify function
- **Auth model:** no logins. Each survey gets a random `creator_secret`; the
  edit URL (`/survey/:id/edit/:secret`) is the only way to manage it. Takers
  use the plain `/survey/:id` link. See `supabase/schema.sql` for how this is
  enforced at the database level.

## 1. Create the Supabase project

1. Go to supabase.com -> New project (free tier is plenty).
2. Once it's up, open **SQL Editor** -> New query, paste the contents of
   `supabase/schema.sql`, and run it. This creates all five tables and the
   Row Level Security policies that keep the anon key read-mostly.
3. Go to **Project Settings -> API** and copy:
   - `Project URL`
   - `anon` `public` key
   - `service_role` key (click reveal - keep this one secret)

## 2. Get free API keys

- **TMDb**: create an account at themoviedb.org/settings/api, request an API
  key (the "API Read Access" v3 key), free for non-commercial use.
- **OMDb**: request a free key at omdbapi.com/apikey.aspx (check your email
  to activate it). Free tier is 1,000 lookups/day.

## 3. Local development

Requires **Node 22.22+** (React Router v8's minimum). If you use nvm, `nvm use`
will pick up the version from `.nvmrc` automatically. Netlify's build is
already pinned to Node 22.22 in `netlify.toml`.

```bash
npm install
cp .env.example .env
# fill in .env with the values from steps 1 and 2
npm run dev
```

The frontend alone won't be able to search movies or save surveys locally
without also running the Netlify functions. Easiest local setup:

```bash
npm install -g netlify-cli
netlify dev
```

`netlify dev` runs the Vite dev server *and* the functions together on one
port, and reads the same `.env` file automatically.

## 4. Deploy to Netlify

1. Push this project to a GitHub repo.
2. In Netlify: **Add new site -> Import an existing project**, pick the repo.
   Build command and publish directory are already set in `netlify.toml`.
3. Before the first deploy, go to **Site configuration -> Environment
   variables** and add all six variables from `.env.example`:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (frontend)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (functions only)
   - `TMDB_API_KEY`, `OMDB_API_KEY` (functions only)
4. Deploy. Your site is live at the Netlify URL (add a custom domain later
   if you want one).

## How the pieces fit together

```
Browser (anon key)
  |
  |- reads surveys/sections/movies/responses directly from Supabase
  |  (public SELECT policies -- nothing sensitive in there)
  |
  |- writes survey responses/votes directly to Supabase
  |  (RLS only allows this while survey.status = 'open')
  |
  |- POST /.netlify/functions/movie-api      -> TMDb + OMDb lookup, no auth needed
  |- POST /.netlify/functions/survey-admin   -> creator writes, checks creator_secret
                                                  against Supabase using the service
                                                  role key before touching anything
```

## Where to go next

- **Reordering** sections/movies: the `reorder` action already exists in
  `survey-admin.js`; the UI just doesn't have drag-and-drop wired up yet -
  the Build tab adds new movies to the end of a section.
- **Editing** a resolved movie's fields: currently you'd remove and re-add it.
  Wiring up an edit form that calls `saveMovie` with an existing `movie.id`
  is a small addition to `EditSurvey.jsx`.
- **Rate limiting** OMDb calls: batch-importing a lot of titles at once will
  burn through the 1,000/day free OMDb quota faster than one-at-a-time
  lookups. Fine for occasional friend-group use; worth caching if you start
  running lots of surveys.
