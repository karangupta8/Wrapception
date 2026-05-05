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

  const handleExitDemo = () => {
    setIsDemoMode(false);
    // Session reset happens inside DemoMode's onExit callback
  };

  return (
    <SessionProvider>
      {/* Use a key to force remount and reset session when exiting demo */}
      {isDemoMode ? (
        <DemoMode key="demo" onExit={handleExitDemo} />
      ) : (
        <MainContent key="main" onEnterDemo={() => setIsDemoMode(true)} />
      )}
    </SessionProvider>
  );
};

const MainContent = ({ onEnterDemo }: { onEnterDemo: () => void }) => {
  return (
    <div className="min-h-screen bg-background">
      <Hero onTryDemo={onEnterDemo} />
      <Features />
      <SupportedPlatforms />

      {/* App Section */}
      <ErrorBoundary>
        <section id="create" className="py-20 border-t border-border/50">
          <div className="container mx-auto px-6 max-w-5xl">
            <div className="mb-10 text-center">
              <h2 className="font-display text-3xl md:text-4xl mb-2">
                Make Your Wrapception
              </h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Drop in the wraps. Watch AI reconcile them into one narrative.
              </p>
            </div>
            <SessionHeader />
            <Dashboard />
          </div>
        </section>
      </ErrorBoundary>

      {/* Footer */}
      <footer className="py-12 border-t border-border/50">
        <div className="container mx-auto px-6 text-center space-y-3">
          <p className="font-display text-2xl">Wrapception</p>
          <p className="text-sm text-muted-foreground">
            An allegory on wrap culture. And maybe vibe coding too.
          </p>
          <p className="text-xs text-muted-foreground/40">
            No server. No analytics. No wrap about your wraps sent to us. Just yours.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
