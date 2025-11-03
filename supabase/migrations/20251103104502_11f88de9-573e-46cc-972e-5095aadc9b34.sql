-- Criar função de busca híbrida segura com filtro de tenant_id
CREATE OR REPLACE FUNCTION public.hybrid_search(
  p_tenant_id BIGINT,
  query_text TEXT,
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 5,
  full_text_weight FLOAT DEFAULT 1,
  semantic_weight FLOAT DEFAULT 1,
  rrf_k INT DEFAULT 50
)
RETURNS TABLE (
  id BIGINT,
  content TEXT,
  metadata JSONB,
  score DOUBLE PRECISION,
  rank INT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH full_text AS (
  SELECT
    id,
    ROW_NUMBER() OVER(ORDER BY ts_rank_cd(fts, websearch_to_tsquery(query_text)) DESC) AS rank_ix
  FROM documents
  WHERE tenant_id = p_tenant_id
    AND fts @@ websearch_to_tsquery(query_text)
  LIMIT LEAST(match_count, 30) * 2
),
semantic AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY embedding <#> query_embedding) AS rank_ix
  FROM documents
  WHERE tenant_id = p_tenant_id
  LIMIT LEAST(match_count, 30) * 2
),
merged AS (
  SELECT
    COALESCE(ft.id, sem.id) AS id,
    ft.rank_ix AS ft_rank,
    sem.rank_ix AS sem_rank
  FROM full_text ft
  FULL OUTER JOIN semantic sem ON ft.id = sem.id
),
scored AS (
  SELECT
    m.id,
    d.content,
    d.metadata,
    COALESCE(1.0 / (rrf_k + m.ft_rank), 0.0) * full_text_weight +
    COALESCE(1.0 / (rrf_k + m.sem_rank), 0.0) * semantic_weight AS score
  FROM merged m
  JOIN documents d ON d.id = m.id
  WHERE d.tenant_id = p_tenant_id
)
SELECT
  id,
  content,
  metadata,
  score,
  ROW_NUMBER() OVER (ORDER BY score DESC)::INT AS rank
FROM scored
ORDER BY score DESC
LIMIT LEAST(match_count, 30)
$$;