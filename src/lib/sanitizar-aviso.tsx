export function pareceHtml(valor: string) {
  return /<\/?[a-z][\s\S]*>/i.test(valor);
}

export function escaparHtml(valor: string) {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function textoSimplesParaHtml(texto: string) {
  return texto
    .split(/\n{2,}/)
    .map((paragrafo) => {
      const conteudo = escaparHtml(paragrafo.trim()).replace(/\n/g, "<br />");
      return conteudo ? `<p>${conteudo}</p>` : "";
    })
    .join("");
}

export function sanitizarHtmlAviso(html?: string | null) {
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

export function textoPlanoAviso(html?: string | null) {
  if (!html) return "";
  if (typeof window === "undefined") {
    return html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  const div = document.createElement("div");
  div.innerHTML = sanitizarHtmlAviso(html);
  div.querySelectorAll("p, div, li").forEach((elemento) => {
    elemento.append(" ");
  });
  return (div.textContent ?? "").replace(/\s+/g, " ").trim();
}

export function AvisoMensagemHtml({
  mensagem,
  className = "",
}: {
  mensagem: string;
  className?: string;
}) {
  return (
    <div
      className={`space-y-2 whitespace-normal text-sm leading-relaxed [&_div]:mb-2 [&_em]:italic [&_li]:ml-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-2 [&_strong]:font-semibold [&_u]:underline [&_ul]:list-disc [&_ul]:pl-4 ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizarHtmlAviso(mensagem) }}
    />
  );
}
