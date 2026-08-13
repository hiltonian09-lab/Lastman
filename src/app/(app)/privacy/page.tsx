import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-16">
      <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold">
        Privacy Notice
      </h1>
      <p className="mt-2 text-sm text-foreground-muted">
        Last updated: {new Date().toLocaleDateString("en-GB")}
      </p>

      <div className="mt-8 space-y-4 text-sm leading-relaxed text-foreground-muted">
        <p>
          <strong>Draft placeholder.</strong> This privacy notice must be reviewed and finalised by the platform owner before launch.
        </p>
        <p>
          The platform collects the minimum data necessary to run games: name, email address, game picks, and payment information for the organiser admin fee. We do not collect or process player entry fees or prize money.
        </p>
        <p>
          Data is stored in Cloudflare services (D1, KV, Pages) in regions appropriate to the deployment. Users may request deletion of their account and personal data by contacting the platform owner.
        </p>
      </div>

      <Link
        href="/terms"
        className="mt-8 text-sm text-royal-blue hover:underline"
      >
        Terms of Service
      </Link>
    </div>
  );
}
