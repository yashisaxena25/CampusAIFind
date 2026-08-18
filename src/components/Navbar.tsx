"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type Me = { id: string; name: string; email: string; role: string } | null;

export default function Navbar() {
  const [user, setUser] = useState<Me>(null);
  const [loaded, setLoaded] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .finally(() => setLoaded(true));
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  }

  const links = [
    { href: "/lost", label: "Lost Items" },
    { href: "/found", label: "Found Items" },
    { href: "/matches", label: "Matches" },
    { href: "/my-reports", label: "My Reports" },
    ...(user?.role === "admin" ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <header className="sticky top-0 z-30 bg-ink text-paper border-b-4 border-pin-red/80">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        <Link href="/" className="font-display text-xl tracking-wide flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-pin-red" />
          CampusFind <span className="text-highlight">AI</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`hover:text-highlight transition-colors ${
                pathname?.startsWith(l.href) ? "text-highlight" : ""
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {!loaded ? null : user ? (
            <>
              <span className="hidden sm:inline text-xs font-mono-tag text-paper/70">
                {user.name}
              </span>
              <button
                onClick={logout}
                className="text-sm px-3 py-1.5 rounded border border-paper/30 hover:border-pin-red hover:text-pin-red transition-colors"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm px-3 py-1.5 rounded border border-paper/30 hover:border-highlight hover:text-highlight transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="text-sm px-3 py-1.5 rounded bg-pin-red text-paper hover:bg-highlight hover:text-ink transition-colors font-semibold"
              >
                Join
              </Link>
            </>
          )}
        </div>
      </div>
      <div className="md:hidden flex gap-4 px-4 pb-2 text-xs font-mono-tag overflow-x-auto">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="whitespace-nowrap hover:text-highlight">
            {l.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
