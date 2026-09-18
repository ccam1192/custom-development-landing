-- Add Custom as a CRM user type. Existing agency / agency_client / standard values are unchanged.

ALTER TYPE crm_user_type ADD VALUE IF NOT EXISTS 'custom';
