import { Upload, Sparkles, Download, Lock } from 'lucide-react';

const features = [
  {
    icon: Upload,
    title: 'Upload Your Wrappeds',
    description: 'Add year-end summaries from any service — Spotify, Strava, GitHub, and more. Images, PDFs, or text.',
  },
  {
    icon: Sparkles,
    title: 'AI-Powered Insights',
    description: 'Connect your own AI provider to extract patterns and generate a unified narrative of your year.',
  },
  {
    icon: Download,
    title: 'Export & Share',
    description: 'Download your unified dashboard as a beautiful PDF or share individual insights with friends.',
  },
  {
    icon: Lock,
    title: 'Privacy First',
    description: 'All processing happens in your browser. Your data never leaves your device unless you export it.',
  },
];

export function Features() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl mb-4">How It Works</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            A simple, private way to unify your year-end reflections
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
