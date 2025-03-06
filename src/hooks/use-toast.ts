"use client";

import { toast } from "sonner";

type ToastProps = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

export const useToast = () => {
  const showToast = ({ title, description, variant }: ToastProps) => {
    if (variant === "destructive") {
      toast.error(title, {
        description,
      });
    } else {
      toast.success(title, {
        description,
      });
    }
  };

  return {
    toast: showToast,
  };
};