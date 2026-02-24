import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { updateUserName, changePassword } from "@/services/auth.service";
import { createPortalSession } from "@/services/billing.service";
import { Loader2, ExternalLink } from "lucide-react";
import { UpgradeModal } from "@/components/UpgradeModal";
import { toast } from "sonner";

const AccountSettings = () => {
  const { firebaseUser, profile, accessToken, tier } = useAuth();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);

  // Profile
  const [name, setName] = useState(profile?.name || firebaseUser?.displayName || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileMessage("");
    try {
      await updateUserName(name);
      setProfileMessage("Profile mis à jour.");
    } catch (err) {
      setProfileMessage("Échec de la mise à jour.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordMessage("Les mots de passe ne correspondent pas.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }
    setSavingPassword(true);
    setPasswordMessage("");
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMessage("Mot de passe modifié.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordMessage("Échec. Vérifiez votre mot de passe actuel.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleManageBilling = async () => {
    if (!accessToken) return;
    setLoadingPortal(true);
    try {
      await createPortalSession(accessToken);
    } catch (err) {
      toast.error("Échec de l'accès au portail de facturation.");
    } finally {
      setLoadingPortal(false);
    }
  };

  const userTier = tier || "free";

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-8">Paramètres du compte</h1>

      <div className="space-y-8">
        {/* Profile Section */}
        <section className="glass rounded-xl p-6 card-shadow space-y-4">
          <h2 className="font-semibold mb-2">Profil</h2>
          <div>
            <label className="text-micro block mb-2">NOM COMPLET</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          <div>
            <label className="text-micro block mb-2">EMAIL</label>
            <input
              value={firebaseUser?.email || ""}
              disabled
              className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-lg text-body text-muted-foreground cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-1">L'email ne peut pas être modifié.</p>
          </div>
          {profileMessage && (
            <p className={`text-sm ${profileMessage.includes("mis à jour") ? "text-success" : "text-destructive"}`}>
              {profileMessage}
            </p>
          )}
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {savingProfile && <Loader2 size={14} className="animate-spin" />}
            {savingProfile ? "Enregistrement..." : "Enregistrer le profil"}
          </button>
        </section>

        {/* Password Section */}
        <section className="glass rounded-xl p-6 card-shadow space-y-4">
          <h2 className="font-semibold mb-2">Changer le mot de passe</h2>
          <div>
            <label className="text-micro block mb-2">MOT DE PASSE ACTUEL</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-micro block mb-2">NOUVEAU MOT DE PASSE</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="text-micro block mb-2">CONFIRMER LE NOUVEAU</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          </div>
          {passwordMessage && (
            <p className={`text-sm ${passwordMessage.includes("modifié") ? "text-success" : "text-destructive"}`}>
              {passwordMessage}
            </p>
          )}
          <button
            onClick={handleChangePassword}
            disabled={savingPassword || !currentPassword || !newPassword}
            className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {savingPassword && <Loader2 size={14} className="animate-spin" />}
            {savingPassword ? "Modification..." : "Changer le mot de passe"}
          </button>
        </section>

        {/* Billing Section */}
        <section className="glass rounded-xl p-6 card-shadow space-y-4">
          <h2 className="font-semibold mb-2">Facturation & Plan</h2>
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${userTier === "free" ? "bg-muted text-muted-foreground" :
              userTier === "pro" ? "bg-primary/20 text-primary" :
                "bg-accent/20 text-accent"
              }`}>
              {userTier === "free" ? "Gratuit" : userTier}
            </div>
            <span className="text-sm text-muted-foreground">
              {userTier === "free" ? "2 projets, 5 widgets chacun" :
                userTier === "pro" ? "10 projets, 25 widgets chacun" :
                  "Projets & widgets illimités"}
            </span>
          </div>

          {userTier === "free" ? (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm font-medium mb-1">Passer à Pro</p>
              <p className="text-xs text-muted-foreground mb-3">Débloquez plus de projets, analyses IA et fréquences de rafraîchissement plus rapides.</p>
              <button
                onClick={() => setIsUpgradeModalOpen(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-all"
              >
                Mettre à niveau mon plan
              </button>
            </div>
          ) : (
            <div className="p-4 bg-muted/30 border border-border rounded-lg">
              <p className="text-sm font-medium mb-1">Gérer l'abonnement</p>
              <p className="text-xs text-muted-foreground mb-3">Modifiez votre mode de paiement ou annulez votre abonnement via Stripe.</p>
              <button
                onClick={handleManageBilling}
                disabled={loadingPortal}
                className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-sm font-medium transition-all flex items-center gap-2"
              >
                {loadingPortal ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                Gérer mon abonnement
              </button>
            </div>
          )}
        </section>
      </div>

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
    </div>
  );
};

export default AccountSettings;
