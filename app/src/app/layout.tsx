import type { Metadata } from "next";
import { ToastProvider } from "@/lib/toast-context";
import SessionProvider from "@/components/SessionProvider";
import TRPCProvider from "@/components/TRPCProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "HelixPSA",
  description: "MSP operations, evolved.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <SessionProvider>
          <TRPCProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </TRPCProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
