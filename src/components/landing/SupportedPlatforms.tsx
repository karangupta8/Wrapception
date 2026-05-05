import { Music, Heart, BookOpen, Film, Code, Zap, Briefcase, CreditCard } from 'lucide-react';

const categories = [
  { icon: Music, label: 'Music', examples: 'Spotify, Apple Music, YouTube Music' },
  { icon: Heart, label: 'Fitness', examples: 'Strava, Garmin, Peloton' },
  { icon: BookOpen, label: 'Reading', examples: 'Goodreads, Audible, Kindle' },
  { icon: Film, label: 'Watch', examples: 'Letterboxd, Netflix, Trakt' },
  { icon: Code, label: 'Work & Dev', examples: 'GitHub, ChatGPT, Cursor' },
  { icon: Briefcase, label: 'LinkedIn', examples: '...yes, they made a Wrapped' },
  { icon: CreditCard, label: 'Finance', examples: 'PayTm, Monzo, Splitwise' },
  { icon: Zap, label: 'Anything Else', examples: 'If it has a year-end recap, upload it' },
];

export function SupportedPlatforms() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl mb-4">
            Things That Have Wraps Now
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            You didn't ask for most of them. Bring them here anyway.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 max-w-6xl mx-auto mb-10">
          {categories.map((category) => (
            <div
              key={category.label}
              className="group p-4 rounded-2xl border border-border/50 hover:border-primary/20 hover:bg-secondary/50 transition-all duration-300 text-center"
            >
              <category.icon className="w-7 h-7 mx-auto mb-3 text-muted-foreground group-hover:text-primary transition-colors" />
              <h3 className="font-medium text-sm mb-1">{category.label}</h3>
              <p className="text-xs text-muted-foreground leading-snug">{category.examples}</p>
            </div>
          ))}
        </div>

        {/* Meta note */}
        <div className="max-w-xl mx-auto text-center">
          <p className="text-sm text-muted-foreground/60 italic">
            Wrapception works with any platform that exports a year-end summary —
            whether as a screenshot, PDF, or text. No API integrations. No OAuth dance.
            Just the file they gave you.
          </p>
        </div>
      </div>
    </section>
  );
}
