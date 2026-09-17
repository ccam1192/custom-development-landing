-- Helper function: find duplicate emails across CRM customers
CREATE OR REPLACE FUNCTION crm_find_duplicate_emails()
RETURNS TABLE(email text, count bigint)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT c.email, COUNT(*) as count
  FROM crm_customers c
  WHERE c.email IS NOT NULL AND c.email != ''
  GROUP BY c.email
  HAVING COUNT(*) > 1
  ORDER BY count DESC
  LIMIT 100;
$$;
