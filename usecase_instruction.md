# Use Case Diagram Connection Instructions

This document lists the connections that need to be manually drawn between actors and use cases for the PulseGrid system.

## Actor Relationships (Inheritance)
- **Utilisateur Gratuit** (UserFree) $\rightarrow$ **Utilisateur Authentifié** (Auth)
- **Utilisateur Pro** (UserPro) $\rightarrow$ **Utilisateur Authentifié** (Auth)
- **Utilisateur Business** (UserBiz) $\rightarrow$ **Utilisateur Authentifié** (Auth)

## Actor to Use Case Associations
- **Administrateur** (Admin) $\rightarrow$ Voir le Tableau de Bord Admin (UC_AdminDash)
- **Utilisateur Authentifié** (Auth) $\rightarrow$ Gérer les Projets (UC_GestionProjet)
- **Utilisateur Authentifié** (Auth) $\rightarrow$ Gérer le Compte (UC_GestionCompte)
- **Utilisateur Authentifié** (Auth) $\rightarrow$ Voir la Liste des Projets (UC_ListProjects)
- **Utilisateur Authentifié** (Auth) $\rightarrow$ Créer un Nouveau Projet (UC_CreateProject)
- **Utilisateur Authentifié** (Auth) $\rightarrow$ Modifier les Paramètres du Projet (UC_EditProject)
- **Utilisateur Authentifié** (Auth) $\rightarrow$ Lancer une Analyse IA (UC_AI)
- **Utilisateur Authentifié** (Auth) $\rightarrow$ Ajouter un Widget au Projet (UC_AddWidget)
- **Utilisateur Authentifié** (Auth) $\rightarrow$ Supprimer une demande (UC_DeleteRequest)
- **Utilisateur Non Authentifié** (Guest) $\rightarrow$ S'authentifier (UC_Login)
- **Manutentionnaire** (Manut) $\rightarrow$ Gérer les demandes d'Intervention (UC_Intervention)

## Use Case Dependencies (Inclusions & Extensions)

### Includes (Solid arrow with <<include>>)
- **Gérer le Compte** (UC_GestionCompte) $\rightarrow$ Voir les Paramètres du Compte (UC_ViewAccount)
- **Gérer le Compte** (UC_GestionCompte) $\rightarrow$ Gérer équipements (UC_ManageAssets)
- **Gérer les demandes d'Intervention** (UC_Intervention) $\rightarrow$ Ajouter une demande (UC_AddRequest)
- **Gérer les demandes d'Intervention** (UC_Intervention) $\rightarrow$ Modifier une demande (UC_EditRequest)
- **Ajouter un Widget au Projet** (UC_AddWidget) $\rightarrow$ Configurer le Widget (UC_ConfigWidget)
- **Configurer le Widget** (UC_ConfigWidget) $\rightarrow$ Actualiser les Données du Widget (UC_UpdateWidget)

### Extensions (Dashed arrow with <<extend>>)
- **Mettre à Niveau l'Abonnement** (UC_Upgrade) $\rightarrow$ Lancer une Analyse IA (UC_AI)
- **Mettre à Niveau l'Abonnement** (UC_Upgrade) $\rightarrow$ Créer un Nouveau Projet (UC_CreateProject)
