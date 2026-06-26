import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
  "pre_cadastros",
  "avisos",
  "chamadas",
  "presencas",
] as const;

type TabelaBackup = (typeof tabelasBackup)[number];

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
-- pre_cadastros
-- avisos
-- chamadas
-- presencas

-- Consultas de conferência:

select count(*) as total_alunos from public.alunos;
select count(*) as total_turmas from public.turmas;
select count(*) as total_vinculos from public.alunos_turmas;
select count(*) as total_pre_cadastros from public.pre_cadastros;
select count(*) as total_avisos from public.avisos;
select count(*) as total_chamadas from public.chamadas;
select count(*) as total_presencas from public.presencas;

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

  async function exportarBackupGeral() {
    const confirmado = window.confirm(
      "Deseja gerar um backup JSON das principais tabelas do sistema?",
    );

    if (!confirmado) return;

    try {
      setExportando(true);

      const backup: Record<TabelaBackup, unknown[]> = {
        alunos: [],
        turmas: [],
        alunos_turmas: [],
        pre_cadastros: [],
        avisos: [],
        chamadas: [],
        presencas: [],
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
      `Deseja exportar os dados da tabela "${nomeTabela}" em JSON?`,
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

      toast.success(`Tabela ${nomeTabela} exportada.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido.";

      toast.error(`Erro ao exportar ${nomeTabela}.`, {
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

            <Button
              type="button"
              variant="outline"
              onClick={() => exportarTabela("alunos")}
              disabled={exportando}
            >
              <DownloadCloud className="mr-2 h-4 w-4" />
              Exportar alunos
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => exportarTabela("turmas")}
              disabled={exportando}
            >
              <DownloadCloud className="mr-2 h-4 w-4" />
              Exportar turmas
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => exportarTabela("presencas")}
              disabled={exportando}
            >
              <DownloadCloud className="mr-2 h-4 w-4" />
              Exportar presenças
            </Button>

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
            2. As áreas de alunos, turmas, chamadas, presenças, avisos, relatórios
            e segurança devem respeitar as permissões definidas para cada perfil;
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
            2. Informações de pré-cadastro, alunos, presença, responsáveis e
            registros administrativos devem permanecer restritas ao painel
            interno;
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