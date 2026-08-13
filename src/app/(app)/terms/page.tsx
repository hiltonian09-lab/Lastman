import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-16">
      <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-foreground-muted">
        Last updated: {new Date().toLocaleDateString("en-GB")}
      </p>

      <div className="mt-8 space-y-4 text-sm leading-relaxed text-foreground-muted">
        <p>
          <strong>Draft placeholder.</strong> These terms must be reviewed and finalised by the platform owner with appropriate legal advice before launch.
        </p>
        <p>
          This platform is a software-rental service. It does not collect, hold, or distribute player entry fees or prize money. Game organisers are solely responsible for their own player agreements, entry fees, prize pools and any associated disputes.
        </p>
        <p>
          The only money processed through the platform is a flat admin fee paid by game organisers for use of the software. This fee is charged regardless of game outcome and is not tied to the size of any prize pool.
        </p>
      </div>

      <Link
        href="/privacy"
        className="mt-8 text-sm text-royal-blue hover:underline"
      >
        Privacy notice
      </Link>
    </div>
  );
}
