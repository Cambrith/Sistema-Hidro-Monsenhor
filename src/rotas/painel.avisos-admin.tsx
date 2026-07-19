import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/utilitarios/supabase";
import { getSessao } from "@/utilitarios/autenticacao";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Switch } from "@/componentes/ui/switch";
import { Badge } from "@/componentes/ui/badge";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Megaphone,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
  Archive,
  RotateCcw,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Users,
  BellRing,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/painel/avisos-admin")({
  head: () => ({ meta: [{ title: "Gerenciamento de Avisos" }] }),
  component: AvisosAdmin,
});

type Aviso = {
  id: string;
  titulo: string;
  mensagem: string;
  resumo: string | null;
  data: string;
  importante: boolean;
  publico: boolean;
  visivel_portal: boolean;
  urgente: boolean;
  turma_id: string | null;
  ativo: boolean;
  created_at?: string;
};

type Turma = {
  id: string;
  nome: string;
};

type AvisoForm = {
  titulo: string;
  mensagem: string;
  resumo: string;
  data: string;
  importante: boolean;
  publico: boolean;
  visivel_portal: boolean;
  urgente: boolean;
  turma_id: string | null;
};

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function pareceHtml(valor: string) {
  return /<\/?[a-z][\s\S]*>/i.test(valor);
}

