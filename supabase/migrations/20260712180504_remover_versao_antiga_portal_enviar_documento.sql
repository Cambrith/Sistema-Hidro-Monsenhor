-- A correção anterior de "portal_enviar_documento" (checagem de validade +
-- p_forcar) criou uma SEGUNDA versão da função com 5 parâmetros, em vez de
-- substituir a antiga (CREATE OR REPLACE não troca quando a assinatura muda
-- de tamanho). Isso deixava duas versões coexistindo, com risco de ambiguidade
-- de overload. Removendo a versão antiga (4 parâmetros, sem checagem de validade).
DROP FUNCTION IF EXISTS public.portal_enviar_documento(uuid, text, text[], text[]);
