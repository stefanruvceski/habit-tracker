"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ComponentType } from "react";
import { TodayIcon, MonthIcon, YearIcon, HabitsIcon, FinanceIcon } from "./icons";

const TABS: {
  href: string;
  label: string;
  Icon: ComponentType<{ size?: number }>;
}[] = [
  { href: "/", label: "Today", Icon: TodayIcon },
  { href: "/month", label: "Month", Icon: MonthIcon },
  { href: "/dashboard", label: "Year", Icon: YearIcon },
  { href: "/finance", label: "Finance", Icon: FinanceIcon },
  { href: "/habits", label: "Habits", Icon: HabitsIcon },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-bg-elev/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-5xl mx-auto grid grid-cols-5">
        {TABS.map(({ href, label, Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                active ? "text-accent" : "text-text-faint"
              }`}
            >
              <Icon size={22} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
