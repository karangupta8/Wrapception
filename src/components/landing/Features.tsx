import { Upload, Sparkles, LayoutDashboard, Lock } from 'lucide-react';

const features = [
  {
    icon: Upload,
    title: 'Upload the Chaos',
    description: 'Drop in any year-end recap — Spotify, Strava, GitHub, and yes, that LinkedIn one. Images, PDFs, or pasted text. We take it all without judgment.',
  },
  {
    icon: Sparkles,
    title: 'AI Does the Reading',
    description: 'Use your own AI provider key. It processes each wrap separately, extracts actual numbers, and doesn\'t hallucinate your top artist.',
  },
  {
    icon: LayoutDashboard,
    title: 'One Dashboard',
    description: 'Your music taste, fitness, reading, and work habits — synthesised into a single, honest narrative. Cross-domain patterns you probably didn\'t notice.',
  },
  {
    icon: Lock,
    title: 'Your Data, Your Browser',
    description: 'Everything runs client-side. Your AI key is encrypted. Nothing hits our servers — because frankly, we don\'t have any.',
  },
];

export function Features() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl mb-4">
            Okay, But Why?
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Because the wraps aren't going away, so we might as well make them mean something.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-6 rounded-2xl bg-card shadow-card hover:shadow-elevated transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-display text-xl mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
