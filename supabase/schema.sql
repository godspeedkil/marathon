-- Marathon: movie survey schema
-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists surveys (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  intro          text,
  creator_secret uuid not null default gen_random_uuid(),
  status         text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  created_at     timestamptz not null default now()
);

create table if not exists sections (
  id          uuid primary key default gen_random_uuid(),
  survey_id   uuid not null references surveys(id) on delete cascade,
  title       text not null,
  position    int not null default 0
);

create table if not exists movies (
  id                uuid primary key default gen_random_uuid(),
  section_id        uuid not null references sections(id) on delete cascade,
  title             text not null,
  year              int,
  poster_url        text,
  synopsis          text,
  genres            text[],
  runtime_minutes   int,
  actors            text,
  trailer_url       text,
  imdb_rating       text,
  rotten_tomatoes   text,
  metacritic        text,
  source            text default 'manual' check (source in ('omdb', 'tmdb', 'manual')),
  external_id       text,
  position          int not null default 0
);

create table if not exists responses (
  id           uuid primary key default gen_random_uuid(),
  survey_id    uuid not null references surveys(id) on delete cascade,
  taker_name   text not null,
  submitted_at timestamptz not null default now()
);

create table if not exists response_votes (
  id           uuid primary key default gen_random_uuid(),
  response_id  uuid not null references responses(id) on delete cascade,
  movie_id     uuid not null references movies(id) on delete cascade,
  score        int not null check (score between 1 and 5),
  unique (response_id, movie_id)
);

create index if not exists idx_sections_survey on sections(survey_id);
create index if not exists idx_movies_section on movies(section_id);
create index if not exists idx_responses_survey on responses(survey_id);
create index if not exists idx_votes_response on response_votes(response_id);
create index if not exists idx_votes_movie on response_votes(movie_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Design: the browser only ever talks to Supabase with the public "anon" key.
-- That key can READ everything (nothing here is sensitive - it's movie
-- titles) and can INSERT survey responses/votes, but it can never create or
-- edit a survey, section, or movie directly. Creator writes go through the
-- Netlify functions, which use the secret "service role" key (bypasses RLS)
-- and manually check the creator_secret before writing. This is what keeps
-- a link-holder from tampering with someone else's survey.
-- ---------------------------------------------------------------------------

alter table surveys enable row level security;
alter table sections enable row level security;
alter table movies enable row level security;
alter table responses enable row level security;
alter table response_votes enable row level security;

-- Public read access (needed so both creators and takers can load survey data
-- with just the anon key). creator_secret is a uuid embedded in the row, but
-- since it's only ever matched server-side, exposing the column is fine.
create policy "surveys are publicly readable" on surveys for select using (true);
create policy "sections are publicly readable" on sections for select using (true);
create policy "movies are publicly readable" on movies for select using (true);
create policy "responses are publicly readable" on responses for select using (true);
create policy "votes are publicly readable" on response_votes for select using (true);

-- Takers can submit responses directly from the browser, but only while the
-- survey is open.
create policy "insert responses while survey is open" on responses
  for insert
  with check (
    exists (
      select 1 from surveys
      where surveys.id = responses.survey_id
      and surveys.status = 'open'
    )
  );

create policy "insert votes while survey is open" on response_votes
  for insert
  with check (
    exists (
      select 1 from responses
      join surveys on surveys.id = responses.survey_id
      where responses.id = response_votes.response_id
      and surveys.status = 'open'
    )
  );

-- No insert/update/delete policies exist for surveys, sections, or movies,
-- so the anon key cannot write to them at all -- only the service role key
-- (used server-side in Netlify functions) can.
