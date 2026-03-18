"use client";

import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import AIManagerFab from "./AIManagerFab";

export default function AIManagerLayout() {
  const { isLoaded, isSignedIn } = useUser();
  const pathname = usePathname();

  // Don't render if Clerk hasn't loaded or if the user isn't logged in
  if (!isLoaded || !isSignedIn) {
    return null;
  }

  // Only render inside the dashboard, exclude landing page and admin panel
  if (pathname === "/" || pathname.startsWith("/admin")) {
    return null;
  }

  // If logged in and in the correct area, mount the FAB
  return <AIManagerFab />;
}
