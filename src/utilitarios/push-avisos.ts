import { supabaseAluno } from "@/utilitarios/supabase";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function pushSuportado(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    !!VAPID_PUBLIC_KEY
  );
}

// Web Push exige a chave VAPID como Uint8Array — a API só aceita base64url.
function base64UrlParaUint8Array(base64Url: string): BufferSource {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0))) as unknown as BufferSource;
}

export async function inscricaoPushAtual(): Promise<PushSubscription | null> {
  if (!pushSuportado()) return null;
  const registro = await navigator.serviceWorker.ready;
  return registro.pushManager.getSubscription();
}

export async function ativarPush(alunoId: string): Promise<{ ok: boolean; erro?: string }> {
  if (!pushSuportado()) {
    return { ok: false, erro: "Este navegador/dispositivo não suporta notificações push." };
  }

  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") {
    return { ok: false, erro: "Permissão de notificação negada." };
  }

  const registro = await navigator.serviceWorker.ready;
  let inscricao = await registro.pushManager.getSubscription();
  if (!inscricao) {
    inscricao = await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlParaUint8Array(VAPID_PUBLIC_KEY as string),
    });
  }

  const json = inscricao.toJSON();
  const { error } = await supabaseAluno.rpc("portal_push_subscribir", {
    p_aluno_id: alunoId,
    p_endpoint: json.endpoint,
    p_p256dh: json.keys?.p256dh,
    p_auth: json.keys?.auth,
  });

  if (error) return { ok: false, erro: "Não foi possível salvar a inscrição no servidor." };
  return { ok: true };
}

export async function desativarPush(alunoId: string): Promise<void> {
  const inscricao = await inscricaoPushAtual();
  if (!inscricao) return;

  const endpoint = inscricao.endpoint;
  await inscricao.unsubscribe();
  await supabaseAluno.rpc("portal_push_cancelar", { p_aluno_id: alunoId, p_endpoint: endpoint });
}
