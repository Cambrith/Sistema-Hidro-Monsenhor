import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Database,
  DownloadCloud,
  EyeOff,
  KeyRound,
  ClipboardCheck,
  CheckCircle2,
  FileText,
  Server,
  Users,
  Loader2,
  LogOut,
  AlertTriangle,
  LockKeyhole,
  FileDown,
  RefreshCw,
  CalendarDays,
  Hourglass,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { sair } from "@/lib/auth";

export const Route = createFileRoute("/_admin/seguranca")({
  head: () => ({ meta: [{ title: "Segurança e Backup" }] }),
  component: Seguranca,
});

type IndicadorTone = "ok" | "info" | "warn";

type Indicador = {
  title: string;
  desc: string;
  icon: LucideIcon;
  status: string;
  tone: IndicadorTone;
};

const indicadores: Indicador[] = [
  {
    title: "Login restrito",
    desc: "O painel possui acesso interno com usuário e senha para impedir entrada não autorizada.",
    icon: KeyRound,
    status: "Ativo",
    tone: "ok",
  },
  {
    title: "Perfis de acesso",
    desc: "As permissões são separadas entre Administração, Recepção e Professor.",
    icon: Users,
    status: "Ativo",
    tone: "ok",
  },
  {
    title: "Supabase conectado",
    desc: "Os dados principais do sistema são consultados e registrados no banco Supabase.",
    icon: Database,
    status: "Online",
    tone: "ok",
  },
  {
    title: "Regras de acesso no banco",
    desc: "O projeto utiliza políticas de segurança no Supabase para proteger tabelas sensíveis.",
    icon: LockKeyhole,
    status: "RLS",
    tone: "ok",
  },
  {
    title: "Dados pessoais protegidos",
    desc: "Informações de alunos, responsáveis e registros internos ficam restritas ao painel.",
    icon: EyeOff,
    status: "Conforme",
    tone: "ok",
  },
  {
    title: "Backup administrativo",
    desc: "Os dados podem ser exportados em JSON para conferência, segurança e arquivamento.",
    icon: DownloadCloud,
    status: "Disponível",
    tone: "info",
  },
];

const tabelasBackup = [
  "alunos",
  "turmas",
  "alunos_turmas",
  "lista_espera",
  "avisos",
  "chamadas",
  "presencas",
  "documentos_aluno",
  "ocorrencias_alunos",
] as const;

type TabelaBackup = (typeof tabelasBackup)[number];

const labelTabela: Record<TabelaBackup, string> = {
  alunos: "Alunos",
  turmas: "Turmas",
  alunos_turmas: "Vínculos aluno–turma",
  lista_espera: "Lista de espera",
  avisos: "Avisos",
  chamadas: "Chamadas (registro de aula)",
  presencas: "Presenças",
  documentos_aluno: "Documentos enviados",
  ocorrencias_alunos: "Ocorrências de alunos",
};

// Botões de acesso rápido pras tabelas mais usadas no dia a dia.
// As demais ficam no seletor "Exportar outra tabela", pra não virar
// uma parede de botões conforme o banco cresce.
const tabelasAcessoRapido: TabelaBackup[] = ["alunos", "turmas", "presencas"];
const tabelasSecundarias: TabelaBackup[] = tabelasBackup.filter(
  (t) => !tabelasAcessoRapido.includes(t),
);

type ResumoContagem = {
  alunosAtivos: number | null;
  turmasAtivas: number | null;
  documentosPendentes: number | null;
  naListaDeEspera: number | null;
};

function badgeClass(tone: IndicadorTone) {
  if (tone === "warn") {
    return "border-yellow-300 bg-yellow-50 text-yellow-800";
  }

  if (tone === "info") {
    return "border-blue-300 bg-blue-50 text-blue-800";
  }

  return "border-green-300 bg-green-50 text-green-700";
}

