import type { ReactNode } from "react";
import { Boxes, MessageCircle, UserRound } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import "@/public-workspace.css";

const navigation = [
  { label: "Excambia", href: "/excambia", icon: MessageCircle },
  { label: "Acompanhamento", href: "/operacoes", icon: Boxes },
  { label: "Minha conta", href: "/minha-conta", icon: UserRound },
];

export function WorkspaceBrand() {
  return (
    <span className="pw-brand">
      <img src="/suppley-icon.png" alt="" width="36" height="36" />
      <span>
        Suppley<small>Comércio exterior</small>
      </span>
    </span>
  );
}

export default function PublicWorkspace({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();
  return (
    <div className="pw-shell pw-theme">
      <aside className="pw-rail">
        <Link href="/excambia" aria-label="Suppley, início">
          <WorkspaceBrand />
        </Link>
        <nav className="pw-navigation" aria-label="Menu principal">
          {navigation.map(({ label, href, icon: Icon }) => {
            const current =
              location === href ||
              (href === "/excambia" && location === "/") ||
              (href === "/operacoes" && location.startsWith("/operacao/"));
            return (
              <Link
                key={href}
                href={href}
                aria-current={current ? "page" : undefined}
              >
                <Icon size={19} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="pw-rail-account">
          <span className="pw-avatar" aria-hidden="true">
            {user?.name?.trim().charAt(0).toUpperCase() || (
              <UserRound size={17} />
            )}
          </span>
          <span>{user?.name || "Minha conta"}</span>
        </div>
      </aside>
      <main className="pw-workspace">{children}</main>
    </div>
  );
}
