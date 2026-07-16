"use client";

import { SessionProvider } from "next-auth/react";
import SessionCloseLogout from "@/components/SessionCloseLogout";
import { useEffect } from "react";
import { getCsrfToken } from "@/lib/csrf-client";
import { CSRF_HEADER_NAME } from "@/lib/csrf-shared";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const originalFetch = window.fetch;
      window.fetch = async (input, init) => {
        let url = "";
        let method = "GET";
        
        if (typeof input === "string") {
          url = input;
        } else if (input instanceof URL) {
          url = input.toString();
        } else if (input instanceof Request) {
          url = input.url;
          method = input.method;
        }

        if (init?.method) {
          method = init.method;
        }
        method = method.toUpperCase();

        const isModifying = !["GET", "HEAD", "OPTIONS"].includes(method);
        const isInternal = url.startsWith("/") || url.startsWith(window.location.origin);

        if (isInternal && isModifying) {
          const token = getCsrfToken();
          if (token) {
            init = init || {};
            const newHeaders = new Headers(init.headers || (input instanceof Request ? input.headers : {}));
            if (!newHeaders.has(CSRF_HEADER_NAME)) {
              newHeaders.set(CSRF_HEADER_NAME, token);
            }
            init.headers = newHeaders;
          }
        }
        return originalFetch(input, init);
      };
    }
  }, []);

  return (
    <SessionProvider>
      <SessionCloseLogout />
      {children}
    </SessionProvider>
  );
}
