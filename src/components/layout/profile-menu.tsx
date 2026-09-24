"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/actions/settings";

export type ProfileMenuUser = {
  name: string | null;
  email: string;
  image: string | null;
};

function getInitials(name: string | null, email: string) {
  if (name && name.trim()) {
    const initials = name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
    if (initials) return initials;
  }
  return email[0]?.toUpperCase() ?? "?";
}

export function ProfileMenu({
  user,
  className,
}: {
  user: ProfileMenuUser;
  className?: string;
}) {
  const displayName = user.name ?? user.email;
  const initials = getInitials(user.name, user.email);

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label="Account menu" className="rounded-full">
            <Avatar>
              {user.image ? <AvatarImage src={user.image} alt={displayName} /> : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="flex flex-col">
            <span className="text-sm font-medium">{displayName}</span>
            <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings">Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <form action={logout} className="w-full">
              <button type="submit" className="w-full text-left">
                Log out
              </button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
