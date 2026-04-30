CREATE TABLE visit_ratings (
  id UUID PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  visit_id UUID NOT NULL REFERENCES visits(id),
  country_code CHAR(2) NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  rated_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT visit_ratings_rating_check CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT visit_ratings_visit_unique UNIQUE (visit_id)
);

CREATE INDEX visit_ratings_subscription_created_idx ON visit_ratings(subscription_id, created_at DESC);
CREATE INDEX visit_ratings_rating_created_idx ON visit_ratings(rating, created_at DESC);
