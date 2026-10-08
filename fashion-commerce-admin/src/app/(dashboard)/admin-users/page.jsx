import React from "react";
import { AdminUsersListView } from "@/components/system/admin-users-list-view";

export const metadata = {
  title: "Admin Staff Accounts | VogueThreads Admin",
  description: "Manage administrative users, assign operational roles, and enforce security policies.",
};

export default function AdminUsersPage() {
  return <AdminUsersListView />;
}
