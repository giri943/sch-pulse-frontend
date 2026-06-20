"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** The flat monitor list moved into a project-first flow. Send old links to Projects. */
export default function MonitorsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/projects");
  }, [router]);
  return null;
}