function escaparHtml(valor: string) {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function textoSimplesParaHtml(texto: string) {
  return texto
    .split(/\n{2,}/)
    .map((paragrafo) => {
      const conteudo = escaparHtml(paragrafo.trim()).replace(/\n/g, "<br />");
      return conteudo ? `<p>${conteudo}</p>` : "";
    })
    .join("");
}

function sanitizarHtmlAviso(html?: string | null) {
  if (!html) return "";
  if (typeof window === "undefined") return html;

  const entrada = pareceHtml(html) ? html : textoSimplesParaHtml(html);
  const template = document.createElement("template");
  template.innerHTML = entrada;

  const tagsPermitidas = new Set([
    "P",
    "DIV",
    "BR",
    "STRONG",
    "B",
    "EM",
    "I",
    "U",
    "UL",
    "OL",
    "LI",
  ]);

  const elementos = Array.from(template.content.querySelectorAll("*"));

  elementos.forEach((elemento) => {
    Array.from(elemento.attributes).forEach((attr) => {
      elemento.removeAttribute(attr.name);
    });

    if (elemento.tagName === "B") {
      const strong = document.createElement("strong");
      strong.innerHTML = elemento.innerHTML;
      elemento.replaceWith(strong);
      return;
    }

    if (elemento.tagName === "I") {
      const em = document.createElement("em");
      em.innerHTML = elemento.innerHTML;
      elemento.replaceWith(em);
      return;
    }

    if (!tagsPermitidas.has(elemento.tagName)) {
      elemento.replaceWith(...Array.from(elemento.childNodes));
    }
  });

  return template.innerHTML;
}

function textoPlanoAviso(html?: string | null) {
  if (!html) return "";
  if (typeof window === "undefined") {
    return html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const div = document.createElement("div");
  div.innerHTML = sanitizarHtmlAviso(html);
  div.querySelectorAll("p, div, li").forEach((el) => el.append(" "));
  return (div.textContent ?? "").replace(/\s+/g, " ").trim();
}

function AvisoMensagemHtml({ mensagem, className = "" }: { mensagem: string; className?: string }) {
  return (
    <div
      className={`space-y-2 whitespace-normal text-sm leading-relaxed [&_div]:mb-2 [&_em]:italic [&_li]:ml-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-2 [&_strong]:font-semibold [&_u]:underline [&_ul]:list-disc [&_ul]:pl-4 ${className}`}
      dangerouslySetInnerHTML={{
        __html: sanitizarHtmlAviso(mensagem),
      }}
    />
  );
}

function formVazio(): AvisoForm {
  return {
    titulo: "",
    mensagem: "",
    resumo: "",
    data: hojeISO(),
    importante: false,
    publico: true,
    visivel_portal: true,
    urgente: false,
    turma_id: null,
  };
}

function avisoParaForm(aviso: Aviso): AvisoForm {
  return {
    titulo: aviso.titulo ?? "",
    mensagem: sanitizarHtmlAviso(aviso.mensagem ?? ""),
    resumo: aviso.resumo ?? "",
    data: aviso.data ?? hojeISO(),
    importante: Boolean(aviso.importante),
    publico: Boolean(aviso.publico),
    visivel_portal: Boolean(aviso.visivel_portal),
    urgente: Boolean(aviso.urgente),
    turma_id: aviso.turma_id ?? null,
  };
}

function formatarData(data: string) {
  if (!data) return "";
  try {
    return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
  } catch {
    return data;
  }
}

function AvisosAdmin() {
  const sessao = getSessao();
  const perfil = sessao?.perfil;

  const podeCriarEditar = perfil === "Administrador" || perfil === "Recepção";
  const podeInativarReativar = perfil === "Administrador" || perfil === "Recepção";
  const podeExcluir = perfil === "Administrador";

  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [avisoEditando, setAvisoEditando] = useState<Aviso | null>(null);

  const avisosAtivos = useMemo(() => avisos.filter((a) => a.ativo !== false), [avisos]);

  const avisosInativos = useMemo(() => avisos.filter((a) => a.ativo === false), [avisos]);

  const nomesTurmas = useMemo(() => {
    const mapa = new Map<string, string>();
    turmas.forEach((t) => mapa.set(t.id, t.nome));
    return mapa;
  }, [turmas]);

  const carregarAvisos = useCallback(async () => {
    setCarregando(true);

    const { data, error } = await supabase
      .from("avisos")
      .select("*")
      .order("ativo", { ascending: false })
      .order("data", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar avisos:", error);
      toast.error("Não foi possível carregar os avisos.");
      setCarregando(false);
      return;
    }

    setAvisos((data ?? []) as Aviso[]);
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregarAvisos();
    supabase
      .from("turmas")
      .select("id, nome")
      .eq("ativa", true)
      .order("nome")
      .then(({ data }) => setTurmas((data ?? []) as Turma[]));
  }, [carregarAvisos]);

  function abrirNovoAviso() {
    if (!podeCriarEditar) {
      toast.error("Seu perfil não tem permissão para criar avisos.");
      return;
    }
    setAvisoEditando(null);
    setDialogAberto(true);
  }

  function abrirEditarAviso(aviso: Aviso) {
    if (!podeCriarEditar) {
      toast.error("Seu perfil não tem permissão para editar avisos.");
      return;
    }
    setAvisoEditando(aviso);
    setDialogAberto(true);
  }

  async function alterarAtivo(aviso: Aviso, ativo: boolean) {
    if (!podeInativarReativar) {
      toast.error("Seu perfil não tem permissão para alterar avisos.");
      return;
    }

    const confirmado = window.confirm(
      ativo
        ? `Deseja reativar o aviso "${aviso.titulo}"?`
        : `Deseja inativar o aviso "${aviso.titulo}"? Ele deixará de aparecer ao público, mas continuará salvo no sistema.`,
    );

    if (!confirmado) return;

    const { error } = await supabase
      .from("avisos")
      .update({
        ativo,
        publico: ativo ? aviso.publico : false,
        visivel_portal: ativo ? aviso.visivel_portal : false,
      })
      .eq("id", aviso.id);

    if (error) {
      console.error("Erro ao alterar aviso:", error);
      toast.error("Não foi possível alterar o aviso.");
      return;
    }

    toast.success(ativo ? "Aviso reativado." : "Aviso inativado.");
    carregarAvisos();
  }

  async function removerAviso(id: string) {
    if (!podeExcluir) {
      toast.error("Apenas a Administração pode remover avisos permanentemente.");
      return;
    }

    const confirmar = window.confirm(
      "Tem certeza que deseja EXCLUIR permanentemente este aviso? Essa ação não poderá ser desfeita.",
    );

    if (!confirmar) return;

    const { error } = await supabase.from("avisos").delete().eq("id", id);

    if (error) {
      console.error("Erro ao remover aviso:", error);
      toast.error("Não foi possível remover o aviso.");
      return;
    }

    toast.success("Aviso excluído permanentemente.");
    carregarAvisos();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">Gestão de avisos</h2>
          <p className="text-sm text-muted-foreground">
            Crie comunicados públicos, internos e arquive avisos sem apagar o histórico.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={carregarAvisos}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>

          {podeCriarEditar && (
            <Button onClick={abrirNovoAviso}>
              <Plus className="mr-2 h-4 w-4" />
              Novo aviso
            </Button>
          )}
        </div>
      </div>

      {!podeCriarEditar && (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">
            Seu perfil possui acesso somente para consulta dos avisos.
          </CardContent>
        </Card>
      )}

      {carregando && <p className="text-sm text-muted-foreground">Carregando avisos...</p>}

      {!carregando && avisos.length === 0 && (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Nenhum aviso cadastrado no momento.
          </CardContent>
        </Card>
      )}

      {!carregando && avisosAtivos.length > 0 && (
        <section className="space-y-3">
          <div>
            <h3 className="font-display text-base font-semibold">Avisos ativos</h3>
            <p className="text-sm text-muted-foreground">
              Avisos em uso no painel. Os públicos ativos aparecem no site.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {avisosAtivos.map((aviso) => (
              <AvisoCard
                key={aviso.id}
                aviso={aviso}
                nomeTurma={aviso.turma_id ? nomesTurmas.get(aviso.turma_id) : undefined}
                podeCriarEditar={podeCriarEditar}
                podeInativarReativar={podeInativarReativar}
                podeExcluir={podeExcluir}
                onEditar={abrirEditarAviso}
                onAlterarAtivo={alterarAtivo}
                onExcluir={removerAviso}
              />
            ))}
          </div>
        </section>
      )}

      {!carregando && avisosInativos.length > 0 && (
        <section className="space-y-3">
          <div>
            <h3 className="font-display text-base font-semibold">Avisos inativados</h3>
            <p className="text-sm text-muted-foreground">
              Avisos arquivados. Eles não aparecem ao público, mas continuam salvos para consulta ou
              reativação.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {avisosInativos.map((aviso) => (
              <AvisoCard
                key={aviso.id}
                aviso={aviso}
                nomeTurma={aviso.turma_id ? nomesTurmas.get(aviso.turma_id) : undefined}
                podeCriarEditar={podeCriarEditar}
                podeInativarReativar={podeInativarReativar}
                podeExcluir={podeExcluir}
                onEditar={abrirEditarAviso}
                onAlterarAtivo={alterarAtivo}
                onExcluir={removerAviso}
              />
            ))}
          </div>
        </section>
      )}

      {podeCriarEditar && (
        <AvisoDialog
          open={dialogAberto}
          onOpenChange={setDialogAberto}
          aviso={avisoEditando}
          turmas={turmas}
          onSaved={carregarAvisos}
        />
      )}
    </div>
  );
}

function AvisoCard({
  aviso,
  nomeTurma,
  podeCriarEditar,
  podeInativarReativar,
  podeExcluir,
  onEditar,
  onAlterarAtivo,
  onExcluir,
}: {
  aviso: Aviso;
  nomeTurma?: string;
  podeCriarEditar: boolean;
  podeInativarReativar: boolean;
  podeExcluir: boolean;
  onEditar: (aviso: Aviso) => void;
  onAlterarAtivo: (aviso: Aviso, ativo: boolean) => void;
  onExcluir: (id: string) => void;
}) {
  const ativo = aviso.ativo !== false;

  return (
    <Card className={!ativo ? "opacity-80" : ""} style={{ boxShadow: "var(--shadow-card)" }}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <Megaphone className="h-4 w-4 text-primary" />

          <div className="flex flex-wrap justify-end gap-1">
            {!ativo && (
              <Badge variant="outline">
                <Archive className="mr-1 h-3 w-3" />
                Inativo
              </Badge>
            )}

            {aviso.urgente && (
              <Badge variant="destructive">
                <BellRing className="mr-1 h-3 w-3" />
                Urgente (push)
              </Badge>
            )}

            {aviso.importante && (
              <Badge variant="destructive">
                <AlertTriangle className="mr-1 h-3 w-3" />
                Importante
              </Badge>
            )}

            {ativo && aviso.publico && (
              <Badge className="bg-primary text-primary-foreground">
                <Eye className="mr-1 h-3 w-3" />
                Site público
              </Badge>
            )}

            {ativo && aviso.visivel_portal && (
              <Badge className="bg-blue-600 text-white hover:bg-blue-600">
                <Users className="mr-1 h-3 w-3" />
                {nomeTurma ? `Portal — ${nomeTurma}` : "Portal alunos"}
              </Badge>
            )}

            {ativo && !aviso.publico && !aviso.visivel_portal && (
              <Badge variant="outline">
                <EyeOff className="mr-1 h-3 w-3" />
                Somente admin
              </Badge>
            )}
          </div>
        </div>

        <CardTitle className="mt-2 text-base">{aviso.titulo}</CardTitle>
        <CardDescription>{formatarData(aviso.data)}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 text-sm text-foreground/80">
        <div className="max-h-40 overflow-y-auto rounded-md bg-muted/30 p-3">
          <AvisoMensagemHtml mensagem={aviso.mensagem} />
        </div>

        {!ativo && (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Este aviso está inativado e não aparece na área pública.
          </p>
        )}

        {ativo && !aviso.publico && !aviso.visivel_portal && (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Este aviso é interno: não aparece no site público nem no portal do aluno.
          </p>
        )}

        {(podeCriarEditar || podeInativarReativar || podeExcluir) && (
          <div className="flex flex-wrap justify-end gap-2">
            {podeCriarEditar && (
              <Button size="sm" variant="outline" onClick={() => onEditar(aviso)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Button>
            )}

            {podeInativarReativar && (
              <Button size="sm" variant="outline" onClick={() => onAlterarAtivo(aviso, !ativo)}>
                {ativo ? (
                  <>
                    <Archive className="mr-2 h-4 w-4" />
                    Inativar
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reativar
                  </>
                )}
              </Button>
            )}

            {podeExcluir && (
              <Button size="sm" variant="ghost" onClick={() => onExcluir(aviso.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AvisoDialog({
  open,
  onOpenChange,
  aviso,
  turmas,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aviso: Aviso | null;
  turmas: Turma[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AvisoForm>(formVazio());
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(aviso ? avisoParaForm(aviso) : formVazio());
  }, [open, aviso?.id]);

  async function save() {
    const titulo = form.titulo.trim();
    const mensagemSanitizada = sanitizarHtmlAviso(form.mensagem);
    const mensagemTexto = textoPlanoAviso(mensagemSanitizada).trim();

    if (!titulo) {
      toast.error("Informe o título do aviso.");
      return;
    }

    if (!mensagemTexto) {
      toast.error("Informe a mensagem do aviso.");
      return;
    }

    if (!form.data) {
      toast.error("Informe a data do aviso.");
      return;
    }

    setSalvando(true);

    const payload = {
      titulo,
      mensagem: mensagemSanitizada,
      resumo: form.resumo.trim() || null,
      data: form.data,
      importante: form.importante,
      publico: form.publico,
      visivel_portal: form.visivel_portal,
      urgente: form.urgente,
      turma_id: form.turma_id,
    };

    let avisoId: string | null = null;
    let ativoFinal = true;

    if (aviso) {
      const { error } = await supabase.from("avisos").update(payload).eq("id", aviso.id);

      if (error) {
        console.error("Erro ao atualizar aviso:", error);
        toast.error("Não foi possível atualizar o aviso.");
        setSalvando(false);
        return;
      }

      avisoId = aviso.id;
      ativoFinal = aviso.ativo;
      toast.success("Aviso atualizado.");
    } else {
      const { data, error } = await supabase
        .from("avisos")
        .insert({ ...payload, ativo: true })
        .select("id")
        .single();

      if (error) {
        console.error("Erro ao publicar aviso:", error);
        toast.error("Não foi possível publicar o aviso.");
        setSalvando(false);
        return;
      }

      avisoId = data.id;
      toast.success("Aviso publicado.");
    }

    if (form.urgente && form.visivel_portal && ativoFinal && avisoId) {
      const { data: resultado, error: erroPush } = await supabase.functions.invoke<{
        ok: boolean;
        enviados?: number;
      }>("enviar-push-aviso", { body: { aviso_id: avisoId } });

      if (erroPush) {
        toast.error("Aviso salvo, mas o push não pôde ser enviado agora.");
      } else if (resultado && (resultado.enviados ?? 0) > 0) {
        toast.success(`Notificação push enviada a ${resultado.enviados} aluno(s).`);
      }
    }

    setSalvando(false);
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{aviso ? "Editar aviso" : "Novo aviso"}</DialogTitle>
          <DialogDescription>
            Defina se o comunicado será público no site ou interno para a equipe. Use a barra de
            formatação para destacar informações importantes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Fld label="Título">
            <Input
              value={form.titulo}
              onChange={(e) => setForm((atual) => ({ ...atual, titulo: e.target.value }))}
              placeholder="Manutenção da piscina"
              maxLength={200}
            />
          </Fld>

          <Fld label="Mensagem">
            <RichTextEditor
              value={form.mensagem}
              open={open}
              onChange={(valor) => setForm((atual) => ({ ...atual, mensagem: valor }))}
            />
          </Fld>

          <Fld label="Resumo para o card (opcional)">
            <Input
              value={form.resumo}
              onChange={(e) =>
                setForm((atual) => ({ ...atual, resumo: e.target.value.slice(0, 140) }))
              }
              placeholder="Ex.: Piscina fechada para manutenção nos dias 10 e 11. Veja os detalhes."
              maxLength={140}
            />
            <p className="text-xs text-muted-foreground">
              {form.resumo.length}/140 caracteres. Aparece no card, antes do aluno clicar em "Ler
              aviso completo". Se deixar em branco, um texto padrão é usado.
            </p>
          </Fld>

          <div className="grid gap-3 md:grid-cols-2">
            <Fld label="Data">
              <Input
                type="date"
                value={form.data}
                onChange={(e) => setForm((atual) => ({ ...atual, data: e.target.value }))}
              />
            </Fld>

            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div>
                <Label className="text-sm">Importante</Label>
                <p className="text-xs text-muted-foreground">Destaca o aviso visualmente.</p>
              </div>
              <Switch
                checked={form.importante}
                onCheckedChange={(valor) => setForm((atual) => ({ ...atual, importante: valor }))}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div>
                <Label className="text-sm">Site público</Label>
                <p className="text-xs text-muted-foreground">
                  Aparece na aba de avisos do site institucional.
                </p>
              </div>
              <Switch
                checked={form.publico}
                onCheckedChange={(valor) => setForm((atual) => ({ ...atual, publico: valor }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div>
                <Label className="text-sm">Portal do aluno</Label>
                <p className="text-xs text-muted-foreground">
                  Aparece para os alunos logados no portal.
                </p>
              </div>
              <Switch
                checked={form.visivel_portal}
                onCheckedChange={(valor) =>
                  setForm((atual) => ({ ...atual, visivel_portal: valor }))
                }
              />
            </div>
          </div>

          {!form.publico && !form.visivel_portal && (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              Sem nenhuma das duas opções marcadas, este aviso fica visível só aqui no painel
              administrativo.
            </p>
          )}

          {form.visivel_portal && (
            <>
              <Fld label="Turma alvo no portal (opcional)">
                <Select
                  value={form.turma_id ?? "todas"}
                  onValueChange={(valor) =>
                    setForm((atual) => ({ ...atual, turma_id: valor === "todas" ? null : valor }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as turmas</SelectItem>
                    {turmas.map((turma) => (
                      <SelectItem key={turma.id} value={turma.id}>
                        {turma.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Se escolher uma turma, só os alunos matriculados nela veem este aviso no portal.
                </p>
              </Fld>

              <div className="flex items-center justify-between rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2">
                <div>
                  <Label className="flex items-center gap-1.5 text-sm">
                    <BellRing className="h-3.5 w-3.5" />
                    Urgente
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Dispara notificação push no celular (ex.: aula cancelada hoje). Use só quando
                    for algo que precisa chegar mesmo com o app fechado.
                  </p>
                </div>
                <Switch
                  checked={form.urgente}
                  onCheckedChange={(valor) => setForm((atual) => ({ ...atual, urgente: valor }))}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RichTextEditor({
  value,
  open,
  onChange,
}: {
  value: string;
  open: boolean;
  onChange: (value: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const inicializado = useRef(false);
  const [formatosAtivos, setFormatosAtivos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!editorRef.current) return;
    if (inicializado.current) return;

    editorRef.current.innerHTML = sanitizarHtmlAviso(value);
    inicializado.current = true;
  }, []);

  useEffect(() => {
    if (!open) {
      inicializado.current = false;
    }
  }, [open]);

  function atualizarFormatosAtivos() {
    try {
      setFormatosAtivos({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        insertUnorderedList: document.queryCommandState("insertUnorderedList"),
        insertOrderedList: document.queryCommandState("insertOrderedList"),
      });
    } catch {
      // queryCommandState pode falhar em alguns contextos — ignora silenciosamente
    }
  }

  function atualizarValor() {
    const html = editorRef.current?.innerHTML ?? "";
    onChange(sanitizarHtmlAviso(html));
  }

  function executarComando(comando: string, valor?: string) {
    if (!editorRef.current) return;
    editorRef.current.focus();

    try {
      document.execCommand(comando, false, valor);
    } catch (e) {
      console.warn("execCommand falhou:", comando, e);
    }

    atualizarValor();
    atualizarFormatosAtivos();
  }

  function classesBotao(comando: string) {
    return formatosAtivos[comando]
      ? "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground"
      : "";
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-background">
      <div className="flex flex-wrap gap-1 border-b border-border bg-muted/40 p-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={classesBotao("bold")}
          onClick={() => executarComando("bold")}
          title="Negrito (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={classesBotao("italic")}
          onClick={() => executarComando("italic")}
          title="Itálico (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={classesBotao("underline")}
          onClick={() => executarComando("underline")}
          title="Sublinhado (Ctrl+U)"
        >
          <Underline className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={classesBotao("insertUnorderedList")}
          onClick={() => executarComando("insertUnorderedList")}
          title="Lista com marcadores"
        >
          <List className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={classesBotao("insertOrderedList")}
          onClick={() => executarComando("insertOrderedList")}
          title="Lista numerada"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={atualizarValor}
        onBlur={atualizarValor}
        onKeyUp={atualizarFormatosAtivos}
        onMouseUp={atualizarFormatosAtivos}
        onKeyDown={(e) => {
          // Impede que atalhos do editor (Ctrl+B, Ctrl+I, Ctrl+U) propaguem
          // para o roteador e ativem atalhos do painel
          if (e.ctrlKey || e.metaKey) {
            const teclas = ["b", "i", "u", "z", "y"];
            if (teclas.includes(e.key.toLowerCase())) {
              e.stopPropagation();
            }
          }
        }}
        className="min-h-36 px-3 py-2 text-sm leading-relaxed outline-none [&_div]:mb-2 [&_em]:italic [&_li]:ml-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-2 [&_strong]:font-semibold [&_u]:underline [&_ul]:list-disc [&_ul]:pl-4"
      />

      <div className="border-t border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        Selecione um trecho e clique nos botões para formatar. Atalhos: Ctrl+B (negrito), Ctrl+I
        (itálico), Ctrl+U (sublinhado).
      </div>
    </div>
  );
}

function Fld({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}
