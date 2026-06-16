import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PaperForm } from "@/components/papers/paper-form";

export const metadata = {
  title: "New Paper",
  description: "Create and publish a new academic paper",
};

export default async function NewPaperPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">New Paper</h1>
        <p className="mt-2 text-muted-foreground">
          Create a new paper. It will be saved as a draft until you publish it.
        </p>
      </div>
      <PaperForm />
    </div>
  );
}
