"use client";

import Link from "next/link";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "./ui/navigation-menu";

import { Globe, User, LogOut } from "lucide-react";
import { buttonVariants } from "./ui/button";
import { ClientModeToggle } from "./ClientModeToggle";
import { ClientMobileMenu } from "./ClientMobileMenu";
import { LogoIcon } from "./Icons";
import { useSession, signOut } from "@/lib/nextAuthShim";
import { Button } from "./ui/button";

interface RouteProps {
  href: string;
  label: string;
}

const routeList: RouteProps[] = [
  {
    href: "#features",
    label: "Features",
  },
  {
    href: "#testimonials",
    label: "Testimonials",
  },
  {
    href: "#pricing",
    label: "Pricing",
  },
  {
    href: "#faq",
    label: "FAQ",
  },
];

export const Navbar = () => {
  const { status } = useSession();
  const sessionStatus = status as string

  return (
    <header className="sticky border-b-[1px] top-0 z-40 w-full bg-white dark:border-b-slate-700 dark:bg-background">
      <NavigationMenu className="mx-auto">
        <NavigationMenuList className="container h-14 px-4 w-screen flex justify-between ">
          <NavigationMenuItem className="font-bold flex">
            <Link
              href="/"
              className="ml-2 font-bold text-xl flex"
            >
              <LogoIcon />
              Cal Meetings
            </Link>
          </NavigationMenuItem>

          {/* mobile */}
          <span className="flex md:hidden">
            <ClientModeToggle />

            <ClientMobileMenu routeList={routeList} />
          </span>

          {/* desktop */}
          <nav className="hidden md:flex gap-2">
            {routeList.map((route: RouteProps, i) => (
              <a
                rel="noreferrer noopener"
                href={route.href}
                key={i}
                className={`text-[17px] ${buttonVariants({
                  variant: "ghost",
                })}`}
              >
                {route.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex gap-2">
            {sessionStatus === "authenticated" ? (
              <>
                <Link
                  href="/dashboard"
                  className={`border ${buttonVariants({ variant: "secondary" })}`}
                >
                  <User className="mr-2 w-5 h-5" />
                  Dashboard
                </Link>
                <Button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  variant="outline"
                  size="sm"
                >
                  <LogOut className="mr-2 w-4 h-4" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Link
                href="/login"
                className={`border ${buttonVariants({ variant: "secondary" })}`}
              >
                <Globe className="mr-2 w-5 h-5" />
                Login
              </Link>
            )}

            <ClientModeToggle />
          </div>
        </NavigationMenuList>
      </NavigationMenu>
    </header>
  );
};
