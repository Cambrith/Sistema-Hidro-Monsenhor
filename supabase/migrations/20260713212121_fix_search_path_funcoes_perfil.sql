CREATE OR REPLACE FUNCTION public.meu_perfil()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select perfil
  from public.perfis
  where user_id = auth.uid()
    and ativo = true
  limit 1;
$function$;

CREATE OR REPLACE FUNCTION public.eh_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.meu_perfil() = 'Administrador';
$function$;

CREATE OR REPLACE FUNCTION public.eh_recepcao()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.meu_perfil() = 'Recepção';
$function$;

CREATE OR REPLACE FUNCTION public.eh_professor()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.meu_perfil() = 'Professor';
$function$;
