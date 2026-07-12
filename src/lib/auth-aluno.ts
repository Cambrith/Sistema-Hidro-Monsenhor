import { supabase } from "@/lib/supabase";

export type SessaoAluno = {
  id: string;
  nome: string;
  cpf: string;
};

function normalizarNumero(valor: string): string {
  return valor.replace(/\D/g, "");
}

export async function getSessaoAluno(): Promise<SessaoAluno | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return null;

  const meta = session.user.user_metadata;
  if (!meta?.aluno_id || !meta?.nome) return null;

  return { id: meta.aluno_id, nome: meta.nome, cpf: meta.cpf };
}

export async function loginAluno(
  cpf: string,
  nascimento: string,
  telefone: string,
): Promise<SessaoAluno | null> {
  const cpfNorm = normalizarNumero(cpf);
  const telefoneNorm = normalizarNumero(telefone);

  if (!cpfNorm || cpfNorm.length < 11 || !nascimento || !telefoneNorm) {
    return null;
  }

  const { data: garantia, error: erroGarantia } = await supabase.functions.invoke(
    "garantir-usuario-aluno",
    { body: { cpf: cpfNorm, nascimento, telefone: telefoneNorm } },
  );

  if (erroGarantia || !garantia?.ok || !garantia?.token_hash) return null;

  // O servidor já conferiu cpf+nascimento+telefone e devolveu um token de
  // uso único — o navegador nunca calcula nem envia nenhuma senha.
  // (a API do Supabase exige só token_hash + type juntos, sem o email)
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: garantia.token_hash,
    type: "email",
  });

  if (error || !data.session) return null;

  const meta = data.session.user.user_metadata;
  return { id: meta.aluno_id, nome: meta.nome, cpf: cpfNorm };
}

export async function sairAluno(): Promise<void> {
  await supabase.auth.signOut();
}

export async function temSessaoAluno(): Promise<boolean> {
  return (await getSessaoAluno()) !== null;
}