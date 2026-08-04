UPDATE public.properties
SET ical_import_url = 'https://' || regexp_replace(ical_import_url, '^(https?://)+(https?:/+)?', '')
WHERE ical_import_url LIKE 'https://https:%';