-- r8r: Actuarial Analysis Database Schema
-- Designed for Supabase (PostgreSQL)

-- Reference table for lines of business
CREATE TABLE line_of_business (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(20) UNIQUE NOT NULL,
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Individual claim snapshots at each evaluation point
-- Each row represents a claim's state at a given development age
CREATE TABLE claims (
  id                SERIAL PRIMARY KEY,
  lob_id            INT NOT NULL REFERENCES line_of_business(id),
  claim_number      VARCHAR(50) NOT NULL,
  accident_year     INT NOT NULL,
  accident_date     DATE,
  development_month INT NOT NULL,
  paid_loss         NUMERIC(15,2) NOT NULL DEFAULT 0,
  incurred_loss     NUMERIC(15,2) NOT NULL DEFAULT 0,
  case_reserves     NUMERIC(15,2) NOT NULL DEFAULT 0,
  claimant_count    INT NOT NULL DEFAULT 1,
  status            VARCHAR(20) DEFAULT 'open',
  evaluation_date   DATE NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_claims_ay_dev ON claims(accident_year, development_month);
CREATE INDEX idx_claims_lob ON claims(lob_id);

-- Policy-level premium and exposure data, aggregated by policy year
CREATE TABLE policies (
  id                SERIAL PRIMARY KEY,
  lob_id            INT NOT NULL REFERENCES line_of_business(id),
  policy_year       INT NOT NULL,
  earned_premium    NUMERIC(15,2) NOT NULL DEFAULT 0,
  written_premium   NUMERIC(15,2) NOT NULL DEFAULT 0,
  exposures         NUMERIC(15,4) NOT NULL DEFAULT 0,
  in_force_count    INT NOT NULL DEFAULT 0,
  effective_date    DATE,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_policies_year ON policies(policy_year);
CREATE INDEX idx_policies_lob ON policies(lob_id);

-- Historical rate changes for on-level factor calculation
CREATE TABLE rate_history (
  id                  SERIAL PRIMARY KEY,
  lob_id              INT NOT NULL REFERENCES line_of_business(id),
  effective_date      DATE NOT NULL,
  rate_change_pct     NUMERIC(8,4) NOT NULL,
  cumulative_factor   NUMERIC(10,6),
  description         TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rate_history_lob_date ON rate_history(lob_id, effective_date);

-- Aggregated triangle data view for convenience
CREATE OR REPLACE VIEW triangle_data AS
SELECT
  lob_id,
  accident_year,
  development_month,
  SUM(paid_loss) AS total_paid,
  SUM(incurred_loss) AS total_incurred,
  SUM(case_reserves) AS total_reserves,
  COUNT(DISTINCT claim_number) AS claim_count
FROM claims
GROUP BY lob_id, accident_year, development_month
ORDER BY lob_id, accident_year, development_month;
