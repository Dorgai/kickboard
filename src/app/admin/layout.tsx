import { AppChrome } from "@/components/app-chrome";
import { SiteFooter } from "@/components/site-footer";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppChrome activeNav="Admin" />
      {children}
      <SiteFooter />
    </>
  );
}
