import { Music, Heart, BookOpen, Film, Code, Zap } from 'lucide-react';

const categories = [
  { icon: Music, label: 'Music', examples: 'Spotify, Apple Music, YouTube Music' },
  { icon: Heart, label: 'Fitness', examples: 'Strava, Garmin, Peloton' },
  { icon: BookOpen, label: 'Reading', examples: 'Goodreads, Audible, Kindle' },
  { icon: Film, label: 'Movies', examples: 'Letterboxd, Trakt, Plex' },
  { icon: Code, label: 'Work', examples: 'GitHub, ChatGPT, Cursor' },
  { icon: Zap, label: 'Productivity', examples: 'Notion, Todoist, Obsidian' },
];

export function SupportedPlatforms() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl mb-4">
            One Dashboard for Everything
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Combine insights from all the services that defined your year
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl mx-auto">
          {categories.map((category, index) => (
            <div 
              key={category.label}
              className="group p-4 rounded-2xl border border-border/50 hover:border-primary/20 hover:bg-secondary/50 transition-all duration-300 text-center"
            >
              <category.icon className="w-8 h-8 mx-auto mb-3 text-muted-foreground group-hover:text-primary transition-colors" />
              <h3 className="font-medium mb-1">{category.label}</h3>
              <p className="text-xs text-muted-foreground">{category.examples}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
