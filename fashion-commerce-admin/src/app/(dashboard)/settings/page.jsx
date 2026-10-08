import React from "react";
import { SettingsView } from "@/components/system/settings-view";

export const metadata = {
  title: "Settings | VogueThreads Admin",
  description: "General store configuration, Indian GST & HSN parameters, logistics couriers, and payment methods.",
};

export default function SettingsPage() {
  return <SettingsView />;
}
