import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { updateUserName, changePassword } from "@/services/auth.service";
import { Loader2 } from "lucide-react";
import { UpgradeModal } from "@/components/UpgradeModal";

const AccountSettings = () => {
  const { firebaseUser, profile, tier } = useAuth();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

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
      setProfileMessage("Profile updated.");
    } catch (err) {
      setProfileMessage("Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordMessage("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage("Password must be at least 6 characters.");
      return;
    }
    setSavingPassword(true);
    setPasswordMessage("");
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMessage("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordMessage("Failed. Check your current password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const userTier = tier || "free";

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-8">Account Settings</h1>

      <div className="space-y-8">
        {/* Profile Section */}
        <section className="glass rounded-xl p-6 card-shadow space-y-4">
          <h2 className="font-semibold mb-2">Profile</h2>
          <div>
            <label className="text-micro block mb-2">FULL NAME</label>
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
            <p className="text-xs text-muted-foreground mt-1">Email cannot be changed.</p>
          </div>
          {profileMessage && (
            <p className={`text-sm ${profileMessage.includes("updated") ? "text-success" : "text-destructive"}`}>
              {profileMessage}
            </p>
          )}
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {savingProfile && <Loader2 size={14} className="animate-spin" />}
            {savingProfile ? "Saving..." : "Save Profile"}
          </button>
        </section>

        {/* Password Section */}
        <section className="glass rounded-xl p-6 card-shadow space-y-4">
          <h2 className="font-semibold mb-2">Change Password</h2>
          <div>
            <label className="text-micro block mb-2">CURRENT PASSWORD</label>
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
              <label className="text-micro block mb-2">NEW PASSWORD</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-lg text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="text-micro block mb-2">CONFIRM NEW</label>
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
            <p className={`text-sm ${passwordMessage.includes("changed") ? "text-success" : "text-destructive"}`}>
              {passwordMessage}
            </p>
          )}
          <button
            onClick={handleChangePassword}
            disabled={savingPassword || !currentPassword || !newPassword}
            className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {savingPassword && <Loader2 size={14} className="animate-spin" />}
            {savingPassword ? "Changing..." : "Change Password"}
          </button>
        </section>

        {/* Plan Section */}
        <section className="glass rounded-xl p-6 card-shadow space-y-4">
          <h2 className="font-semibold mb-2">Plan</h2>
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${userTier === "free" ? "bg-muted text-muted-foreground" :
              userTier === "pro" ? "bg-primary/20 text-primary" :
                "bg-accent/20 text-accent"
              }`}>
              {userTier}
            </div>
            <span className="text-sm text-muted-foreground">
              {userTier === "free" ? "2 projects, 5 widgets each" :
                userTier === "pro" ? "10 projects, 25 widgets each" :
                  "Unlimited projects & widgets"}
            </span>
          </div>

          {userTier === "free" && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm font-medium mb-1">Upgrade to Pro</p>
              <p className="text-xs text-muted-foreground mb-3">Unlock more projects, AI analyses, and faster refresh rates.</p>
              <button
                onClick={() => setIsUpgradeModalOpen(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-all"
              >
                Upgrade My Plan
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
