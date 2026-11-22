import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
    <SiteHeader />
    <main id="main" className="mx-auto w-full max-w-lg flex-1 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-gray-900">Page not found</h1>
      <p className="mt-2 text-gray-600">The page you’re looking for doesn’t exist.</p>
      <Link href="/" className="mt-6 inline-block rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white">
        Back to my CVs
      </Link>
    </main>
    <SiteFooter />
    </div>
  );
}
