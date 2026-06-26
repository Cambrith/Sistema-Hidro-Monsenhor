import { supabase } from "@/lib/supabase";

const KEY = "hidro-monsenhor-session";

export type Perfil = "Administrador" | "Recepção" | "Professor";

export type Sessao = {
  usuario: string;
  nome: string;
  email: string;
  perfil: Perfil;
};

export type Permissao =
  | "painel"
  | "pre-cadastros"
  | "alunos"
  | "turmas"
  | "presenca"
  | "avisos"
  | "relatorios"
  | "seguranca"
  | "usuarios";

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
    "usuarios",
  ],

  Recepção: [
    "painel",
    "pre-cadastros",
    "alunos",
    "turmas",
    "presenca",
    "avisos",
    "relatorios",
  ],

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

  if (
    login === "administracao" ||
    login === "admin" ||
    login === "administrador"
  ) {
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
  return (
    valor === "Administrador" ||
    valor === "Recepção" ||
    valor === "Professor"
  );
}

export function getSessao(): Sessao | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(KEY);

    if (!raw) return null;

    const sessao = JSON.parse(raw) as Sessao;

    if (
      !sessao?.usuario ||
      !sessao?.perfil ||
      !sessao?.email ||
      !perfilValido(sessao.perfil)
    ) {
      localStorage.removeItem(KEY);
      return null;
    }

    return sessao;
  } catch {
    localStorage.removeItem(KEY);
    return null;
  }
}

export async function entrar(
  usuario: string,
  senha: string,
): Promise<Sessao | null> {
  if (typeof window === "undefined") return null;

  const email = loginParaEmail(usuario);
  const password = senha.trim();

  if (!email || !password) return null;

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
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