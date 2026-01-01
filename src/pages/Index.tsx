import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { SupportedPlatforms } from '@/components/landing/SupportedPlatforms';
import { Dashboard } from '@/components/app/Dashboard';
import { SessionHeader } from '@/components/app/SessionHeader';
import { SessionProvider } from '@/context/SessionContext';

const Index = () => {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-background">
        <Hero />
        <Features />
        <SupportedPlatforms />
        
        {/* App Section */}
        <section id="create" className="py-20 border-t border-border/50">
          <div className="container mx-auto px-6">
            <SessionHeader />
            <Dashboard />
          </div>
        </section>
        
        {/* Footer */}
        <footer className="py-12 border-t border-border/50">
          <div className="container mx-auto px-6 text-center">
            <p className="font-display text-2xl mb-2">Wrapception</p>
            <p className="text-sm text-muted-foreground">
              Your year, unified. All data stays in your browser.
            </p>
          </div>
        </footer>
      </div>
    </SessionProvider>
  );
};

export default Index;
