import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="mx-auto w-full max-w-4xl flex-1 p-6">
        {children}
      </main>
      <Footer />
    </div>
  );
}
