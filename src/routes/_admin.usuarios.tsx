import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserCog, CheckCircle2, MinusCircle, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_admin/usuarios")({
  head: () => ({
    meta: [{ title: "Usuários e Perfis" }],
  }),
  component: Usuarios,
});

const perfis = [
  {
    nome: "Administrador",
    desc: "Acesso completo ao sistema, incluindo segurança, backup e gestão de usuários.",
    cor: "bg-primary text-primary-foreground",
  },
  {
    nome: "Recepção",
    desc: "Gerenciamento de alunos, turmas, lista de espera, documentos, avisos e presença.",
    cor: "bg-accent text-accent-foreground border border-border",
  },
  {
    nome: "Professor",
    desc: "Acesso às turmas e ao controle de presença.",
    cor: "bg-secondary text-secondary-foreground border border-border",
  },
];

// Mesma ordem do menu em admin-sidebar.tsx, pra ficar fácil comparar.
// Os valores aqui refletem o que está em permissoesPorPerfil (lib/auth.ts).
const matriz = [
  { recurso: "Painel administrativo", admin: true, recep: true, prof: true },
  { recurso: "Alunos", admin: true, recep: true, prof: false },
  { recurso: "Turmas", admin: true, recep: true, prof: true },
  { recurso: "Presença", admin: true, recep: true, prof: true },
  { recurso: "Avisos", admin: true, recep: true, prof: false },
  { recurso: "Documentos", admin: true, recep: true, prof: false },
  { recurso: "Lista de Espera", admin: true, recep: true, prof: false },
  { recurso: "Relatórios", admin: true, recep: true, prof: false },
  { recurso: "Segurança e Backup", admin: true, recep: false, prof: false },
  { recurso: "Usuários e perfis", admin: true, recep: false, prof: false },
];

const equipe = [
  {
    nome: "Administração Geral",
    usuario: "administracao",
    perfil: "Administrador",
  },
  {
    nome: "Equipe de Recepção",
    usuario: "recepcao",
    perfil: "Recepção",
  },
  {
    nome: "Professor Responsável",
    usuario: "professor",
    perfil: "Professor",
  },
];

function Usuarios() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            Perfis de acesso
          </CardTitle>

          <CardDescription>
            Controle interno de permissões do painel administrativo.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4 md:grid-cols-3">
          {perfis.map((p) => (
            <div key={p.nome} className="rounded-xl border border-border p-4">
              <Badge className={p.cor}>{p.nome}</Badge>

              <p className="mt-3 text-sm leading-relaxed text-foreground/80">{p.desc}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Matriz de permissões</CardTitle>

          <CardDescription>Visualização dos acessos liberados para cada perfil.</CardDescription>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recurso</TableHead>
                <TableHead className="text-center">Administrador</TableHead>
                <TableHead className="text-center">Recepção</TableHead>
                <TableHead className="text-center">Professor</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {matriz.map((r) => (
                <TableRow key={r.recurso}>
                  <TableCell className="font-medium">{r.recurso}</TableCell>

                  <TableCell className="text-center">
                    {r.admin ? (
                      <CheckCircle2 className="mx-auto h-4 w-4 text-green-600" />
                    ) : (
                      <MinusCircle className="mx-auto h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>

                  <TableCell className="text-center">
                    {r.recep ? (
                      <CheckCircle2 className="mx-auto h-4 w-4 text-green-600" />
                    ) : (
                      <MinusCircle className="mx-auto h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>

                  <TableCell className="text-center">
                    {r.prof ? (
                      <CheckCircle2 className="mx-auto h-4 w-4 text-green-600" />
                    ) : (
                      <MinusCircle className="mx-auto h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equipe autorizada</CardTitle>

          <CardDescription>Usuários internos com acesso ao painel administrativo.</CardDescription>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Perfil</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {equipe.map((e) => (
                <TableRow key={e.usuario}>
                  <TableCell className="font-medium">{e.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{e.usuario}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{e.perfil}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
