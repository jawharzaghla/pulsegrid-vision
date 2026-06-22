import PulseGridLogo from "../PulseGridLogo";

const Footer = () => {
  const columns = [
    { title: "Produit", links: ["Fonctionnalités", "Tarifs", "Docs", "Nouveautés"] },
    { title: "Entreprise", links: ["À propos", "Blog", "Carrières", "Contact"] },
    { title: "Légal", links: ["Confidentialité", "Conditions", "Sécurité", "RGPD"] },
  ];

  return (
    <footer className="border-t border-border/40 bg-secondary/30 py-16">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12">
          <div className="md:col-span-2">
            <PulseGridLogo />
            <p className="text-body text-muted-foreground mt-3 max-w-xs">
              La business intelligence qui tient sur un seul écran. Pensée pour les fondateurs, les opérationnels et les équipes qui pilotent par la donnée.
            </p>
          </div>
          {columns.map((col, i) => (
            <div key={i}>
              <h4 className="text-micro mb-4">{col.title.toUpperCase()}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link, j) => (
                  <li key={j}>
                    <a href="#" className="text-body text-muted-foreground hover:text-foreground transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-6 border-t border-border/30 text-center text-micro text-muted-foreground">
          © 2026 PulseGrid. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
