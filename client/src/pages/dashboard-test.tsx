import { MainLayout } from "@/components/layout/main-layout";

export default function DashboardTest() {
  return (
    <MainLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold">Dashboard Test - Working!</h1>
        <p>This is a simple test dashboard to verify routing works.</p>
      </div>
    </MainLayout>
  );
}