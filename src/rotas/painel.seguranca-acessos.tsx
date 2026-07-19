import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/utilitarios/supabase";
import { permissoesPorPerfil, type Perfil, type Permissao } from "@/utilitarios/autenticacao";
import { InfoCard } from "@/componentes/diagnostico-info-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Badge } from "@/componentes/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";
import {
  UserCog,
  CheckCircle2,
  MinusCircle,
  ShieldQuestion,
  KeyRound,
  ScrollText,
  FileLock2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/painel/seguranca-acessos")({
  head: () => ({ meta: [{ title: "Segurança e Acessos" }] }),
  component: SegurancaAcessos,
});

type MembroEquipe = { nome: string; perfil: Perfil; ativo: boolean; criado_em: string };

type TentativaLogin = {
  chave: string;
  falhas: number;
  bloqueado_ate: string | null;
  atualizado_em: string;
};

// Recursos exibidos na matriz de permissões, na mesma ordem do menu lateral.
// Os labels são só apresentação — o conjunto de permissões e quem tem acesso
// a cada uma vem de permissoesPorPerfil (autenticacao.ts), não é copiado aqui.
// Reflete o Permissao real do código: "usuarios" foi removida por não gatear
// mais nenhuma rota (a antiga tela de Usuários virou parte desta página), e
// "seguranca" agora corresponde às 3 páginas de Sistema (Banco de Dados,
// Aplicação/Deploy e esta aqui), não a uma tela única.
const labelPermissao: Record<Permissao, string> = {
  painel: "Painel administrativo",
  "pre-cadastros": "Lista de Espera",
  alunos: "Alunos e Documentos",
  turmas: "Turmas",
  presenca: "Presença",
  avisos: "Avisos",
  relatorios: "Relatórios",
  seguranca: "Sistema (Banco de Dados / Aplicação / Segurança)",
};

const todosPerfis: Perfil[] = ["Administrador", "Recepção", "Professor"];

function formatarData(data: string | null) {
  if (!data) return "—";
  return new Date(data).toLocaleDateString("pt-BR");
}

function formatarDataHora(data: string | null) {
  if (!data) return "Nunca registrado";
  return new Date(data).toLocaleString("pt-BR");
}

