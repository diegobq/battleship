import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ gameId?: string }>;
}) {
  const { gameId } = await params;
  if (gameId) {
    const cookieStore = await cookies();
    if (!cookieStore.has(`battleship_session_${gameId}`)) {
      redirect("/");
    }
  }
  return <>{children}</>;
}