function baixarArquivo(nome: string, conteudo: string, tipo = "application/json") {
  const blob = new Blob([conteudo], {
    type: `${tipo};charset=utf-8`,
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

async function buscarTabela(nomeTabela: TabelaBackup) {
  const { data, error } = await supabase.from(nomeTabela).select("*");

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function carregarResumo(): Promise<ResumoContagem> {
  const [alunosAtivos, turmasAtivas, documentosPendentes, naListaDeEspera] =
    await Promise.all([
      supabase.from("alunos").select("id", { count: "exact", head: true }).eq("ativo", true),
      supabase.from("turmas").select("id", { count: "exact", head: true }).eq("ativa", true),
      supabase
        .from("documentos_aluno")
        .select("id", { count: "exact", head: true })
        .eq("status", "pendente"),
      supabase
        .from("lista_espera")
        .select("id", { count: "exact", head: true })
        .eq("status", "fila de espera"),
    ]);

  return {
    alunosAtivos: alunosAtivos.count ?? null,
    turmasAtivas: turmasAtivas.count ?? null,
    documentosPendentes: documentosPendentes.count ?? null,
    naListaDeEspera: naListaDeEspera.count ?? null,
  };
}

function imprimirPolitica() {
  const confirmado = window.confirm(
    "Deseja abrir a impressão da página? Na janela de impressão, você poderá escolher “Salvar como PDF”.",
  );

  if (!confirmado) return;

  setTimeout(() => {
    window.print();
  }, 150);
}

function baixarRoteiroSql() {
  const hoje = new Date().toISOString().slice(0, 10);

  const conteudo = `-- Backup SQL — Hidro e Natação Monsenhor
-- Gerado em: ${new Date().toISOString()}
-- Observação:
-- O backup JSON pode ser feito diretamente nesta tela.
-- O backup SQL completo deve ser feito pelo painel do Supabase:
-- Supabase > Project Settings > Database > Backups
-- ou por ferramenta SQL/CLI autorizada.

-- Tabelas principais do sistema:
-- alunos
-- turmas
-- alunos_turmas
-- lista_espera
-- avisos
-- chamadas
-- presencas
-- documentos_aluno
-- ocorrencias_alunos

-- Consultas de conferência:

select count(*) as total_alunos from public.alunos;
select count(*) as total_turmas from public.turmas;
select count(*) as total_vinculos from public.alunos_turmas;
select count(*) as total_lista_espera from public.lista_espera;
select count(*) as total_avisos from public.avisos;
select count(*) as total_chamadas from public.chamadas;
select count(*) as total_presencas from public.presencas;
select count(*) as total_documentos from public.documentos_aluno;
select count(*) as total_ocorrencias from public.ocorrencias_alunos;

-- Conferência de segurança:
select public.meu_perfil();
select public.eh_admin();
`;

  baixarArquivo(`roteiro-backup-sql-hidro-monsenhor-${hoje}.sql`, conteudo, "text/sql");

  toast.success("Roteiro SQL baixado.");
}

function encerrarSessao() {
  const confirmado = window.confirm(
    "Deseja encerrar a sessão administrativa neste navegador?",
  );

  if (!confirmado) return;

  sair();
  toast.success("Sessão encerrada.");
  window.location.href = "/login";
}

function Seguranca() {
  const [exportando, setExportando] = useState(false);
  const [tabelaSelecionada, setTabelaSelecionada] = useState<TabelaBackup>("lista_espera");
  const [resumo, setResumo] = useState<ResumoContagem | null>(null);
  const [carregandoResumo, setCarregandoResumo] = useState(true);

  useEffect(() => {
    atualizarResumo();
  }, []);

  async function atualizarResumo() {
    setCarregandoResumo(true);
    try {
      const dados = await carregarResumo();
      setResumo(dados);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar o resumo do banco.");
    } finally {
      setCarregandoResumo(false);
    }
  }

  async function exportarBackupGeral() {
    const confirmado = window.confirm(
      "Deseja gerar um backup JSON com todas as tabelas principais do sistema?",
    );

    if (!confirmado) return;

    try {
      setExportando(true);

      const backup: Record<TabelaBackup, unknown[]> = {
        alunos: [],
        turmas: [],
        alunos_turmas: [],
        lista_espera: [],
        avisos: [],
        chamadas: [],
        presencas: [],
        documentos_aluno: [],
        ocorrencias_alunos: [],
      };

      for (const tabela of tabelasBackup) {
        backup[tabela] = await buscarTabela(tabela);
      }

      const hoje = new Date().toISOString().slice(0, 10);

      baixarArquivo(
        `backup-hidro-monsenhor-${hoje}.json`,
        JSON.stringify(
          {
            sistema: "Hidro e Natação Monsenhor",
            gerado_em: new Date().toISOString(),
            observacao:
              "Backup administrativo em JSON gerado pelo painel interno do sistema.",
            tabelas: backup,
          },
          null,
          2,
        ),
      );

      toast.success("Backup geral exportado.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido.";

      toast.error("Erro ao gerar backup.", {
        description: message,
      });
    } finally {
      setExportando(false);
    }
  }

  async function exportarTabela(nomeTabela: TabelaBackup) {
    const confirmado = window.confirm(
      `Deseja exportar os dados da tabela "${labelTabela[nomeTabela]}" em JSON?`,
    );

    if (!confirmado) return;

    try {
      setExportando(true);

      const dados = await buscarTabela(nomeTabela);
      const hoje = new Date().toISOString().slice(0, 10);

      baixarArquivo(
        `${nomeTabela}-${hoje}.json`,
        JSON.stringify(
          {
            tabela: nomeTabela,
            gerado_em: new Date().toISOString(),
            dados,
          },
          null,
          2,
        ),
      );

      toast.success(`Tabela "${labelTabela[nomeTabela]}" exportada.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido.";

      toast.error(`Erro ao exportar ${labelTabela[nomeTabela]}.`, {
        description: message,
      });
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Segurança e backup
          </CardTitle>

          <CardDescription>
            Controle de acesso, proteção dos dados e exportação administrativa
            do sistema.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {indicadores.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-xl border border-border p-4 print:break-inside-avoid"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
                    <Icon className="h-5 w-5" />
                  </span>

                  <Badge variant="outline" className={badgeClass(item.tone)}>
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    {item.status}
                  </Badge>
                </div>

                <p className="mt-3 font-semibold">{item.title}</p>

                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="print:hidden">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                Resumo do banco
              </CardTitle>
              <CardDescription>
                Números em tempo real, direto do Supabase.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={atualizarResumo}
              disabled={carregandoResumo}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </CardHeader>

        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ResumoCard
            icon={Users}
            label="Alunos ativos"
            valor={resumo?.alunosAtivos}
            carregando={carregandoResumo}
          />
          <ResumoCard
            icon={CalendarDays}
            label="Turmas ativas"
            valor={resumo?.turmasAtivas}
            carregando={carregandoResumo}
          />
          <ResumoCard
            icon={FileText}
            label="Documentos pendentes"
            valor={resumo?.documentosPendentes}
            carregando={carregandoResumo}
            tone={resumo?.documentosPendentes ? "warn" : "ok"}
          />
          <ResumoCard
            icon={Hourglass}
            label="Na lista de espera"
            valor={resumo?.naListaDeEspera}
            carregando={carregandoResumo}
          />
        </CardContent>
      </Card>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Ações administrativas
          </CardTitle>

          <CardDescription>
            Exportações, impressão e encerramento da sessão administrativa.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
            <div className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Os arquivos exportados podem conter dados pessoais de alunos e
                responsáveis. Armazene e compartilhe apenas com pessoas
                autorizadas.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={exportarBackupGeral}
              disabled={exportando}
            >
              {exportando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Database className="mr-2 h-4 w-4" />
              )}
              Backup geral JSON
            </Button>

            {tabelasAcessoRapido.map((tabela) => (
              <Button
                key={tabela}
                type="button"
                variant="outline"
                onClick={() => exportarTabela(tabela)}
                disabled={exportando}
              >
                <DownloadCloud className="mr-2 h-4 w-4" />
                Exportar {labelTabela[tabela].toLowerCase()}
              </Button>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={baixarRoteiroSql}
              disabled={exportando}
            >
              <FileDown className="mr-2 h-4 w-4" />
              Roteiro SQL
            </Button>

            <Button type="button" variant="outline" onClick={imprimirPolitica}>
              <FileText className="mr-2 h-4 w-4" />
              Imprimir/PDF
            </Button>

            <Button type="button" variant="outline" onClick={encerrarSessao}>
              <LogOut className="mr-2 h-4 w-4" />
              Encerrar sessão
            </Button>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Exportar outra tabela</p>
              <p className="text-xs text-muted-foreground">
                Vínculos, lista de espera, avisos, chamadas, documentos ou ocorrências.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={tabelaSelecionada}
                onChange={(e) => setTabelaSelecionada(e.target.value as TabelaBackup)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-auto"
                disabled={exportando}
              >
                {tabelasSecundarias.map((tabela) => (
                  <option key={tabela} value={tabela}>
                    {labelTabela[tabela]}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                onClick={() => exportarTabela(tabelaSelecionada)}
                disabled={exportando}
                className="w-full sm:w-auto"
              >
                <DownloadCloud className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="print:shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            Conferência de segurança
          </CardTitle>

          <CardDescription>
            Pontos que devem ser verificados antes da entrega final.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/80">
          <p>
            1. O painel deve ser acessado apenas por usuários autorizados, com
            permissões separadas por perfil: Administração, Recepção e Professor;
          </p>

          <p>
            2. As áreas de alunos, turmas, chamadas, presenças, avisos, documentos,
            lista de espera, relatórios e segurança devem respeitar as permissões
            definidas para cada perfil;
          </p>

          <p>
            3. As políticas de RLS do Supabase devem permanecer ativas nas tabelas
            principais para reduzir o risco de acesso indevido aos dados;
          </p>

          <p>
            4. Os backups JSON gerados nesta tela servem como cópia administrativa
            dos dados principais. O backup SQL completo deve ser feito pelo
            painel do Supabase ou por uma ferramenta autorizada.
          </p>
        </CardContent>
      </Card>

      <Card className="print:shadow-none">
        <CardHeader>
          <CardTitle>Política interna de cuidado com dados</CardTitle>

          <CardDescription>
            Orientações básicas para uso responsável do painel.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/80">
          <p>
            1. O site público não deve exibir dados pessoais de alunos,
            responsáveis, telefones, e-mails ou observações internas;
          </p>

          <p>
            2. Informações de lista de espera, alunos, presença, responsáveis,
            documentos enviados e registros administrativos devem permanecer
            restritas ao painel interno;
          </p>

          <p>
            3. Arquivos exportados devem ser armazenados com cuidado e enviados
            apenas para pessoas autorizadas da equipe;
          </p>

          <p className="text-muted-foreground">
            4. Recomenda-se manter autenticação real,
            permissões por perfil, políticas de RLS ativas e rotina periódica de
            backup.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ResumoCard({
  icon: Icon,
  label,
  valor,
  carregando,
  tone = "ok",
}: {
  icon: LucideIcon;
  label: string;
  valor?: number | null;
  carregando: boolean;
  tone?: IndicadorTone;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="h-4 w-4" />
        </span>
        {tone === "warn" && typeof valor === "number" && valor > 0 && (
          <Badge variant="outline" className={badgeClass("warn")}>
            Atenção
          </Badge>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold">
        {carregando ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          valor ?? "—"
        )}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}