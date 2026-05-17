-- Seed default regions (skip if regionCode already exists)
INSERT INTO "Region" (id, name, "regionCode")
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Kyiv', 'UA-KY'),
  ('a0000000-0000-0000-0000-000000000002', 'Stockholm', 'SE-STO')
ON CONFLICT ("regionCode") DO NOTHING;
