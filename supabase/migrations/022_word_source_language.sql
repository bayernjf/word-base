-- 022: add source_language to words table
-- Supports multi-language word collection (en/ja/de/fr/ko/...)

ALTER TABLE words
ADD COLUMN IF NOT EXISTS source_language TEXT DEFAULT 'en';

COMMENT ON COLUMN words.source_language IS 'ISO 639-1 language code of the word source (en/ja/de/fr/ko etc.)';
