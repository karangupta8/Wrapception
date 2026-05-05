import { useState } from 'react';
import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { SupportedPlatforms } from '@/components/landing/SupportedPlatforms';
import { Dashboard } from '@/components/app/Dashboard';
import { SessionHeader } from '@/components/app/SessionHeader';
import { DemoMode } from '@/components/app/DemoMode';
import { ErrorBoundary } from '@/components/app/ErrorBoundary';
import { SessionProvider } from '@/context/SessionContext';

const Index = () => {
  const [isDemoMode, setIsDemoMode] = useState(false);

  return (
    <SessionProvider>
      <div className="min-h-screen bg-background">
        {isDemoMode ? (
          <>
            <DemoMode onExit={() => setIsDemoMode(false)} />
          </>
        ) : (
          <>
            <Hero onTryDemo={() => setIsDemoMode(true)} />
            <Features />
            <SupportedPlatforms />

            {/* App Section */}
            <ErrorBoundary>
              <section id="create" className="py-20 border-t border-border/50">
                <div className="container mx-auto px-6">
                  <SessionHeader />
                  <Dashboard />
                </div>
              </section>
            </ErrorBoundary>

            {/* Footer */}
            <footer className="py-12 border-t border-border/50">
              <div className="container mx-auto px-6 text-center">
                <p className="font-display text-2xl mb-2">Wrapception</p>
                <p className="text-sm text-muted-foreground">
                  Your year, unified. All data stays in your browser.
                </p>
              </div>
            </footer>
          </>
        )}
      </div>
    </SessionProvider>
  );
};

export default Index;
