---
name: pfe-report
description: Generate academic end-of-studies project reports (Projet de Fin d'Études / PFE) in Markdown following the standard French engineering school format. Use this skill whenever the user asks to write, draft, or generate a PFE report, rapport de PFE, rapport de stage, or any structured academic project report for an engineering school. Also trigger when the user provides a project description and wants it formatted as a formal academic report with chapters, UML diagrams, architecture sections, and bibliographies.
---

# PFE Report Skill

Generates complete, standards-compliant academic end-of-studies reports (Rapport de Projet de Fin d'Études) in Markdown, following French engineering school conventions.

---

## Document Structure (mandatory order)

Every report must follow this exact sequence:

1. Cover page
2. Dédicace
3. Remerciements
4. Résumé (French) + Abstract (English)
5. Table des Matières
6. Liste des Figures
7. Liste des Tableaux
8. Liste des Abréviations
9. Introduction Générale
10. Chapitre 1 – Contexte et Problématique
11. Chapitre 2 – Spécification des Besoins
12. Chapitre 3 – Conception de l'Architecture
13. Chapitre 4 – Réalisation et Implémentation
14. Chapitre 5 – Tests et Validation
15. Conclusion Générale et Perspectives
16. Bibliographie et Webographie
17. Annexes

---

## Markdown Formatting Rules

### Chapter headings

```
# Chapitre N
## Titre du Chapitre

### N.1 Section Title
#### N.1.1 Sub-section Title
```

### Cover page block

Use a centered block with horizontal rules:

```
---
**UNIVERSITÉ / ÉCOLE SUPÉRIEURE D'INGÉNIERIE**
Département [Nom du Département]

---

# [NOM DU PROJET]
*[Slogan ou tagline]*

**Rapport de Projet de Fin d'Études (PFE)**
[Type de plateforme / domaine]

---

**Présenté par :** [Prénom NOM]
**Filière :** [Filière]
**Encadrant(e) :** [Titre Prénom NOM]
**Année universitaire :** 20XX – 20XX
```

### Definition blocks

Use blockquotes for key concept definitions:

```
> **Définition – [Terme]**
> [Définition en 2-4 lignes.]
```

### Tables

All tables must have a caption immediately after:

```
| Col1 | Col2 | Col3 |
|------|------|------|
| ...  | ...  | ...  |

*Tab. N.X – Titre du tableau*
```

### Figures

Since this is Markdown (no actual images), use placeholder blocks:

```
> **Figure N.X – [Titre de la figure]** *(à insérer)*
```

For UML diagrams, use Mermaid:

````
```mermaid
[diagram code here]
```
*Fig. N.X – Titre du diagramme*
````

### Code extracts

Always include a caption after the block:

````
```typescript
// code here
```
*Extrait de code N.X – Description de l'extrait*
````

### Use case description tables

```
| Champ | Description |
|-------|-------------|
| **Nom** | Nom du CU |
| **Acteur principal** | ... |
| **Précondition** | ... |
| **Déclencheur** | ... |
| **Scénario nominal** | 1. Étape 1 2. Étape 2 |
| **Scénario alternatif** | ... |
| **Postcondition** | ... |

*CU-0N – Nom du cas d'utilisation*
```

---

## Content Standards Per Chapter

### Introduction Générale
- Contexte général (macro trends motivating the project)
- Motivation du projet (concrete pain point the author experienced)
- Objectifs du projet (numbered list, 5-7 items)
- Structure du rapport (one bullet per chapter explaining its content)

### Chapitre 1 – Contexte et Problématique
- **1.1** Présentation du cadre (who uses it, what market)
- **1.2** Analyse de la problématique (cost of current problem, sub-sections per angle)
  - Include a problem/impact table
- **1.3** Solution proposée (architecture approach, key differentiators as bullet list)
- **1.4** Étude de l'existant et benchmark (comparison table of existing solutions vs proposed)
- **1.5** Positionnement (why the solution fills the gap; name etymology if applicable)

### Chapitre 2 – Spécification des Besoins
- **2.1** Identification des acteurs (table: Acteur / Type / Description / Rôle principal)
- **2.2** Besoins fonctionnels (grouped by module, bullet list per module)
- **2.3** Besoins non fonctionnels (table: Catégorie / Exigence / Critère de satisfaction)
- **2.4** Diagramme des cas d'utilisation global (Mermaid or figure placeholder)
- **2.5** Description des cas d'utilisation principaux (3-5 CU tables, CU-01 format)

### Chapitre 3 – Conception de l'Architecture
- **3.1** Architecture générale (2 sub-levels minimum, figure placeholder)
  - Include "Principe architectural clé" blockquote
- **3.2** Choix technologiques (table: Couche / Technologie / Justification)
- **3.3** Architecture frontend/backend (folder tree as code block + dependency flow bullets)
- **3.4** Modèle de données (TypeScript/language interfaces or class diagram, entity table)
- **3.5** Architecture de sécurité (numbered steps for crypto/auth flow, XSS protection)
- **3.6** Flux de données (two flows: data flow and AI/main flow, each with numbered pipeline steps)

### Chapitre 4 – Réalisation et Implémentation
- **4.1** Environnement de développement (tools/versions table)
- One section per major module (Auth, core services, main feature, AI if any, UI)
- Each module section: description paragraph + annotated code extract + caption
- **Last section** Interfaces utilisateur réalisées (one sub-section per screen, figure placeholder each)

### Chapitre 5 – Tests et Validation
- **5.1** Stratégie de tests (table: Niveau / Outil / Scope / Couverture cible)
- **5.2** Tests unitaires (code extract of a test suite for the most critical service)
- **5.3** Tests d'intégration (describe the integration test scenario in prose + code extract)
- **5.4** Tests end-to-end (table: ID / Scénario / Étapes clés / Résultat attendu)
- **5.5** Tests de sécurité (table: Vecteur d'attaque / Test effectué / Résultat)
- **5.6** Résultats et bilan qualité (table: Métrique / Cible / Résultat obtenu / Statut with checkmarks)

### Conclusion Générale et Perspectives
- **Bilan du projet**: 2-3 paragraphs
- Bullet list of main technical contributions
- **Perspectives d'évolution** in 3 time horizons:
  - Court terme (v1.1 – 3 mois)
  - Moyen terme (v2.0 – 6 mois)
  - Long terme (v3.0 – 12+ mois)
- Closing statement paragraph

### Bibliographie et Webographie

Three subsections:
1. **Ouvrages et publications** (classic referenced books)
2. **Documentation technique officielle** (official docs with URLs)
3. **Articles et ressources en ligne** (RFCs, NIST, blog posts)

Format:
```
[N] AUTEUR, Prénom. *Titre*. Éditeur, Année.
[N] Organisation. Titre. URL (consulté YYYY)
```

Minimum 10 references relevant to the actual tech stack.

### Annexes
- Annexe A: Full data models / interfaces (complete TypeScript or relevant language)
- Annexe B: Subscription tier or configuration comparison table
- Annexe C: Development roadmap (Phase / Durée / Livrables principaux)

---

## Liste des Figures and Tableaux

Generate as tables immediately after Table of Contents:

```
## Liste des Figures

| N° | Intitulé de la Figure | Page |
|----|----------------------|------|
| Fig. 1.1 | ... | X |

## Liste des Tableaux

| N° | Intitulé du Tableau | Page |
|----|---------------------|------|
| Tab. 1.1 | ... | X |

## Liste des Abréviations

| Abréviation | Signification |
|-------------|---------------|
| API | Application Programming Interface |
```

Sort abbreviations alphabetically. Include all acronyms used in the report.

---

## Writing Style Guidelines

- Formal academic French throughout
- Keep English technical terms as-is (Angular, JWT, REST, AES-GCM, etc.) — do not translate
- Avoid first-person singular; prefer "le système", "la plateforme", "l'utilisateur"
- Every table and figure must be referenced in the body text before it appears
- Each chapter opens with a 2-4 sentence introductory paragraph before the first section
- Bullet points for feature lists; numbered steps for sequential flows
- Metrics must be specific numbers, never vague ("fast" → "< 1.4 s", "high coverage" → "87.3 %")
- Definition blockquotes appear at the first introduction of any key concept

---

## Generation Workflow

When asked to generate a PFE report:

1. **Gather inputs** — collect: project name, tagline, tech stack, key features, problem being solved, target users, supervisor name, student name, university/school name, academic year. If any info is missing, use `[placeholder]` brackets.

2. **Generate in sections** — for long reports, generate chapter by chapter. Start with front matter (cover → abstract → TOC), then chapters in order.

3. **Populate all tables** with realistic content derived from the project description.

4. **Include at least 3 code extracts** in Chapter 4, properly captioned.

5. **Mermaid diagrams** for: use case diagram (Ch2), architecture or sequence diagrams (Ch3/Ch4). Use `classDiagram`, `sequenceDiagram`, `graph TD` as appropriate.

6. **Bilan qualité table in Ch5** must use specific target and result numbers, not placeholders.

7. **Bibliography** must reference actual libraries, standards, and books relevant to the tech stack.