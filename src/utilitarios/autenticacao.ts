import { supabase } from "@/utilitarios/supabase";

const KEY = "hidro-monsenhor-session";
const DURACAO_SESSAO_MS: Record<Perfil, number> = {
  Administrador: 30 * 24 * 60 * 60 * 1000,
  Recepção: 14 * 24 * 60 * 60 * 1000,
  Professor: 60 * 24 * 60 * 60 * 1000,
};

export type Perfil = "Administrador" | "Recepção" | "Professor";

export type Sessao = {
  usuario: string;
  nome: string;
  email: string;
  perfil: Perfil;
  expiresAt: number;
};

export type Permissao =
  | "painel"
  | "pre-cadastros"
  | "alunos"
  | "turmas"
  | "presenca"
  | "avisos"
  | "relatorios"
  | "seguranca";

export const permissoesPorPerfil: Record<Perfil, Permissao[]> = {
  Administrador: [
    "painel",
    "pre-cadastros",
    "alunos",
    "turmas",
    "presenca",
    "avisos",
    "relatorios",
    "seguranca",
  ],

  Recepção: ["painel", "pre-cadastros", "alunos", "turmas", "presenca", "avisos", "relatorios"],

  Professor: ["painel", "turmas", "presenca"],
};

function normalizarLogin(valor: string) {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function loginParaEmail(usuario: string) {
  const login = normalizarLogin(usuario);

  if (usuario.includes("@")) {
    return usuario.trim().toLowerCase();
  }

  if (login === "administracao" || login === "admin" || login === "administrador") {
    return "administracao@hidromonsenhor.com";
  }

  if (login === "recepcao" || login === "recep" || login === "atendimento") {
    return "recepcao@hidromonsenhor.com";
  }

  if (login === "professor" || login === "prof" || login === "docente") {
    return "professor@hidromonsenhor.com";
  }

  return "";
}

function usuarioPorEmail(email: string) {
  if (email === "administracao@hidromonsenhor.com") return "administracao";
  if (email === "recepcao@hidromonsenhor.com") return "recepcao";
  if (email === "professor@hidromonsenhor.com") return "professor";

  return email;
}

function perfilValido(valor: unknown): valor is Perfil {
  return valor === "Administrador" || valor === "Recepção" || valor === "Professor";
}

export function getSessao(): Sessao | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(KEY);

    if (!raw) return null;

    const sessao = JSON.parse(raw) as Sessao;

    if (!sessao?.usuario || !sessao?.perfil || !sessao?.email || !perfilValido(sessao.perfil)) {
      localStorage.removeItem(KEY);
      return null;
    }

    if (sessao.expiresAt && Date.now() > sessao.expiresAt) {
      localStorage.removeItem(KEY);
      return null;
    }

    return sessao;
  } catch {
    localStorage.removeItem(KEY);
    return null;
  }
}

/**
 * Reconfere a sessão local (localStorage) contra a sessão real do Supabase
 * antes de confiar nela — sem isso, as duas podiam divergir nos dois
 * sentidos: a local dizer "ainda vale" enquanto o token do Supabase já
 * expirou (interface aparece normal, mas toda ação falha), ou o contrário
 * (força relogin com o token do Supabase ainda válido).
 *
 * Mantém `getSessao()` síncrona pros usos de leitura (render, `podeAcessar`
 * etc.) — só os pontos de entrada de rota (`beforeLoad`) chamam esta função
 * async, que realinha o localStorage antes de qualquer decisão de acesso.
 */
export async function sincronizarSessao(): Promise<Sessao | null> {
  if (typeof window === "undefined") return null;

  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    localStorage.removeItem(KEY);
    return null;
  }

  const sessaoLocal = getSessao();
  if (sessaoLocal) return sessaoLocal;

  // Sessão do Supabase existe mas a local expirou ou nunca foi gravada —
  // reconstrói a partir do perfil no banco em vez de forçar relogin com um
  // token ainda válido.
  const { data: perfilData, error } = await supabase
    .from("perfis")
    .select("nome, perfil, ativo")
    .eq("user_id", data.session.user.id)
    .eq("ativo", true)
    .maybeSingle();

  if (error || !perfilData || !perfilValido(perfilData.perfil)) {
    localStorage.removeItem(KEY);
    await supabase.auth.signOut();
    return null;
  }

  const email = data.session.user.email ?? "";
  const sessao: Sessao = {
    usuario: usuarioPorEmail(email),
    nome: perfilData.nome,
    email,
    perfil: perfilData.perfil,
    expiresAt: Date.now() + DURACAO_SESSAO_MS[perfilData.perfil],
  };

  localStorage.setItem(KEY, JSON.stringify(sessao));

  return sessao;
}

export async function entrar(usuario: string, senha: string): Promise<Sessao | null> {
  if (typeof window === "undefined") return null;

  const email = loginParaEmail(usuario);
  const password = senha.trim();

  if (!email || !password) return null;

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    console.error(authError);
    return null;
  }

  const { data: perfilData, error: perfilError } = await supabase
    .from("perfis")
    .select("nome, perfil, ativo")
    .eq("user_id", authData.user.id)
    .eq("ativo", true)
    .maybeSingle();

  if (perfilError || !perfilData || !perfilValido(perfilData.perfil)) {
    console.error(perfilError);
    await supabase.auth.signOut();
    return null;
  }

  const sessao: Sessao = {
    usuario: usuarioPorEmail(email),
    nome: perfilData.nome,
    email,
    perfil: perfilData.perfil,
    expiresAt: Date.now() + DURACAO_SESSAO_MS[perfilData.perfil],
  };

  localStorage.setItem(KEY, JSON.stringify(sessao));

  return sessao;
}

export async function sair() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(KEY);
  await supabase.auth.signOut();
}

export function getPermissoes(): Permissao[] {
  const sessao = getSessao();

  if (!sessao) return [];

  return permissoesPorPerfil[sessao.perfil] ?? [];
}

export function podeAcessar(permissao: Permissao): boolean {
  const sessao = getSessao();

  if (!sessao) return false;

  return permissoesPorPerfil[sessao.perfil]?.includes(permissao) ?? false;
}

export function temSessao(): boolean {
  return getSessao() !== null;
}
