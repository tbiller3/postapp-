export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#020817] text-foreground p-6 md:p-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="space-y-2">
          <p className="font-mono text-xs text-muted-foreground tracking-wider uppercase">&gt;_ POSTAPP</p>
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm">Last updated: April 2026</p>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">Overview</h2>
            <p>
              POSTAPP ("the app") is an App Store submission management tool built for developers.
              We are committed to protecting your privacy. This policy explains what data we handle
              and how we use it.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">Data We Collect</h2>
            <p>
              POSTAPP collects only the minimum data needed to operate:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong className="text-foreground">Authentication data</strong> — Your Replit account identity is used to verify access. We do not store passwords.</li>
              <li><strong className="text-foreground">Session data</strong> — A session cookie is stored on your device to keep you logged in. Sessions expire automatically.</li>
              <li><strong className="text-foreground">App submission data</strong> — Metadata you enter (app names, descriptions, checklists, review notes) is stored in your private database and is only accessible to you.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">Data We Do Not Collect</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>We do not collect analytics or usage tracking data</li>
              <li>We do not collect advertising identifiers</li>
              <li>We do not share any data with third parties</li>
              <li>We do not collect health, financial, or location data</li>
              <li>We do not run ads of any kind</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">Data Storage</h2>
            <p>
              All submission data is stored in a private PostgreSQL database provisioned through Replit.
              Data is associated with your authenticated account and is not accessible to other users.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">Third-Party Services</h2>
            <p>
              POSTAPP uses Replit's authentication system (OpenID Connect) to verify user identity.
              Replit's own privacy policy governs their handling of account data:
              <a href="https://replit.com/site/privacy" className="text-violet-400 hover:text-violet-300 ml-1 underline underline-offset-2" target="_blank" rel="noreferrer">
                replit.com/site/privacy
              </a>
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">Data Deletion</h2>
            <p>
              To delete your data, contact the developer. All stored submission records, checklists,
              and metadata associated with your account will be permanently deleted upon request.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">Contact</h2>
            <p>
              Developer: Timothy Biller<br />
              App: POSTAPP — App Store Submission Manager
            </p>
          </section>
        </div>

        <div className="pt-6 border-t border-border/30">
          <p className="text-xs font-mono text-muted-foreground/40">
            © {new Date().getFullYear()} Timothy Biller · POSTAPP · All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
