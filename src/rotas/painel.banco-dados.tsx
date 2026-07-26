import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase, buscarTodasLinhas } from "@/utilitarios/supabase";
import { hojeBrasilia } from "@/utilitarios/data";
import { sair } from "@/utilitarios/autenticacao";
import { InfoCard } from "@/componentes/diagnostico-info-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/componentes/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import {
  ShieldAlert,
  ShieldCheck,
  Database,
  DownloadCloud,
  Users,
  Loader2,
  LogOut,
  AlertTriangle,
  FileDown,
  CalendarDays,
  Hourglass,
  Activity,
  CheckCircle2,
  MinusCircle,
  ExternalLink,
  RefreshCw,
  ListChecks,
  HardDrive,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/painel/banco-dados")({
  head: () => ({ meta: [{ title: "Banco de Dados" }] }),
  component: BancoDeDados,
});

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type Severidade = "critico" | "atencao" | "informativo";

type PolicySeguranca = { policyname: string | null; cmd: string; qual: string | null };
type AlertaSeguranca = {
  policyname: string | null;
  severidade: "critico" | "atencao";
  motivo: string;
};
type TabelaSeguranca = {
  tabela: string;
  rls_habilitado: boolean;
  total_policies: number;
  policies: PolicySeguranca[];
  alertas: AlertaSeguranca[];
};

type ProblemaIntegridade = {
  chave: string;
  severidade: Severidade;
  contagem: number;
  descricao: string;
};

type ItemProblema = { id: string; nome: string; detalhe: string; total: number };

type SaudeOperacional = {
  ultima_chamada_em: string | null;
  ultima_presenca_em: string | null;
  ultimo_aluno_cadastrado_em: string | null;
  documentos_pendentes: number;
  documento_pendente_mais_antigo_dias: number;
  chaves_bloqueadas: number;
  tamanho_banco_bytes: number;
};

type BackupLog = {
  id: string;
  tipo: string;
  tabelas: string[];
  gerado_por: string | null;
  criado_em: string;
};

type ContagemTabela = { tabela: string; total: number };
type StorageUso = { bucket: string; total_arquivos: number; tamanho_bytes: number };
type RpcAtiva = { nome: string; security_definer: boolean };

// ---------------------------------------------------------------------------
// Constantes e helpers de apresentação
// ---------------------------------------------------------------------------

const labelProblema: Record<string, string> = {
  alunos_sem_acesso_portal: "Alunos sem acesso ao portal",
  alunos_sem_vinculo_turma: "Alunos sem turma vinculada",
  turmas_ativas_sem_professor: "Turmas ativas sem professor",
  alunos_sem_nome_mae: "Alunos sem nome da mãe",
  alunos_sem_telefone: "Alunos sem telefone",
  alunos_idade_dessincronizada: "Idade dessincronizada",
  alunos_duplicados: "Possíveis cadastros duplicados",
  alunos_sem_cpf: "Alunos sem CPF",
};

// Só os itens ligados a um cadastro de aluno individual fazem sentido linkar
// para /painel/alunos — "turmas_ativas_sem_professor" aponta pra turmas.
const problemaLinkaAluno: Record<string, boolean> = {
  alunos_sem_acesso_portal: true,
  alunos_sem_vinculo_turma: true,
  turmas_ativas_sem_professor: false,
  alunos_sem_nome_mae: true,
  alunos_sem_telefone: true,
  alunos_idade_dessincronizada: true,
  alunos_duplicados: true,
  alunos_sem_cpf: true,
};

const ordemSeveridade: Record<Severidade, number> = { critico: 0, atencao: 1, informativo: 2 };

function iconeSeveridade(severidade: Severidade) {
  if (severidade === "critico") return "🔴";
  if (severidade === "atencao") return "🟡";
  return "⚪";
}

function corSeveridade(severidade: Severidade) {
  if (severidade === "critico") return "border-red-300 bg-red-50 text-red-700";
  if (severidade === "atencao") return "border-yellow-300 bg-yellow-50 text-yellow-800";
  return "border-border bg-accent/20 text-muted-foreground";
}

function formatarData(data: string | null) {
  if (!data) return "—";
  return new Date(data).toLocaleDateString("pt-BR");
}

