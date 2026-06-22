import { Globe, Brain, GripVertical, ShieldCheck, FolderOpen, RefreshCw } from "lucide-react";

const features = [
  { icon: Globe, title: "N'importe quelle API REST", desc: "JSON, GraphQL ou webhooks : connectez le point d'accès que vous voulez. On s'occupe du reste." },
  { icon: Brain, title: "Analyse par IA", desc: "Les modèles Groq et Llama génèrent des analyses, des résumés et des alertes d'anomalie." },
  { icon: GripVertical, title: "Tableau de bord en glisser-déposer", desc: "Composez votre vue en faisant glisser des widgets sur une grille libre." },
  { icon: ShieldCheck, title: "Identifiants chiffrés", desc: "Vos clés API et vos jetons sont chiffrés au repos en AES-256." },
  { icon: FolderOpen, title: "Multi-projets", desc: "Pilotez plusieurs activités, clients ou produits depuis un seul compte." },
  { icon: RefreshCw, title: "Actualisation en temps réel", desc: "Choisissez la fréquence d'actualisation de chaque widget. Vos chiffres restent toujours à jour." },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 relative">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-micro text-accent mb-3">FONCTIONNALITÉS</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Tout ce qu'il faut pour avoir une vue d'ensemble</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            De quoi connecter, visualiser et comprendre les données de votre activité, sans rien de superflu.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((f, i) => (
            <div
              key={i}
              className="glass rounded-xl p-6 card-shadow transition-all duration-200 hover:border-primary/40 group"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                <f.icon size={20} className="text-accent" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-body text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