function SegurancaAcessos() {
  return (
    <div className="space-y-6">
      <BlocoEquipe />
      <BlocoAcessoPortal />
      <BlocoLGPD />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Equipe e acessos
// ---------------------------------------------------------------------------

function BlocoEquipe() {
  const [equipe, setEquipe] = useState<MembroEquipe[] | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    const { data, error } = await supabase.rpc("diagnostico_equipe");
    if (error) {
      console.error(error);
      toast.error("Erro ao carregar equipe.");
    } else {
      setEquipe((data ?? []) as MembroEquipe[]);
    }
    setCarregando(false);
  }

  const permissoes = Object.keys(labelPermissao) as Permissao[];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-5 w-5 text-primary" />
          Equipe e acessos
        </CardTitle>
        <CardDescription>
          Equipe real cadastrada em perfis, e a matriz de permissões efetivamente aplicada no
          código.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recurso</TableHead>
                {todosPerfis.map((perfil) => (
                  <TableHead key={perfil} className="text-center">
                    {perfil}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissoes.map((permissao) => (
                <TableRow key={permissao}>
                  <TableCell className="font-medium">{labelPermissao[permissao]}</TableCell>
                  {todosPerfis.map((perfil) => {
                    const tem = permissoesPorPerfil[perfil]?.includes(permissao) ?? false;
                    return (
                      <TableCell key={perfil} className="text-center">
                        {tem ? (
                          <CheckCircle2 className="mx-auto h-4 w-4 text-green-600" />
                        ) : (
                          <MinusCircle className="mx-auto h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Equipe cadastrada (tabela perfis)</p>
          {carregando ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Desde</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(equipe ?? []).map((membro) => (
                  <TableRow key={membro.nome}>
                    <TableCell className="font-medium">{membro.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{membro.perfil}</Badge>
                    </TableCell>
                    <TableCell>
                      {membro.ativo ? (
                        <Badge className="border-green-300 bg-green-50 text-green-700">Ativo</Badge>
                      ) : (
                        <Badge variant="outline">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatarData(membro.criado_em)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Login do Portal do Aluno
// ---------------------------------------------------------------------------

function BlocoAcessoPortal() {
  const [tentativas, setTentativas] = useState<TentativaLogin[] | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    const { data, error } = await supabase.rpc("diagnostico_tentativas_login_recentes");
    if (error) {
      console.error(error);
      toast.error("Erro ao carregar tentativas de login.");
    } else {
      setTentativas((data ?? []) as TentativaLogin[]);
    }
    setCarregando(false);
  }

  const bloqueadasAgora = (tentativas ?? []).filter(
    (t) => t.bloqueado_ate && new Date(t.bloqueado_ate).getTime() > Date.now(),
  ).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldQuestion className="h-5 w-5 text-primary" />
          Login do Portal do Aluno
        </CardTitle>
        <CardDescription>
          Fluxo customizado (nome completo + nascimento + nome da mãe/endereço) — sem Supabase Auth
          por senha. Cada linha abaixo é uma chave (hash), nunca o nome do aluno.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoCard
            icon={KeyRound}
            label="Bloqueios ativos agora"
            valor={String(bloqueadasAgora)}
            tone={bloqueadasAgora > 0 ? "warn" : "ok"}
          />
          <InfoCard
            icon={ScrollText}
            label="Chaves com tentativa registrada (últimas 50)"
            valor={String((tentativas ?? []).length)}
          />
        </div>

        {carregando ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (tentativas ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma tentativa de login falha registrada.
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chave (hash)</TableHead>
                  <TableHead className="text-center">Falhas</TableHead>
                  <TableHead>Bloqueado até</TableHead>
                  <TableHead>Última atualização</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(tentativas ?? []).map((t) => (
                  <TableRow key={t.chave}>
                    <TableCell className="font-mono text-xs">{t.chave.slice(0, 12)}…</TableCell>
                    <TableCell className="text-center">{t.falhas}</TableCell>
                    <TableCell>
                      {t.bloqueado_ate ? formatarDataHora(t.bloqueado_ate) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatarDataHora(t.atualizado_em)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BlocoLGPD() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileLock2 className="h-5 w-5 text-primary" />
          Notas de conformidade (LGPD)
        </CardTitle>
        <CardDescription>
          Documentação de onde os dados sensíveis ficam e como são protegidos — não é uma métrica
          ao vivo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-foreground/85">
        <p>
          <strong>Dados sensíveis (atestado médico, PAR-Q):</strong> arquivos ficam no bucket{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">documentos-aluno</code> do
          Supabase Storage; os metadados (status, validade) ficam na tabela{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">documentos_aluno</code>. Acesso
          direto é bloqueado por RLS — leitura e escrita passam por RPCs{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">SECURITY DEFINER</code> que
          conferem a identidade do aluno chamador (ver "Banco de Dados" para a auditoria de RLS
          real).
        </p>
        <p>
          <strong>Criptografia em trânsito:</strong> toda comunicação com o Supabase (banco,
          Storage, Auth, Edge Functions) usa TLS. <strong>Em repouso:</strong> gerenciada pela
          infraestrutura do Supabase (Postgres + Storage sobre criptografia at-rest do provedor
          de nuvem) — não há camada de criptografia adicional implementada por este sistema.
        </p>
        <p>
          <strong>Backup:</strong> exportação administrativa manual em JSON ("Banco de Dados" →
          Backup), registrada com data/hora de cada geração. Não há backup automático agendado
          além do backup gerenciado pelo próprio Supabase.
        </p>
      </CardContent>
    </Card>
  );
}
