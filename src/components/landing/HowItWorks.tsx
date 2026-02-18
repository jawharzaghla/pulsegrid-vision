const steps = [
  { num: 1, title: "Create a Project", desc: "Name it, pick a color, choose an emoji. Done in seconds." },
  { num: 2, title: "Add a Widget", desc: "Paste your API endpoint, map the JSON, pick a chart type." },
  { num: 3, title: "Get Insights", desc: "AI analyzes your data and delivers briefs, anomalies, and trends." },
];

const HowItWorks = () => {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-micro text-accent mb-3">HOW IT WORKS</p>
          <h2 className="text-3xl md:text-4xl font-bold">Three steps to clarity</h2>
        </div>

        <div className="flex flex-col md:flex-row items-start justify-center gap-8 max-w-4xl mx-auto">
          {steps.map((step, i) => (
            <div key={i} className="flex-1 flex flex-col items-center text-center relative">
              <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center text-xl font-bold text-primary-foreground mb-4 relative z-10">
                {step.num}
              </div>
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-7 left-[calc(50%+28px)] w-[calc(100%-56px)] border-t-2 border-dashed border-border" />
              )}
              <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-body text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