function formatarDataHora(data: string | null) {
  if (!data) return "Nunca registrado";
  return new Date(data).toLocaleString("pt-BR");
}

function formatarTamanho(bytes: number) {
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function diasDesde(data: string) {
  return Math.floor((Date.now() - new Date(data).getTime()) / (1000 * 60 * 60 * 24));
}

function baixarArquivo(nome: string, conteudo: string, tipo = "application/json") {
  const blob = new Blob([conteudo], { type: `${tipo};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Backup — migrado de painel.seguranca.tsx
// ---------------------------------------------------------------------------

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

const tabelasAcessoRapido: TabelaBackup[] = ["alunos", "turmas", "presencas"];
const tabelasSecundarias: TabelaBackup[] = tabelasBackup.filter(
  (t) => !tabelasAcessoRapido.includes(t),
);

// Nomes amigáveis pras tabelas mostradas na contagem geral — inclui
// push_subscriptions, que não faz parte do backup JSON.
const labelTabelaContagem: Record<string, string> = {
  ...labelTabela,
  push_subscriptions: "Inscrições de push (avisos)",
};

async function buscarTabela(nomeTabela: TabelaBackup) {
  const { data, error } = await buscarTodasLinhas(nomeTabela, "*");
  if (error) throw new Error(error.message);
  return data;
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

function BancoDeDados() {
  return (
    <div className="space-y-6">
      <BlocoContagemTabelas />
      <BlocoSeguranca />
      <BlocoIntegridade />
      <BlocoSaudeOperacional />
      <BlocoStorageUso />
      <BlocoRpcsAtivas />
      <BlocoBackup />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Contagem de registros por tabela
// ---------------------------------------------------------------------------

function BlocoContagemTabelas() {
  const [contagens, setContagens] = useState<ContagemTabela[] | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    const { data, error } = await supabase.rpc("diagnostico_contagem_tabelas");
    if (error) {
      console.error(error);
      toast.error("Erro ao carregar contagem de tabelas.");
    } else {
      setContagens((data ?? []) as ContagemTabela[]);
    }
    setCarregando(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" />
          Contagem de registros
        </CardTitle>
        <CardDescription>Total de linhas por tabela principal, direto do banco.</CardDescription>
      </CardHeader>
      <CardContent>
        {carregando ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {(contagens ?? []).map((c) => (
              <div key={c.tabela} className="rounded-xl border border-border p-3">
                <p className="text-lg font-bold leading-tight">{c.total}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {labelTabelaContagem[c.tabela] ?? c.tabela}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Auditoria de segurança (RLS)
// ---------------------------------------------------------------------------

function BlocoSeguranca() {
  const [tabelas, setTabelas] = useState<TabelaSeguranca[] | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    setErro(false);
    const { data, error } = await supabase.rpc("diagnostico_seguranca_rls");
    if (error) {
      console.error(error);
      setErro(true);
      toast.error("Erro ao carregar auditoria de segurança.");
    } else {
      setTabelas((data ?? []) as TabelaSeguranca[]);
    }
    setCarregando(false);
  }

  const alertasCriticos = (tabelas ?? [])
    .flatMap((t) => t.alertas.map((a) => ({ ...a, tabela: t.tabela })))
    .filter((a) => a.severidade === "critico");

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Auditoria de segurança
            </CardTitle>
            <CardDescription>
              Políticas de RLS realmente aplicadas em cada tabela do banco, direto do Postgres.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={carregar} disabled={carregando}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {carregando ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : erro ? (
          <p className="text-sm text-muted-foreground">Não foi possível carregar a auditoria.</p>
        ) : (
          <>
            {alertasCriticos.length > 0 ? (
              <div className="space-y-2">
                {alertasCriticos.map((a, i) => (
                  <div
                    key={`${a.tabela}-${a.policyname}-${i}`}
                    className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700"
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      Tabela "{a.tabela}" · política "{a.policyname}"
                    </div>
                    <p className="mt-1 text-red-600">{a.motivo}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-700">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                Nenhuma política permissiva encontrada.
              </div>
            )}

            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tabela</TableHead>
                    <TableHead className="text-center">RLS</TableHead>
                    <TableHead className="text-center">Políticas</TableHead>
                    <TableHead>Pontos de atenção</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(tabelas ?? []).map((t) => (
                    <TableRow key={t.tabela}>
                      <TableCell className="font-medium">{t.tabela}</TableCell>
                      <TableCell className="text-center">
                        {t.rls_habilitado ? (
                          <CheckCircle2 className="mx-auto h-4 w-4 text-green-600" />
                        ) : (
                          <MinusCircle className="mx-auto h-4 w-4 text-red-600" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">{t.total_policies}</TableCell>
                      <TableCell>
                        {t.alertas.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {t.alertas.map((a, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                title={a.motivo}
                                className={
                                  a.severidade === "critico"
                                    ? "border-red-300 bg-red-50 text-red-700"
                                    : "border-yellow-300 bg-yellow-50 text-yellow-800"
                                }
                              >
                                {a.severidade === "critico" ? "🔴" : "🟡"}{" "}
                                {a.policyname ?? "cobertura"}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Integridade de dados
// ---------------------------------------------------------------------------

function BlocoIntegridade() {
  const [problemas, setProblemas] = useState<ProblemaIntegridade[] | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [tipoAberto, setTipoAberto] = useState<string | null>(null);
  const [itens, setItens] = useState<ItemProblema[] | null>(null);
  const [carregandoItens, setCarregandoItens] = useState(false);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    const { data, error } = await supabase.rpc("diagnostico_integridade_dados");
    if (error) {
      console.error(error);
      toast.error("Erro ao carregar integridade de dados.");
    } else {
      const ordenado = [...((data ?? []) as ProblemaIntegridade[])].sort(
        (a, b) => ordemSeveridade[a.severidade] - ordemSeveridade[b.severidade],
      );
      setProblemas(ordenado);
    }
    setCarregando(false);
  }

  async function abrirLista(chave: string) {
    setTipoAberto(chave);
    setCarregandoItens(true);
    const { data, error } = await supabase.rpc("diagnostico_listar_problema", { p_tipo: chave });
    if (error) {
      console.error(error);
      toast.error("Erro ao carregar lista de registros.");
      setItens([]);
    } else {
      setItens((data ?? []) as ItemProblema[]);
    }
    setCarregandoItens(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Integridade de dados
        </CardTitle>
        <CardDescription>
          Consistência dos cadastros ativos, direto do banco — sem números decorativos.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {carregando ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {(problemas ?? []).map((p) => (
              <div
                key={p.chave}
                className={`flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between ${corSeveridade(p.severidade)}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg leading-none">{iconeSeveridade(p.severidade)}</span>
                  <div>
                    <p className="font-semibold">
                      {labelProblema[p.chave] ?? p.chave} — {p.contagem}
                    </p>
                    <p className="text-sm opacity-90">{p.descricao}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={p.contagem === 0}
                  onClick={() => abrirLista(p.chave)}
                  className="shrink-0 bg-background"
                >
                  Ver lista
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={tipoAberto !== null} onOpenChange={(aberto) => !aberto && setTipoAberto(null)}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tipoAberto ? (labelProblema[tipoAberto] ?? tipoAberto) : ""}</DialogTitle>
            <DialogDescription>
              {itens && itens.length > 0
                ? `Mostrando ${itens.length} de ${itens[0].total} registro(s).`
                : "Registros afetados."}
            </DialogDescription>
          </DialogHeader>

          {carregandoItens ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Detalhe</TableHead>
                  {tipoAberto && problemaLinkaAluno[tipoAberto] && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(itens ?? []).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{item.detalhe}</TableCell>
                    {tipoAberto && problemaLinkaAluno[tipoAberto] && (
                      <TableCell className="text-right">
                        <Link
                          to="/painel/alunos"
                          search={{ busca: item.nome }}
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          Ver cadastro
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Saúde operacional
// ---------------------------------------------------------------------------

// Limite de tamanho de banco do plano Free do Supabase: 500 MB de "database
// size" (o projeto entra em modo somente-leitura acima disso). Fonte:
// https://supabase.com/docs/guides/platform/database-size — seção
// "Free Plan behavior". Se o projeto migrar de plano, este número muda.
const LIMITE_BANCO_FREE_MB = 500;

function BlocoSaudeOperacional() {
  const [saude, setSaude] = useState<SaudeOperacional | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    const { data, error } = await supabase.rpc("diagnostico_saude_operacional");
    if (error) {
      console.error(error);
      toast.error("Erro ao carregar saúde operacional.");
    } else {
      const linha = (data ?? [])[0] as SaudeOperacional | undefined;
      setSaude(linha ?? null);
    }
    setCarregando(false);
  }

  const tamanhoMb = saude ? saude.tamanho_banco_bytes / (1024 * 1024) : 0;
  const percentualLimite = Math.min(100, (tamanhoMb / LIMITE_BANCO_FREE_MB) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Saúde operacional
        </CardTitle>
        <CardDescription>Sinais de uso real do sistema, não só contagens estáticas.</CardDescription>
      </CardHeader>

      <CardContent>
        {carregando || !saude ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoCard
              icon={CalendarDays}
              label="Última chamada registrada"
              valor={formatarDataHora(saude.ultima_chamada_em)}
            />
            <InfoCard
              icon={CalendarDays}
              label="Última presença lançada"
              valor={formatarDataHora(saude.ultima_presenca_em)}
            />
            <InfoCard
              icon={Users}
              label="Último aluno cadastrado"
              valor={formatarDataHora(saude.ultimo_aluno_cadastrado_em)}
            />
            <InfoCard
              icon={FileDown}
              label="Documentos pendentes"
              valor={String(saude.documentos_pendentes)}
              tone={saude.documentos_pendentes > 0 ? "warn" : "ok"}
              sub={
                saude.documentos_pendentes > 0
                  ? `Mais antigo pendente há ${saude.documento_pendente_mais_antigo_dias} dia(s)`
                  : undefined
              }
            />
            <InfoCard
              icon={Hourglass}
              label="Chaves bloqueadas (login do portal)"
              valor={String(saude.chaves_bloqueadas)}
              tone={saude.chaves_bloqueadas > 0 ? "warn" : "ok"}
            />
            <InfoCard
              icon={Database}
              label="Tamanho do banco"
              valor={formatarTamanho(saude.tamanho_banco_bytes)}
              sub={`${percentualLimite.toFixed(1)}% do limite do plano Free (${LIMITE_BANCO_FREE_MB} MB)`}
              tone={percentualLimite > 80 ? "warn" : "ok"}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Uso de Storage
// ---------------------------------------------------------------------------

function BlocoStorageUso() {
  const [uso, setUso] = useState<StorageUso[] | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    const { data, error } = await supabase.rpc("diagnostico_storage_uso");
    if (error) {
      console.error(error);
      toast.error("Erro ao carregar uso de storage.");
    } else {
      setUso((data ?? []) as StorageUso[]);
    }
    setCarregando(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-primary" />
          Uso de Storage
        </CardTitle>
        <CardDescription>
          Arquivos enviados pelos alunos (atestado médico, PAR-Q) no Supabase Storage.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {carregando ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {(uso ?? []).map((u) => (
              <InfoCard
                key={u.bucket}
                icon={HardDrive}
                label={`Bucket "${u.bucket}"`}
                valor={formatarTamanho(u.tamanho_bytes)}
                sub={`${u.total_arquivos} arquivo(s)`}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// RPCs ativas
// ---------------------------------------------------------------------------

function BlocoRpcsAtivas() {
  const [rpcs, setRpcs] = useState<RpcAtiva[] | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    const { data, error } = await supabase.rpc("diagnostico_rpcs_ativas");
    if (error) {
      console.error(error);
      toast.error("Erro ao carregar lista de RPCs.");
    } else {
      setRpcs((data ?? []) as RpcAtiva[]);
    }
    setCarregando(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Funções RPC no banco
        </CardTitle>
        <CardDescription>
          Funções do schema public expostas via RPC — {(rpcs ?? []).filter((r) => r.security_definer).length} rodam como SECURITY DEFINER.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {carregando ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Função</TableHead>
                  <TableHead className="text-center">SECURITY DEFINER</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rpcs ?? []).map((r) => (
                  <TableRow key={r.nome}>
                    <TableCell className="font-mono text-xs">{r.nome}</TableCell>
                    <TableCell className="text-center">
                      {r.security_definer ? (
                        <CheckCircle2 className="mx-auto h-4 w-4 text-green-600" />
                      ) : (
                        <MinusCircle className="mx-auto h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Última chamada e taxa de erro por função: não implementado ainda — não existe logging de
          uso de função configurado neste projeto.
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Backup
// ---------------------------------------------------------------------------

function BlocoBackup() {
  const [exportando, setExportando] = useState(false);
  const [tabelaSelecionada, setTabelaSelecionada] = useState<TabelaBackup>("lista_espera");
  const [ultimoBackup, setUltimoBackup] = useState<BackupLog | null>(null);
  const [carregandoBackup, setCarregandoBackup] = useState(true);

  useEffect(() => {
    carregarUltimoBackup();
  }, []);

  async function carregarUltimoBackup() {
    setCarregandoBackup(true);
    const { data, error } = await supabase.rpc("diagnostico_ultimo_backup");
    if (!error) {
      setUltimoBackup(((data ?? [])[0] as BackupLog | undefined) ?? null);
    }
    setCarregandoBackup(false);
  }

  async function registrarBackup(tipo: string, tabelas: string[]) {
    const { error } = await supabase.rpc("diagnostico_registrar_backup", {
      p_tipo: tipo,
      p_tabelas: tabelas,
      p_gerado_por: null,
    });
    if (error) {
      console.error(error);
      return;
    }
    carregarUltimoBackup();
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

      const hoje = hojeBrasilia();
      baixarArquivo(
        `backup-hidro-monsenhor-${hoje}.json`,
        JSON.stringify(
          {
            sistema: "Hidro e Natação Monsenhor",
            gerado_em: new Date().toISOString(),
            observacao: "Backup administrativo em JSON gerado pelo painel interno do sistema.",
            tabelas: backup,
          },
          null,
          2,
        ),
      );

      await registrarBackup("geral", [...tabelasBackup]);
      toast.success("Backup geral exportado.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido.";
      toast.error("Erro ao gerar backup.", { description: message });
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
      const hoje = hojeBrasilia();

      baixarArquivo(
        `${nomeTabela}-${hoje}.json`,
        JSON.stringify({ tabela: nomeTabela, gerado_em: new Date().toISOString(), dados }, null, 2),
      );

      await registrarBackup("tabela", [nomeTabela]);
      toast.success(`Tabela "${labelTabela[nomeTabela]}" exportada.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido.";
      toast.error(`Erro ao exportar ${labelTabela[nomeTabela]}.`, { description: message });
    } finally {
      setExportando(false);
    }
  }

  function encerrarSessao() {
    const confirmado = window.confirm("Deseja encerrar a sessão administrativa neste navegador?");
    if (!confirmado) return;
    sair();
    toast.success("Sessão encerrada.");
    window.location.href = "/painel/login";
  }

  const diasUltimoBackup = ultimoBackup ? diasDesde(ultimoBackup.criado_em) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DownloadCloud className="h-5 w-5 text-primary" />
          Backup
        </CardTitle>
        <CardDescription>Exportação administrativa e encerramento da sessão.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {carregandoBackup ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando último backup…
          </div>
        ) : ultimoBackup ? (
          <div
            className={`rounded-lg border p-3 text-sm ${
              diasUltimoBackup !== null && diasUltimoBackup > 30
                ? "border-yellow-300 bg-yellow-50 text-yellow-900"
                : "border-border bg-accent/20"
            }`}
          >
            Último backup: há {diasUltimoBackup} dia(s) ({formatarData(ultimoBackup.criado_em)}) ·{" "}
            {ultimoBackup.tipo === "geral" ? "backup geral" : `tabela ${ultimoBackup.tabelas[0]}`}
            {diasUltimoBackup !== null && diasUltimoBackup > 30 && (
              <span className="ml-2 font-medium">⚠ Mais de 30 dias sem novo backup.</span>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
            Nenhum backup registrado ainda.
          </div>
        )}

        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Os arquivos exportados podem conter dados pessoais de alunos e responsáveis. Armazene
              e compartilhe apenas com pessoas autorizadas.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={exportarBackupGeral} disabled={exportando}>
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
            <Select
              value={tabelaSelecionada}
              onValueChange={(v) => setTabelaSelecionada(v as TabelaBackup)}
              disabled={exportando}
            >
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tabelasSecundarias.map((tabela) => (
                  <SelectItem key={tabela} value={tabela}>
                    {labelTabela[tabela]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
  );
}
