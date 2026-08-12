-- Seed the leagues we support at launch.
-- provider_id = football-data.org competition code (https://www.football-data.org/coverage)

INSERT INTO leagues (id, name, country, provider_id) VALUES
  ('lg_pl',  'Premier League',        'England', 'PL'),
  ('lg_elc', 'Championship',         'England', 'ELC'),
  ('lg_pd',  'La Liga',               'Spain',   'PD'),
  ('lg_sa',  'Serie A',               'Italy',   'SA'),
  ('lg_bl1', 'Bundesliga',            'Germany', 'BL1'),
  ('lg_fl1', 'Ligue 1',               'France',  'FL1');
