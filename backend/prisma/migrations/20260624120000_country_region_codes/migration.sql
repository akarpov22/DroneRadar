-- Add country-level regions (ISO 3166-1 alpha-2). Legacy city regions (UA-KY, SE-STO) are unchanged.
INSERT INTO "Region" (id, name, "regionCode")
VALUES
  ('a0000000-0000-0000-0000-000000000011', 'Ukraine', 'UA'),
  ('a0000000-0000-0000-0000-000000000012', 'Sweden', 'SE')
ON CONFLICT ("regionCode") DO NOTHING;
