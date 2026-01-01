import { SessionProvider } from '@/context/SessionContext';
import { SessionHeader } from '@/components/app/SessionHeader';
import { Dashboard } from '@/components/app/Dashboard';

const AppPage = () => {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-background">
        <SessionHeader />
        <main className="container mx-auto px-6 py-8">
          <Dashboard />
        </main>
      </div>
    </SessionProvider>
  );
};

export default AppPage;
