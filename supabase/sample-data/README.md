# Sample data

Fake data for trying the app. Nothing here is real: emails end in `example.test`, phone numbers look like
`+910000000101`, and every company name ends with "(Sample)".

| File | What it adds |
|---|---|
| `01_sample_companies_and_jobs.sql` | 3 sample employer accounts, 6 verified companies, 16 live jobs (Mumbai, Bengaluru, Hyderabad) with salaries, skills and a few screening questions |
| `02_sample_settle_in.sql` | 6 sample members, 2 verified Settle-In Buddies, 7 live flat listings (fake addresses at the neighbourhood centre) and 4 flatmate profiles in Mumbai and Bengaluru. **Not loaded into the hosted dev project yet** |
| `03_sample_places_and_guides.sql` | About 6 sample places around every seeded neighbourhood (a Shia masjid or imambargah, halal food, grocery, clinic, station), a community centre per city, published guides for the Mumbai and Bengaluru neighbourhoods and 5 community tips. **Not loaded into the hosted dev project yet** |
| `04_sample_mentors.sql` | 5 verified sample mentors (one per launch city) with weekly availability and expertise tags. **Not loaded into the hosted dev project yet** |
| `remove_sample_data.sql.txt` | Removes all of the above. Not run automatically |

## Local database

Loaded automatically, in file-name order, by:

```bash
pnpm exec supabase db reset
```

(`supabase/config.toml` → `[db.seed]` points at `./sample-data/*.sql`.)

## Hosted dev project

Loaded once on 2026-10-04 at the project owner's request. To load it again (it is safe to re-run), paste
`01_sample_companies_and_jobs.sql` into the Supabase dashboard → SQL Editor and run it.
To remove it, run the contents of `remove_sample_data.sql.txt` there.

**Never load this into production.**

## Adding more sample data

Add a new numbered file (`02_...sql`). Keep it clearly fake, safe to run twice (`on conflict do nothing`),
and use fixed ids so `remove_sample_data.sql.txt` can be kept up to date.
