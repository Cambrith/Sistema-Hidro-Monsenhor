const CHAVE_SOM_ATIVO = "hidro-monsenhor:portal-avisos-som";

export function somDeAvisoAtivo(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(CHAVE_SOM_ATIVO) === "1";
}

export function definirSomDeAviso(ativo: boolean) {
  window.localStorage.setItem(CHAVE_SOM_ATIVO, ativo ? "1" : "0");
}

// Beep curto sintetizado via Web Audio — evita depender de um arquivo de
// áudio só pra um alerta discreto de "chegou aviso novo".
export function tocarSomDeAviso() {
  if (!somDeAvisoAtivo()) return;
  try {
    const contexto = new AudioContext();
    const oscilador = contexto.createOscillator();
    const ganho = contexto.createGain();

    oscilador.type = "sine";
    oscilador.frequency.value = 880;
    ganho.gain.setValueAtTime(0.15, contexto.currentTime);
    ganho.gain.exponentialRampToValueAtTime(0.001, contexto.currentTime + 0.25);

    oscilador.connect(ganho);
    ganho.connect(contexto.destination);
    oscilador.start();
    oscilador.stop(contexto.currentTime + 0.25);
    oscilador.onended = () => contexto.close();
  } catch {
    // Ambiente sem suporte a Web Audio (raro) — falha silenciosa, não é crítico.
  }
}
