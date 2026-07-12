"use client";

import { ComponentProps } from "react";

export function ConfirmForm({
  confirmMessage,
  ...props
}: ComponentProps<"form"> & { confirmMessage: string }) {
  return (
    <form
      {...props}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    />
  );
}
