"use client";

import { ReactNode } from "react";
import { useToast, ToastContainer } from "@/lib/toast";

export function Providers({ children }: { children: ReactNode }): ReactNode {
  const { toasts, removeToast } = useToast();

  return (
    <>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}
