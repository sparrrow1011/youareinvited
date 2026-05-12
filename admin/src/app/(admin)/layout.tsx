import Sidebar from '@/components/Sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="min-h-screen px-4 py-6 pt-24 sm:px-6 md:ml-60 md:p-8">
        {children}
      </main>
    </div>
  );
}
