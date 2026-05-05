import { ArrowDown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroProps {
  onTryDemo?: () => void;
}

export function Hero({ onTryDemo }: HeroProps) {
  const scrollToCreate = () => {
    document.getElementById('create')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full bg-accent/15 blur-3xl animate-float" style={{ animationDelay: '-2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 py-24 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 animate-fade-up">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-muted-foreground">
              Your year, unified
            </span>
          </div>

          {/* Main heading */}
          <h1 
            className="font-display text-6xl md:text-8xl lg:text-9xl tracking-tight animate-fade-up"
            style={{ animationDelay: '0.1s' }}
          >
            Wrapception
          </h1>

          {/* Tagline */}
          <p 
            className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-up"
            style={{ animationDelay: '0.2s' }}
          >
            All your Wrappeds. One Meta-Wrapped.
          </p>

          {/* Description */}
          <p 
            className="text-base md:text-lg text-muted-foreground/80 max-w-xl mx-auto animate-fade-up"
            style={{ animationDelay: '0.3s' }}
          >
            Upload your year-end summaries from Spotify, Strava, GitHub, and more. 
            Get a unified dashboard and AI-powered narrative of your entire year.
          </p>

          {/* CTAs */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-fade-up"
            style={{ animationDelay: '0.4s' }}
          >
            <Button
              size="lg"
              className="group px-8 py-6 text-lg rounded-full gradient-hero border-0 shadow-elevated hover:shadow-soft transition-all duration-300"
              onClick={scrollToCreate}
            >
              Create My Wrapception
              <ArrowDown className="ml-2 w-5 h-5 group-hover:translate-y-1 transition-transform" />
            </Button>
            {onTryDemo && (
              <Button
                size="lg"
                variant="outline"
                className="px-8 py-6 text-lg rounded-full"
                onClick={onTryDemo}
              >
                <Sparkles className="mr-2 w-5 h-5" />
                Try Demo
              </Button>
            )}
          </div>

          {/* Privacy note */}
          <p 
            className="text-sm text-muted-foreground/60 animate-fade-up"
            style={{ animationDelay: '0.5s' }}
          >
            🔒 All data stays in your browser. Nothing is stored on our servers.
          </p>
        </div>

        {/* Scroll indicator */}
        <button 
          onClick={scrollToCreate}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce cursor-pointer"
        >
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
            <div className="w-1 h-2 rounded-full bg-muted-foreground/50" />
          </div>
        </button>
      </div>
    </section>
  );
}
