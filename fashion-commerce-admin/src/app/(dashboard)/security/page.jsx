import React from "react";
import { SecurityView } from "@/components/system/security-view";

export const metadata = {
  title: "Security Center | VogueThreads Admin",
  description: "Session inspection, credentials update, token revocation, and security posture monitoring.",
};

export default function SecurityPage() {
  return <SecurityView />;
}
