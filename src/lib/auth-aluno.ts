import { supabaseAluno } from "@/lib/supabase";

export type SessaoAluno = {
  id: string;
  nome: string;
};

export type FatorLogin = "mae" | "endereco" | "manual";

type RespostaFuncao = {
  ok?: boolean;
  erro?: string;
  fator?: FatorLogin;
  token_hash?: string;
  bloqueado?: boolean;
  segundosRestantes?: number;
};

export type ResultadoIdentificar =
  | { ok: true; fator: FatorLogin }
  | { ok: false; erro: string; bloqueado: boolean; segundosRestantes: number };

export type ResultadoVerificar =
  | { ok: true; sessao: SessaoAluno }
  | { ok: false; erro: string; bloqueado: boolean; segundosRestantes: number };

const ERRO_GENERICO = "Não foi possível verificar seus dados agora. Tente novamente.";

export async function getSessaoAluno(): Promise<SessaoAluno | null> {
  const { data } = await supabaseAluno.auth.getSession();
  const session = data.session;
  if (!session) return null;

  const meta = session.user.user_metadata;
  if (!meta?.aluno_id || !meta?.nome) return null;

  return { id: meta.aluno_id, nome: meta.nome };
}

// Etapa 1: manda nome + nascimento, servidor diz qual é o 3º dado a pedir
// (nome da mãe, endereço, ou "manual" quando o aluno não tem nenhum dos
// dois cadastrado). Por segurança contra descoberta de cadastro, o servidor
// finge sucesso mesmo quando o aluno não existe — então esta etapa quase
// sempre "passa"; o dado de verdade só é conferido na etapa 2.
export async function identificarAluno(
  nomeCompleto: string,
  nascimento: string,
): Promise<ResultadoIdentificar> {
  const { data, error } = await supabaseAluno.functions.invoke<RespostaFuncao>(
    "garantir-usuario-aluno",
    { body: { acao: "identificar", nome_completo: nomeCompleto, nascimento } },
  );

  if (error || !data) {
    return { ok: false, erro: ERRO_GENERICO, bloqueado: false, segundosRestantes: 0 };
  }

  if (data.bloqueado) {
    return {
      ok: false,
      erro: data.erro ?? "Muitas tentativas.",
      bloqueado: true,
      segundosRestantes: data.segundosRestantes ?? 0,
    };
  }

  if (!data.ok || !data.fator) {
    return {
      ok: false,
      erro: data.erro ?? "Não foi possível identificar seus dados.",
      bloqueado: false,
      segundosRestantes: 0,
    };
  }

  return { ok: true, fator: data.fator };
}

// Etapa 2: confirma o 3º dado (nome da mãe ou endereço, conforme o "fator"
// devolvido na etapa 1) e, se bater, já volta com a sessão pronta.
export async function verificarAluno(
  nomeCompleto: string,
  nascimento: string,
  valorTerceiroFator: string,
): Promise<ResultadoVerificar> {
  const { data, error } = await supabaseAluno.functions.invoke<RespostaFuncao>(
    "garantir-usuario-aluno",
    {
      body: {
        acao: "verificar",
        nome_completo: nomeCompleto,
        nascimento,
        valor_terceiro_fator: valorTerceiroFator,
      },
    },
  );

  if (error || !data) {
    return { ok: false, erro: ERRO_GENERICO, bloqueado: false, segundosRestantes: 0 };
  }

  if (data.bloqueado) {
    return {
      ok: false,
      erro: data.erro ?? "Muitas tentativas.",
      bloqueado: true,
      segundosRestantes: data.segundosRestantes ?? 0,
    };
  }

  if (!data.ok || !data.token_hash) {
    return {
      ok: false,
      erro: data.erro ?? "Dados não conferem.",
      bloqueado: false,
      segundosRestantes: 0,
    };
  }

  // O servidor já conferiu nome+nascimento+3º fator e devolveu um token de
  // uso único — o navegador nunca calcula nem envia nenhuma senha.
  const { data: sessionData, error: erroOtp } = await supabaseAluno.auth.verifyOtp({
    token_hash: data.token_hash,
    type: "email",
  });

  if (erroOtp || !sessionData.session) {
    return { ok: false, erro: ERRO_GENERICO, bloqueado: false, segundosRestantes: 0 };
  }

  const meta = sessionData.session.user.user_metadata;
  return { ok: true, sessao: { id: meta.aluno_id, nome: meta.nome } };
}

export async function sairAluno(): Promise<void> {
  await supabaseAluno.auth.signOut();
}

export async function temSessaoAluno(): Promise<boolean> {
  return (await getSessaoAluno()) !== null;
}
