CREATE TABLE visit_photos (
  id UUID PRIMARY KEY,
  visit_id UUID NOT NULL REFERENCES visits(id),
  worker_id UUID NOT NULL REFERENCES workers(id),
  country_code CHAR(2) NOT NULL,
  photo_type TEXT NOT NULL,
  object_key TEXT NOT NULL,
  content_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT visit_photos_photo_type_check CHECK (photo_type IN ('before', 'after')),
  CONSTRAINT visit_photos_content_type_check CHECK (
    content_type IN ('image/jpeg', 'image/png', 'image/webp')
  ),
  CONSTRAINT visit_photos_byte_size_check CHECK (byte_size > 0 AND byte_size <= 5000000),
  UNIQUE (visit_id, photo_type)
);

CREATE INDEX visit_photos_visit_idx ON visit_photos(visit_id, photo_type);
CREATE INDEX visit_photos_worker_idx ON visit_photos(worker_id, uploaded_at);
