import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPaper } from "@/actions/paper";
import { PaperForm } from "@/components/papers/paper-form";

export const metadata = {
  title: "Edit Paper",
};

export default async function EditPaperPage({
  params,
}: {
  params: Promise<{ paperId: string }>;
}) {
  const { paperId } = await params;
  const [paper, session] = await Promise.all([getPaper(paperId), auth()]);

  if (!paper) {
    notFound();
  }

  if (!session?.user?.id) {
    redirect("/login");
  }

  const isAuthor = paper.authors.some((a) => a.userId === session?.user?.id);
  if (!isAuthor) {
    notFound();
  }

  if (paper.status === "RETRACTED") {
    redirect(`/papers/${paperId}`);
  }

  const isVersioned =
    paper.status === "PUBLISHED" || paper.status === "SUBMITTED";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Edit Paper</h1>
        <p className="mt-2 text-muted-foreground">
          {isVersioned
            ? `Currently on version ${paper.version}. Saving will create version ${paper.version + 1}.`
            : "Make your changes and click Save when you're done."}
        </p>
      </div>
      {isVersioned && (
        <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-4 text-sm">
          <p className="font-medium text-yellow-700 dark:text-yellow-400">
            Editing will create a new version
          </p>
          <p className="mt-1 text-yellow-600 dark:text-yellow-500">
            Previous versions will remain accessible. Existing comments will be
            tagged with the version they were written on.
          </p>
        </div>
      )}
      <PaperForm
        paperId={paperId}
        defaultValues={{
          title: paper.title,
          abstract: paper.abstract,
          content: paper.content ?? "",
          disciplines: paper.disciplines,
          keywords: paper.keywords,
          license: paper.license,
          funding: paper.funding,
          dataAvailability: paper.dataAvailability,
          competingInterests: paper.competingInterests,
          ethicsStatement: paper.ethicsStatement,
          contributions:
            paper.authors.find((a) => a.userId === session?.user?.id)
              ?.contributions ?? [],
          coAuthorIds: [],
          hasPdf: !!paper.pdfUrl,
        }}
      />
    </div>
  );
}
