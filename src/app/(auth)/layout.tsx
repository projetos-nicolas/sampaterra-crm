import { Providers } from "@/components/Providers";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Providers session={null}>{children}</Providers>;
}
