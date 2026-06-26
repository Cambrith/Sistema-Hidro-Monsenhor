import { createFileRoute } from "@tanstack/react-router";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { getSessao } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/avisos-admin")({
  head: () => ({ meta: [{ title: "Gerenciamento de Avisos" }] }),
  component: AvisosAdmin,
});

type Aviso = {
  id: string;
  titulo: string;
  mensagem: string;
  data: string;
  importante: boolean;
  publico: boolean;
  ativo: boolean;
  created_at?: string;
};

type AvisoForm = {
  titulo: string;
  mensagem: string;
  data: string;
  importante: boolean;
  publico: boolean;
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

  if (typeof window === "undefined") {
    return html;
  }

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
    return html.replace(/<[^>]*>/g, " ");
  }

  const div = document.createElement("div");
  div.innerHTML = sanitizarHtmlAviso(html);

  return div.textContent ?? "";
}

function AvisoMensagemHtml({
  mensagem,
  className = "",
}: {
  mensagem: string;
  className?: string;
}) {
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
    data: hojeISO(),
    importante: false,
    publico: true,
  };
}

function avisoParaForm(aviso: Aviso): AvisoForm {
  return {
    titulo: aviso.titulo ?? "",
    mensagem: sanitizarHtmlAviso(aviso.mensagem ?? ""),
    data: aviso.data ?? hojeISO(),
    importante: Boolean(aviso.importante),
    publico: Boolean(aviso.publico),
  };
}

function formatarData(data: string) {
  if (!data) return "";
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
}

