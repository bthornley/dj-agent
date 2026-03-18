"use client";

import { useUser } from "@clerk/nextjs";
import AIManagerFab from "./AIManagerFab";

export default function AIManagerLayout() {
  const { isLoaded, isSignedIn } = useUser();

  // Don't render if Clerk hasn't loaded or if the user isn't logged in
  if (!isLoaded || !isSignedIn) {
    return null;
  }

  // If logged in, mount the FAB
  return <AIManagerFab />;
}
