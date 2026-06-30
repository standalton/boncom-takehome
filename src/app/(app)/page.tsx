/**
 * (app)/page.tsx — dashboard (placeholder).
 *
 * What:        The authenticated landing page. Replaced by the real estimate
 *              list + search in a later task; for now confirms the shell works.
 * Where used:  The "/" route inside the authenticated shell.
 */
export default function DashboardPage() {
  return (
    <div className="px-8 py-6">
      <h1 className="text-xl font-semibold text-primary">Dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your estimates will appear here.
      </p>
    </div>
  );
}
