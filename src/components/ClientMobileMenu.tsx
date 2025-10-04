"use client";

import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { buttonVariants } from "./ui/button";

interface RouteProps {
  href: string;
  label: string;
}

interface MobileMenuProps {
  routeList: RouteProps[];
}

export function ClientMobileMenu({ routeList }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder menu button
    return (
      <div className="px-2">
        <Menu className="flex md:hidden h-5 w-5" />
        <span className="sr-only">Menu Icon</span>
      </div>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger className="px-2">
        <Menu
          className="flex md:hidden h-5 w-5"
          onClick={() => setIsOpen(true)}
        >
          <span className="sr-only">Menu Icon</span>
        </Menu>
      </SheetTrigger>

      <SheetContent side={"left"}>
        <SheetHeader>
          <SheetTitle className="font-bold text-xl">
            Shadcn/React
          </SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col justify-center items-center gap-2 mt-4">
          {routeList.map(({ href, label }: RouteProps) => (
            <a
              rel="noreferrer noopener"
              key={label}
              href={href}
              onClick={() => setIsOpen(false)}
              className={buttonVariants({ variant: "ghost" })}
            >
              {label}
            </a>
          ))}
          <Link
            href="/login"
            className={`w-[110px] border ${buttonVariants({
              variant: "secondary",
            })}`}
          >
            <span className="mr-2">🔐</span>
            Login
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}