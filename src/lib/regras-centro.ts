import {
  AlertTriangle,
  Clock,
  FileText,
  RefreshCw,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type RegraCentro = {
  titulo: string;
  icon: LucideIcon;
  texto: string;
  acaoPortal?: string;
};

// Fonte única das regras do centro. Usada tanto na Central de Dúvidas
// pública (acesso-rapido.tsx, sem "acaoPortal") quanto na página de
// dúvidas do Portal do Aluno (portal.ajuda.tsx, com "acaoPortal") —
// assim o texto da regra muda em um lugar só.
export const regrasCentro: RegraCentro[] = [
  {
    titulo: "Faltas",
    icon: AlertTriangle,
    texto:
      "4 ou mais faltas sem justificativa no mês anulam a vaga. Até 3 faltas não justificadas ainda mantêm você ativo.",
  },
  {
    titulo: "Atestado médico e PAR-Q",
    icon: FileText,
    texto: "Ambos devem ser renovados anualmente, no 1º dia letivo do ano.",
    acaoPortal: "Envie o documento atualizado pelo portal, na aba Documentos.",
  },
  {
    titulo: "Uniforme",
    icon: ShieldCheck,
    texto: "Touca azul-marinho ou preta. Sunga ou maiô da mesma cor.",
  },
  {
    titulo: "Tolerância de atraso",
    icon: Clock,
    texto: "5 minutos após o horário de início da aula.",
  },
  {
    titulo: "Troca de turma",
    icon: RefreshCw,
    texto:
      "Pode ser solicitada à secretaria a cada 3 meses. Fale pelos canais de contato para verificar disponibilidade.",
  },
];