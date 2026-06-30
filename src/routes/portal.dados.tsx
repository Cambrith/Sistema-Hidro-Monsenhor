import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSessaoAluno } from "@/lib/auth-aluno";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, MapPin, Phone, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/dados")({
  head: () => ({ meta: [{ title: "Meus dados — Portal do Aluno" }] }),
  component: PortalDados,
});

type DadosAluno = {
  nome_completo: string;
  nascimento: string;
  idade: number;
  modalidade: string;
  turma: string | null;
  responsavel: string | null;
  nome_pai: string | null;
  nome_mae: string | null;
  telefone: string | null;
  telefone_fixo: string | null;
  whatsapp: string;
  email: string | null;
  cpf: string | null;
  endereco: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  criado_em: string;
  ativo: boolean;
};

function formatarData(data?: string | null) {
  if (!data) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(data);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return "—";
}

function formatarTelefone(numero?: string | null) {
  if (!numero) return "—";
  const n = numero.replace(/\D/g, "");
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return numero;
}

function formatarCPF(cpf?: string | null) {
  if (!cpf) return "—";
  const n = cpf.replace(/\D/g, "");
  if (n.length === 11) return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`;
  return cpf;
}

function formatarCEP(cep?: string | null) {
  if (!cep) return "—";
  const n = cep.replace(/\D/g, "");
  if (n.length === 8) return `${n.slice(0, 5)}-${n.slice(5)}`;
  return cep;
}

function InfoLinha({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-foreground">{value ?? "—"}</span>
    </div>
  );
}

function PortalDados() {
  const sessao = getSessaoAluno();
  const [aluno, setAluno] = useState<DadosAluno | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => { if (sessao) carregarDados(); }, []);

  async function carregarDados() {
    if (!sessao) return;
    setCarregando(true);
    const { data, error } = await supabase
      .from("alunos")
      .select("nome_completo, nascimento, idade, modalidade, turma, responsavel, nome_pai, nome_mae, telefone, telefone_fixo, whatsapp, email, cpf, endereco, complemento, bairro, cep, criado_em, ativo")
      .eq("id", sessao.id)
      .maybeSingle();
    if (error || !data) { toast.error("Erro ao carregar seus dados."); setCarregando(false); return; }
    setAluno(data as DadosAluno);
    setCarregando(false);
  }

  if (carregando) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );

  if (!aluno) return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Não foi possível carregar seus dados.</p>
        <Button className="mt-4" onClick={carregarDados}>Tentar novamente</Button>
      </div>
    </div>
  );

  const enderecoCompleto = [aluno.endereco, aluno.complemento, aluno.bairro]
    .filter(Boolean).join(", ") || null;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:px-6">
      <div>
        <h1 className="text-xl font-semibold">Meus dados</h1>
        <p className="text-sm text-muted-foreground">
          Para atualizar qualquer informação, compareça à secretaria.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-primary" />
            Dados pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <InfoLinha label="Nome completo" value={aluno.nome_completo} />
          <InfoLinha label="Data de nascimento" value={formatarData(aluno.nascimento)} />
          {aluno.idade ? <InfoLinha label="Idade" value={`${aluno.idade} anos`} /> : null}
          <InfoLinha label="CPF" value={formatarCPF(aluno.cpf)} />
          {aluno.responsavel && <InfoLinha label="Responsável" value={aluno.responsavel} />}
          {aluno.nome_pai && <InfoLinha label="Nome do pai" value={aluno.nome_pai} />}
          {aluno.nome_mae && <InfoLinha label="Nome da mãe" value={aluno.nome_mae} />}
          <InfoLinha label="Matriculado em" value={formatarData(aluno.criado_em)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-primary" />
            Matrícula
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <InfoLinha label="Modalidade" value={aluno.modalidade} />
          <InfoLinha label="Turma" value={aluno.turma || "Sem turma"} />
          <InfoLinha label="Situação" value={
            <span className={`font-medium ${aluno.ativo ? "text-green-700" : "text-muted-foreground"}`}>
              {aluno.ativo ? "Ativo" : "Inativo"}
            </span>
          } />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4 text-primary" />
            Contato
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <InfoLinha label="WhatsApp" value={formatarTelefone(aluno.whatsapp)} />
          {aluno.telefone && <InfoLinha label="Telefone celular" value={formatarTelefone(aluno.telefone)} />}
          {aluno.telefone_fixo && <InfoLinha label="Telefone fixo" value={formatarTelefone(aluno.telefone_fixo)} />}
          {aluno.email && <InfoLinha label="E-mail" value={aluno.email} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-primary" />
            Endereço
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <InfoLinha label="Logradouro" value={enderecoCompleto || "Não informado"} />
          <InfoLinha label="CEP" value={formatarCEP(aluno.cep)} />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Dados incorretos? Compareça à secretaria para solicitar a correção.
      </p>
    </div>
  );
}