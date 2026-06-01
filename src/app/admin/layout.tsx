import { AppChrome } from "@/components/app-chrome";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppChrome activeNav="Admin" />
      {children}
    </>
  );
}
