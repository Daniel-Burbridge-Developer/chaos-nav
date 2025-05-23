CREATE VIRTUAL TABLE IF NOT EXISTS stops_fts
USING fts5(
  name,
  number,
  content='stops',
  content_rowid='rowid'
);