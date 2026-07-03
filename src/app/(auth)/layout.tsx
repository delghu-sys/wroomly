/**
 * Auth route group shell. These pages render their own full-screen split, but
 * they live under the root layout (no Navbar/app <main>), so they had no main
 * landmark — screen readers reported "no main" and all content sat outside any
 * landmark. Wrap them in a <main> so the landmark structure is correct.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main id="main-content">{children}</main>
}
