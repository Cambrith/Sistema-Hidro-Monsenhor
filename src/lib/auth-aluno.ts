import { supabase } from "@/lib/supabase";

export type SessaoAluno = {
  id: string;
  nome: string;
  cpf: string;
};

function normalizarNumero(valor: string): string {
  return valor.replace(/\D/g, "");
}

async function senhaDerivada(cpf: string, nascimento: string, telefone: string) {
  const encoder = new TextEncoder();
  const dados = encoder.encode(`${cpf}|${nascimento}|${telefone}|atlas-salt-fixo`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dados);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
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

  if (erroGarantia || !garantia?.ok) return null;

  const senha = await senhaDerivada(cpfNorm, nascimento, telefoneNorm);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: garantia.email,
    password: senha,
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