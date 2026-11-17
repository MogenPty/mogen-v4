export default function RedirectManagerLoading() {
  return <div className="min-h-screen bg-background px-6 py-10"><div className="mx-auto max-w-7xl animate-pulse space-y-5" aria-label="Loading redirects"><div className="h-12 w-72 rounded bg-muted" /><div className="grid gap-4 sm:grid-cols-3">{[1, 2, 3].map(item => <div key={item} className="h-28 rounded-xl bg-muted" />)}</div><div className="h-80 rounded-xl bg-muted" /></div></div>;
}
