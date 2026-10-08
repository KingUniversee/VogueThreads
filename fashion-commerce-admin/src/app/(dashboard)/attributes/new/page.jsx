import React from "react";
import { AttributeForm } from "@/components/attributes/attribute-form";

export const metadata = {
  title: "Register Attribute | VogueThreads Admin",
  description: "Define a new technical garment specification or apparel taxonomy.",
};

export default function NewAttributePage() {
  return <AttributeForm isEditMode={false} />;
}