function AvisosAdmin() {
  const sessao = getSessao();
  const perfil = sessao?.perfil;

  const podeCriarEditar =
    perfil === "Administrador" || perfil === "Recepção";
  const podeInativarReativar =
    perfil === "Administrador" || perfil === "Recepção";
  const podeExcluir = perfil === "Administrador";

  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [avisoEditando, setAvisoEditando] = useState<Aviso | null>(null);

  const avisosAtivos = useMemo(
    () => avisos.filter((aviso) => aviso.ativo !== false),
    [avisos],
  );

  const avisosInativos = useMemo(
    () => avisos.filter((aviso) => aviso.ativo === false),
    [avisos],
  );

  async function carregarAvisos() {
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
  }

  useEffect(() => {
    carregarAvisos();
  }, []);

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
  }   return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">
            Gestão de avisos
          </h2>

          <p className="text-sm text-muted-foreground">
            Crie comunicados públicos, internos e arquive avisos sem apagar o
            histórico.
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

      {carregando && (
        <p className="text-sm text-muted-foreground">Carregando avisos...</p>
      )}

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
            <h3 className="font-display text-base font-semibold">
              Avisos ativos
            </h3>
            <p className="text-sm text-muted-foreground">
              Avisos em uso no painel. Os públicos ativos aparecem no site.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {avisosAtivos.map((aviso) => (
              <AvisoCard
                key={aviso.id}
                aviso={aviso}
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
            <h3 className="font-display text-base font-semibold">
              Avisos inativados
            </h3>
            <p className="text-sm text-muted-foreground">
              Avisos arquivados. Eles não aparecem ao público, mas continuam
              salvos para consulta ou reativação.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {avisosInativos.map((aviso) => (
              <AvisoCard
                key={aviso.id}
                aviso={aviso}
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
          onSaved={carregarAvisos}
        />
      )}
    </div>
  );
}

function AvisoCard({
  aviso,
  podeCriarEditar,
  podeInativarReativar,
  podeExcluir,
  onEditar,
  onAlterarAtivo,
  onExcluir,
}: {
  aviso: Aviso;
  podeCriarEditar: boolean;
  podeInativarReativar: boolean;
  podeExcluir: boolean;
  onEditar: (aviso: Aviso) => void;
  onAlterarAtivo: (aviso: Aviso, ativo: boolean) => void;
  onExcluir: (id: string) => void;
}) {
  const ativo = aviso.ativo !== false;

  return (
    <Card
      className={!ativo ? "opacity-80" : ""}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
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

            {aviso.importante && (
              <Badge variant="destructive">
                <AlertTriangle className="mr-1 h-3 w-3" />
                Importante
              </Badge>
            )}

            {ativo && aviso.publico ? (
              <Badge className="bg-primary text-primary-foreground">
                <Eye className="mr-1 h-3 w-3" />
                Público
              </Badge>
            ) : (
              <Badge variant="outline">
                <EyeOff className="mr-1 h-3 w-3" />
                Não público
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

        {ativo && !aviso.publico && (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Este aviso é interno e não aparece na página pública de avisos.
          </p>
        )}

        {(podeCriarEditar || podeInativarReativar || podeExcluir) && (
          <div className="flex flex-wrap justify-end gap-2">
            {podeCriarEditar && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEditar(aviso)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Button>
            )}

            {podeInativarReativar && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAlterarAtivo(aviso, !ativo)}
              >
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
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onExcluir(aviso.id)}
              >
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
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aviso: Aviso | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AvisoForm>(formVazio());
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (aviso) {
      setForm(avisoParaForm(aviso));
    } else {
      setForm(formVazio());
    }
  }, [open, aviso?.id]);

  async function save() {
    const mensagemSanitizada = sanitizarHtmlAviso(form.mensagem);
    const mensagemTexto = textoPlanoAviso(mensagemSanitizada).trim();

    if (!form.titulo.trim() || !mensagemTexto) {
      toast.error("Informe título e mensagem.");
      return;
    }

    setSalvando(true);

    if (aviso) {
      const { error } = await supabase
        .from("avisos")
        .update({
          titulo: form.titulo.trim(),
          mensagem: mensagemSanitizada,
          data: form.data,
          importante: form.importante,
          publico: form.publico,
        })
        .eq("id", aviso.id);

      setSalvando(false);

      if (error) {
        console.error("Erro ao atualizar aviso:", error);
        toast.error("Não foi possível atualizar o aviso.");
        return;
      }

      toast.success("Aviso atualizado.");
      onOpenChange(false);
      onSaved();
      return;
    }

    const { error } = await supabase.from("avisos").insert({
      titulo: form.titulo.trim(),
      mensagem: mensagemSanitizada,
      data: form.data,
      importante: form.importante,
      publico: form.publico,
      ativo: true,
    });

    setSalvando(false);

    if (error) {
      console.error("Erro ao publicar aviso:", error);
      toast.error("Não foi possível publicar o aviso.");
      return;
    }

    toast.success("Aviso publicado.");
    onOpenChange(false);
    onSaved();
  }   return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{aviso ? "Editar aviso" : "Novo aviso"}</DialogTitle>

          <DialogDescription>
            Defina se o comunicado será público no site ou interno para a
            equipe. Use a barra de formatação para destacar informações
            importantes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Fld label="Título">
            <Input
              value={form.titulo}
              onChange={(e) =>
                setForm((atual) => ({
                  ...atual,
                  titulo: e.target.value,
                }))
              }
              placeholder="Manutenção da piscina"
            />
          </Fld>

          <Fld label="Mensagem">
            <RichTextEditor
              value={form.mensagem}
              onChange={(valor) =>
                setForm((atual) => ({
                  ...atual,
                  mensagem: valor,
                }))
              }
            />
          </Fld>

          <div className="grid gap-3 md:grid-cols-3">
            <Fld label="Data">
              <Input
                type="date"
                value={form.data}
                onChange={(e) =>
                  setForm((atual) => ({
                    ...atual,
                    data: e.target.value,
                  }))
                }
              />
            </Fld>

            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div>
                <Label className="text-sm">Importante</Label>
                <p className="text-xs text-muted-foreground">
                  Destaca o aviso visualmente.
                </p>
              </div>

              <Switch
                checked={form.importante}
                onCheckedChange={(valor) =>
                  setForm((atual) => ({
                    ...atual,
                    importante: valor,
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div>
                <Label className="text-sm">Público</Label>
                <p className="text-xs text-muted-foreground">
                  Aparece na página pública.
                </p>
              </div>

              <Switch
                checked={form.publico}
                onCheckedChange={(valor) =>
                  setForm((atual) => ({
                    ...atual,
                    publico: valor,
                  }))
                }
              />
            </div>
          </div>

          {!form.publico && (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              Avisos internos ficam visíveis apenas no painel administrativo.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={salvando}
          >
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
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const valorSeguro = sanitizarHtmlAviso(value);

    if (editorRef.current.innerHTML !== valorSeguro) {
      editorRef.current.innerHTML = valorSeguro;
    }
  }, [value]);

  function atualizarValor() {
    const html = editorRef.current?.innerHTML ?? "";
    onChange(sanitizarHtmlAviso(html));
  }

  function executarComando(comando: string, valor?: string) {
    editorRef.current?.focus();
    document.execCommand(comando, false, valor);
    atualizarValor();
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-background">
      <div className="flex flex-wrap gap-1 border-b border-border bg-muted/40 p-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => executarComando("bold")}
          title="Negrito"
        >
          <Bold className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => executarComando("italic")}
          title="Itálico"
        >
          <Italic className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => executarComando("underline")}
          title="Sublinhado"
        >
          <Underline className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => executarComando("insertUnorderedList")}
          title="Lista"
        >
          <List className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => executarComando("insertOrderedList")}
          title="Lista numerada"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        onInput={atualizarValor}
        onBlur={atualizarValor}
        className="min-h-36 px-3 py-2 text-sm leading-relaxed outline-none [&_div]:mb-2 [&_em]:italic [&_li]:ml-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-2 [&_strong]:font-semibold [&_u]:underline [&_ul]:list-disc [&_ul]:pl-4"
      />

      <div className="border-t border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        Selecione um trecho do texto e clique nos botões para aplicar negrito,
        itálico, sublinhado ou listas.
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