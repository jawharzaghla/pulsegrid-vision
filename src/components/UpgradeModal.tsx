import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Rocket, Shield, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createCheckoutSession } from "@/services/billing.service";
import { toast } from "sonner";
import { TIER_LIMITS } from "@/types/models";

const PRICE_PRO = import.meta.env.STRIPE_PRICE_PRO;
const PRICE_BUSINESS = import.meta.env.STRIPE_PRICE_BUSINESS;

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
}

export function UpgradeModal({ isOpen, onClose, title, description }: UpgradeModalProps) {
    const { accessToken, tier } = useAuth();

    const handleUpgrade = async (priceId: string) => {
        if (!accessToken) {
            toast.error("Veuillez vous reconnecter pour mettre à niveau.");
            return;
        }

        try {
            await createCheckoutSession(priceId, accessToken);
        } catch (err) {
            console.error(err);
            toast.error("Échec de la redirection vers Stripe.");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] bg-pg-surface border-pg-border text-white">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-center mb-2">
                        {title || "Passez au niveau supérieur"}
                    </DialogTitle>
                    <DialogDescription className="text-center text-pg-muted">
                        {description || "Débloquez plus de projets, de widgets et d'analyses IA."}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    {/* Pro Tier */}
                    <div className="p-6 rounded-xl border border-pg-primary/30 bg-pg-primary/5 flex flex-col">
                        <div className="flex items-center gap-2 mb-2 text-pg-primary">
                            <Zap className="w-5 h-5 flex-shrink-0" />
                            <h3 className="font-bold text-lg">Plan Pro</h3>
                        </div>
                        <div className="text-2xl font-bold mb-4">19$ <span className="text-sm font-normal text-pg-muted">/ mois</span></div>

                        <ul className="space-y-2 mb-6 flex-grow text-sm">
                            <li className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-pg-accent mt-0.5" />
                                <span>Jusqu'à {TIER_LIMITS.pro.projects} projets</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-pg-accent mt-0.5" />
                                <span>{TIER_LIMITS.pro.widgetsPerProject} widgets par projet</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-pg-accent mt-0.5" />
                                <span>{TIER_LIMITS.pro.aiAnalysesPerDay} analyses IA / jour</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-pg-accent mt-0.5" />
                                <span>Rafraîchissement 30s</span>
                            </li>
                        </ul>

                        <Button
                            className="w-full bg-pg-primary hover:bg-pg-primary/90"
                            onClick={() => handleUpgrade(PRICE_PRO)}
                            disabled={tier === 'pro' || tier === 'business'}
                        >
                            {tier === 'pro' ? 'Plan Actuel' : 'Passer à Pro'}
                        </Button>
                    </div>

                    {/* Business Tier */}
                    <div className="p-6 rounded-xl border border-pg-accent/30 bg-pg-accent/5 flex flex-col">
                        <div className="flex items-center gap-2 mb-2 text-pg-accent">
                            <Shield className="w-5 h-5 flex-shrink-0" />
                            <h3 className="font-bold text-lg">Plan Business</h3>
                        </div>
                        <div className="text-2xl font-bold mb-4">49$ <span className="text-sm font-normal text-pg-muted">/ mois</span></div>

                        <ul className="space-y-2 mb-6 flex-grow text-sm">
                            <li className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-pg-accent mt-0.5" />
                                <span>Projets illimités</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-pg-accent mt-0.5" />
                                <span>Widgets illimités</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-pg-accent mt-0.5" />
                                <span>Analyses IA illimitées</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-pg-accent mt-0.5" />
                                <span>Rafraîchissement 1s</span>
                            </li>
                        </ul>

                        <Button
                            className="w-full bg-pg-accent hover:bg-pg-accent/90 text-pg-bg font-bold"
                            onClick={() => handleUpgrade(PRICE_BUSINESS)}
                            disabled={tier === 'business'}
                        >
                            {tier === 'business' ? 'Plan Actuel' : 'Passer à Business'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
