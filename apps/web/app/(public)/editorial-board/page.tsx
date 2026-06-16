import { Users, Mail } from "lucide-react";

export const metadata = {
  title: "Editorial Board",
  description:
    "Meet the advisory board members who help guide Academia Alexandria's standards and direction.",
};

interface BoardMember {
  name: string;
  title: string;
  institution: string;
  expertise: string[];
}

// Advisory board members — update this list as the board grows.
const boardMembers: BoardMember[] = [];

export default function EditorialBoardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Editorial Advisory Board</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Our advisory board members help guide the platform&apos;s academic
          standards, review quality, and disciplinary coverage.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Our Role</h2>
        </div>
        <p className="leading-relaxed text-muted-foreground">
          Advisory board members are established academics who endorse the
          platform&apos;s commitment to transparent peer review. They help
          define review standards, recommend disciplinary coverage, and lend
          their expertise to platform governance. Board membership does not
          involve editorial gatekeeping — acceptance on Academia Alexandria is
          determined by community peer review, not editorial discretion.
        </p>
      </section>

      {boardMembers.length > 0 ? (
        <section className="space-y-6">
          <h2 className="text-xl font-semibold">Members</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {boardMembers.map((member) => (
              <div
                key={member.name}
                className="rounded-lg border border-border p-5 space-y-2"
              >
                <h3 className="font-semibold">{member.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {member.title}, {member.institution}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {member.expertise.map((area) => (
                    <span
                      key={area}
                      className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-dashed border-border p-8 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-semibold">
            Advisory Board Forming
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            We are currently recruiting advisory board members across all
            academic disciplines. If you are an established researcher interested
            in helping shape the future of open academic publishing, we&apos;d
            love to hear from you.
          </p>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Join the Board</h2>
        </div>
        <p className="leading-relaxed text-muted-foreground">
          We welcome applications from researchers at all career stages who are
          passionate about open science and transparent peer review. Board
          members are expected to have an active publication record and expertise
          in at least one academic discipline. To express interest, reach out via
          our GitHub repository or contact us directly.
        </p>
      </section>
    </div>
  );
}
