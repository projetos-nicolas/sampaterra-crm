import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Providers } from "@/components/Providers";
import { MobileNavProvider } from "@/components/layout/MobileNavContext";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <Providers session={session}>
      <MobileNavProvider>
        <div className="flex h-screen overflow-hidden bg-[#FAFAF9]">
          <Sidebar />
          <div className="flex flex-col flex-1 overflow-hidden min-w-0">
            <TopBar />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
          </div>
        </div>
      </MobileNavProvider>
    </Providers>
  );
}
