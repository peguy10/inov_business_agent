<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Guide de configuration Azure — INOV Business Agent</title>
    <style>
        body { font-family: "DejaVu Sans", sans-serif; color: #0F172A; font-size: 11px; line-height: 1.5; }

        .cover { text-align: center; padding-top: 140px; }
        .cover .badge {
            display: inline-block; background-color: #2563EB; color: #ffffff;
            padding: 6px 16px; border-radius: 999px; font-size: 11px; letter-spacing: 1px;
            text-transform: uppercase; margin-bottom: 24px;
        }
        .cover h1 { font-size: 28px; margin: 0 0 8px 0; color: #0F172A; }
        .cover p.subtitle { font-size: 13px; color: #64748b; margin: 0 0 60px 0; }
        .cover .footer-note { font-size: 10px; color: #94a3b8; position: absolute; bottom: 40px; left: 0; right: 0; text-align: center; }

        h1.section { font-size: 18px; color: #0F172A; border-bottom: 2px solid #2563EB; padding-bottom: 6px; margin: 0 0 14px 0; page-break-before: always; }
        h2 { font-size: 13px; color: #2563EB; margin: 18px 0 6px 0; }
        h3 { font-size: 11.5px; color: #0F172A; margin: 12px 0 4px 0; }
        p { margin: 4px 0; }
        ul, ol { margin: 4px 0 8px 18px; padding: 0; }
        li { margin-bottom: 3px; }

        .callout {
            background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px;
            padding: 10px 12px; margin: 10px 0; color: #0c4a6e;
        }
        .callout.warning { background-color: #fff7ed; border-color: #fed7aa; color: #9a3412; }
        .callout.security { background-color: #f0fdf4; border-color: #bbf7d0; color: #14532d; }

        table.fields { width: 100%; border-collapse: collapse; margin: 8px 0 14px 0; }
        table.fields th, table.fields td { border: 1px solid #e2e8f0; padding: 6px 8px; font-size: 10px; text-align: left; vertical-align: top; }
        table.fields th { background-color: #f1f5f9; color: #0F172A; }
        table.fields td.field { font-weight: bold; white-space: nowrap; }
        code, .code { font-family: "DejaVu Sans Mono", monospace; background-color: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-size: 10px; }

        .toc { margin-top: 20px; }
        .toc table { width: 100%; }
        .toc td { padding: 4px 0; font-size: 12px; }
        .toc td.num { width: 30px; color: #2563EB; font-weight: bold; }

        .footer { font-size: 9px; color: #94a3b8; text-align: center; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 6px; }
    </style>
</head>
<body>

{{-- Cover page --}}
<div class="cover">
    <span class="badge">INOV Business Agent</span>
    <h1>Guide de configuration des services Azure</h1>
    <p class="subtitle">
        Connecter Azure OpenAI, Azure AI Search et Azure Blob Storage<br>
        depuis les Paramètres du tableau de bord
    </p>

    <div class="toc">
        <table>
            <tr><td class="num">1.</td><td>Introduction et architecture pluggable</td></tr>
            <tr><td class="num">2.</td><td>Configuration globale vs. configuration par entreprise</td></tr>
            <tr><td class="num">3.</td><td>Accéder aux paramètres Azure dans le tableau de bord</td></tr>
            <tr><td class="num">4.</td><td>Azure OpenAI — étape par étape</td></tr>
            <tr><td class="num">5.</td><td>Azure AI Search — étape par étape</td></tr>
            <tr><td class="num">6.</td><td>Azure Blob Storage — étape par étape</td></tr>
            <tr><td class="num">7.</td><td>Tester la connexion</td></tr>
            <tr><td class="num">8.</td><td>Sécurité et confidentialité des clés</td></tr>
            <tr><td class="num">9.</td><td>Configuration globale via le fichier .env</td></tr>
            <tr><td class="num">10.</td><td>Dépannage (FAQ)</td></tr>
        </table>
    </div>

    <div class="footer-note">INOV Business Agent — Votre Directeur des Opérations IA</div>
</div>

{{-- 1. Introduction --}}
<h1 class="section">1. Introduction et architecture pluggable</h1>

<p>
    INOV Business Agent fonctionne dès l'installation, <strong>sans aucune configuration Azure</strong> :
    la recherche de documents utilise une recherche SQL locale, l'assistant IA répond à partir de modèles
    de réponse basés sur vos données, et les prévisions de trésorerie utilisent une moyenne pondérée
    calculée localement.
</p>

<p>
    En connectant vos propres ressources Azure, vous activez des fonctionnalités plus avancées :
</p>

<table class="fields">
    <tr>
        <th style="width: 25%;">Service Azure</th>
        <th>Ce qu'il apporte à INOV</th>
    </tr>
    <tr>
        <td class="field">Azure OpenAI</td>
        <td>
            Réponses de l'assistant IA (page « AI Chat ») rédigées en langage naturel, résumés et
            recommandations dans les rapports intelligents, et narration des prévisions de trésorerie.
        </td>
    </tr>
    <tr>
        <td class="field">Azure AI Search</td>
        <td>
            Recherche sémantique avancée dans vos documents, contrats et factures téléversés
            (page « Documents »), au lieu d'une simple recherche par mot-clé.
        </td>
    </tr>
    <tr>
        <td class="field">Azure Blob Storage</td>
        <td>
            Stockage de vos documents téléversés dans le cloud Azure plutôt que sur le disque local du
            serveur — utile pour la sauvegarde et la mise à l'échelle.
        </td>
    </tr>
</table>

<div class="callout">
    <strong>Architecture « pluggable » :</strong> chaque service Azure est optionnel et indépendant.
    Si un service n'est pas configuré, ou si la connexion échoue (clé invalide, service indisponible…),
    INOV bascule automatiquement et silencieusement sur son équivalent local. Votre application continue
    de fonctionner sans interruption, avec ou sans Azure.
</div>

{{-- 2. Global vs per-company --}}
<h1 class="section">2. Configuration globale vs. configuration par entreprise</h1>

<p>Il existe deux façons de connecter Azure à INOV :</p>

<h2>2.1 Configuration par entreprise (recommandée)</h2>
<ul>
    <li>Réalisée par un administrateur de l'entreprise depuis <strong>Paramètres → Azure integrations</strong>.</li>
    <li>Prend effet <strong>immédiatement</strong>, sans redémarrage du serveur.</li>
    <li>Les clés API sont <strong>chiffrées</strong> avant d'être stockées en base de données et ne sont
        <strong>jamais renvoyées en clair</strong> par l'API.</li>
    <li>Chaque entreprise peut utiliser ses propres ressources Azure (multi-tenant).</li>
</ul>

<h2>2.2 Configuration globale (fichier .env)</h2>
<ul>
    <li>Réalisée par l'administrateur système du serveur, dans le fichier <code>backend/.env</code>.</li>
    <li>S'applique à toutes les entreprises qui n'ont pas leur propre configuration.</li>
    <li>Nécessite un <strong>redémarrage du serveur backend</strong> après modification.</li>
</ul>

<div class="callout">
    <strong>Ordre de priorité :</strong> pour chaque service, si une entreprise renseigne ses propres
    identifiants, ceux-ci sont utilisés en priorité. Tout champ laissé vide retombe sur la valeur globale
    définie dans <code>.env</code> (si elle existe), puis sur le mode local en dernier recours.
</div>

{{-- 3. Accessing settings --}}
<h1 class="section">3. Accéder aux paramètres Azure dans le tableau de bord</h1>

<ol>
    <li>Connectez-vous avec un compte <strong>administrateur</strong> (rôle « admin »).</li>
    <li>Dans la barre latérale, cliquez sur <strong>Paramètres</strong> (icône d'engrenage).</li>
    <li>Faites défiler jusqu'à la carte <strong>« Azure integrations »</strong>.</li>
    <li>Vous y trouverez trois sections : <strong>Azure OpenAI</strong>, <strong>Azure AI Search</strong> et
        <strong>Azure Blob Storage</strong>, chacune avec :
        <ul>
            <li>un badge <span class="code">Connected</span> / <span class="code">Not configured</span> ;</li>
            <li>les champs de connexion propres au service ;</li>
            <li>un bouton <strong>Save</strong> pour enregistrer ;</li>
            <li>un bouton <strong>Test connection</strong> pour vérifier que tout fonctionne.</li>
        </ul>
    </li>
</ol>

{{-- 4. Azure OpenAI --}}
<h1 class="section">4. Azure OpenAI — étape par étape</h1>

<h2>4.1 Créer la ressource Azure OpenAI</h2>
<ol>
    <li>Connectez-vous sur <span class="code">portal.azure.com</span>.</li>
    <li>Cliquez sur <strong>« Créer une ressource »</strong>, recherchez <strong>« Azure OpenAI »</strong>
        puis cliquez sur <strong>Créer</strong>.</li>
    <li>Renseignez : abonnement, groupe de ressources, région (ex. <em>France Central</em> ou
        <em>Sweden Central</em>), nom de la ressource, niveau tarifaire <em>Standard S0</em>.</li>
    <li>Cliquez sur <strong>Vérifier + créer</strong>, puis <strong>Créer</strong>. Attendez la fin du
        déploiement (quelques minutes).</li>
</ol>

<h2>4.2 Déployer un modèle de chat</h2>
<ol>
    <li>Une fois la ressource créée, ouvrez <strong>Azure AI Foundry</strong>
        (anciennement « Azure OpenAI Studio ») depuis la page de la ressource.</li>
    <li>Allez dans <strong>Déploiements</strong> → <strong>Déployer un modèle</strong>.</li>
    <li>Choisissez un modèle de chat, par exemple <span class="code">gpt-4o-mini</span> ou
        <span class="code">gpt-4o</span>.</li>
    <li>Donnez un nom au déploiement (ex. <span class="code">gpt-4o-mini</span>) — ce nom est le
        <strong>« Deployment name »</strong> demandé par INOV.</li>
</ol>

<h2>4.3 Récupérer les informations de connexion</h2>
<p>Dans le portail Azure, ouvrez votre ressource Azure OpenAI puis allez dans
    <strong>« Clés et points de terminaison »</strong> (Keys and Endpoint).</p>

<table class="fields">
    <tr><th style="width: 28%;">Champ dans INOV</th><th>Où le trouver dans Azure</th><th>Exemple</th></tr>
    <tr>
        <td class="field">Endpoint</td>
        <td>Section « Clés et points de terminaison » → champ « Endpoint »</td>
        <td class="code">https://ma-ressource.openai.azure.com</td>
    </tr>
    <tr>
        <td class="field">API key</td>
        <td>Section « Clés et points de terminaison » → KEY 1 ou KEY 2</td>
        <td class="code">a1b2c3d4...</td>
    </tr>
    <tr>
        <td class="field">Deployment name</td>
        <td>Azure AI Foundry → Déploiements → nom donné à l'étape 4.2</td>
        <td class="code">gpt-4o-mini</td>
    </tr>
    <tr>
        <td class="field">API version</td>
        <td>Laissez la valeur par défaut si vous n'êtes pas sûr</td>
        <td class="code">2024-08-01-preview</td>
    </tr>
</table>

<h2>4.4 Saisir dans INOV</h2>
<p>
    Dans <strong>Paramètres → Azure integrations → Azure OpenAI</strong>, renseignez les quatre champs
    ci-dessus, cliquez sur <strong>Save</strong>, puis sur <strong>Test connection</strong> pour vérifier
    que l'assistant IA peut bien joindre votre déploiement.
</p>

{{-- 5. Azure AI Search --}}
<h1 class="section">5. Azure AI Search — étape par étape</h1>

<h2>5.1 Créer le service Azure AI Search</h2>
<ol>
    <li>Sur <span class="code">portal.azure.com</span>, cliquez sur <strong>« Créer une ressource »</strong>,
        recherchez <strong>« Azure AI Search »</strong> puis <strong>Créer</strong>.</li>
    <li>Renseignez : abonnement, groupe de ressources, nom du service, emplacement, et un niveau tarifaire
        (le niveau <em>Basic</em> est suffisant pour démarrer).</li>
    <li>Cliquez sur <strong>Vérifier + créer</strong>, puis <strong>Créer</strong>.</li>
</ol>

<h2>5.2 Créer un index</h2>
<ol>
    <li>Ouvrez le service créé, puis allez dans <strong>Index</strong> → <strong>Ajouter un index</strong>.</li>
    <li>Donnez un nom à l'index, par exemple <span class="code">inov-documents</span>.</li>
    <li>(Optionnel pour démarrer) Définissez les champs principaux : <span class="code">id</span>,
        <span class="code">content</span>, <span class="code">title</span>, <span class="code">type</span>,
        <span class="code">company_id</span>.</li>
</ol>

<h2>5.3 Récupérer les informations de connexion</h2>
<p>Dans le portail Azure, ouvrez votre service Azure AI Search puis allez dans <strong>« Clés »</strong> (Keys).</p>

<table class="fields">
    <tr><th style="width: 28%;">Champ dans INOV</th><th>Où le trouver dans Azure</th><th>Exemple</th></tr>
    <tr>
        <td class="field">Endpoint</td>
        <td>Page « Vue d'ensemble » → champ « Url »</td>
        <td class="code">https://mon-service.search.windows.net</td>
    </tr>
    <tr>
        <td class="field">API key</td>
        <td>Section « Clés » → « Clé d'administration primaire »</td>
        <td class="code">a1b2c3d4...</td>
    </tr>
    <tr>
        <td class="field">Index name</td>
        <td>Section « Index » → nom donné à l'étape 5.2</td>
        <td class="code">inov-documents</td>
    </tr>
    <tr>
        <td class="field">API version</td>
        <td>Laissez la valeur par défaut si vous n'êtes pas sûr</td>
        <td class="code">2024-07-01</td>
    </tr>
</table>

<h2>5.4 Saisir dans INOV</h2>
<p>
    Dans <strong>Paramètres → Azure integrations → Azure AI Search</strong>, renseignez les quatre champs
    ci-dessus, cliquez sur <strong>Save</strong>, puis sur <strong>Test connection</strong>.
</p>

{{-- 6. Azure Blob Storage --}}
<h1 class="section">6. Azure Blob Storage — étape par étape</h1>

<h2>6.1 Créer le compte de stockage</h2>
<ol>
    <li>Sur <span class="code">portal.azure.com</span>, cliquez sur <strong>« Créer une ressource »</strong>,
        recherchez <strong>« Compte de stockage »</strong> puis <strong>Créer</strong>.</li>
    <li>Renseignez : abonnement, groupe de ressources, <strong>nom du compte</strong> (unique au niveau
        mondial, en minuscules et chiffres uniquement), région, performance <em>Standard</em>, redondance
        <em>LRS</em> (suffisant pour démarrer).</li>
    <li>Cliquez sur <strong>Vérifier + créer</strong>, puis <strong>Créer</strong>.</li>
</ol>

<h2>6.2 Créer un conteneur</h2>
<ol>
    <li>Ouvrez le compte de stockage créé, puis allez dans <strong>Conteneurs</strong> (Containers) →
        <strong>+ Conteneur</strong>.</li>
    <li>Donnez un nom au conteneur, par exemple <span class="code">documents</span>.</li>
    <li>Choisissez le niveau d'accès <strong>Privé (aucun accès anonyme)</strong>.</li>
</ol>

<h2>6.3 Récupérer les informations de connexion</h2>
<p>Dans le compte de stockage, allez dans <strong>« Clés d'accès »</strong> (Access keys).</p>

<table class="fields">
    <tr><th style="width: 28%;">Champ dans INOV</th><th>Où le trouver dans Azure</th><th>Exemple</th></tr>
    <tr>
        <td class="field">Storage account name</td>
        <td>Nom du compte de stockage créé à l'étape 6.1</td>
        <td class="code">monstockage123</td>
    </tr>
    <tr>
        <td class="field">Access key</td>
        <td>Section « Clés d'accès » → key1 ou key2</td>
        <td class="code">a1b2c3d4...==</td>
    </tr>
    <tr>
        <td class="field">Container name</td>
        <td>Nom du conteneur créé à l'étape 6.2</td>
        <td class="code">documents</td>
    </tr>
</table>

<h2>6.4 Saisir dans INOV</h2>
<p>
    Dans <strong>Paramètres → Azure integrations → Azure Blob Storage</strong>, renseignez les trois champs
    ci-dessus, cliquez sur <strong>Save</strong>, puis sur <strong>Test connection</strong>.
</p>

{{-- 7. Testing --}}
<h1 class="section">7. Tester la connexion</h1>

<p>
    Le bouton <strong>Test connection</strong> envoie une requête réelle vers le service Azure configuré et
    affiche immédiatement un message de succès ou d'erreur :
</p>

<table class="fields">
    <tr><th style="width: 28%;">Service</th><th>Ce que fait le test</th></tr>
    <tr>
        <td class="field">Azure OpenAI</td>
        <td>Envoie un court message au déploiement configuré et vérifie qu'une réponse est bien reçue.</td>
    </tr>
    <tr>
        <td class="field">Azure AI Search</td>
        <td>Vérifie que l'index configuré est accessible avec la clé fournie.</td>
    </tr>
    <tr>
        <td class="field">Azure Blob Storage</td>
        <td>Vérifie que le conteneur configuré est accessible avec le compte et la clé fournis.</td>
    </tr>
</table>

<div class="callout">
    Un test réussi fait passer le badge du service de <span class="code">Not configured</span> à
    <span class="code">Connected</span>. Tant que le test échoue, INOV continue d'utiliser le mode local
    pour ce service — aucune fonctionnalité n'est interrompue.
</div>

{{-- 8. Security --}}
<h1 class="section">8. Sécurité et confidentialité des clés</h1>

<div class="callout security">
    <ul>
        <li>Toutes les clés API saisies dans <strong>Paramètres → Azure integrations</strong> sont
            <strong>chiffrées</strong> (chiffrement Laravel, AES-256) avant d'être enregistrées en base de
            données.</li>
        <li>Les clés ne sont <strong>jamais renvoyées en clair</strong> par l'API : une fois enregistrées,
            le champ apparaît vide avec l'indication « configured ». Le laisser vide lors d'un futur
            enregistrement signifie « ne pas modifier cette clé ».</li>
        <li>Seuls les utilisateurs ayant le rôle <strong>admin</strong> de l'entreprise peuvent consulter ou
            modifier ces paramètres.</li>
        <li>Chaque entreprise ne voit et ne configure que ses propres identifiants (isolation multi-tenant).</li>
    </ul>
</div>

{{-- 9. .env --}}
<h1 class="section">9. Configuration globale via le fichier .env</h1>

<p>
    Pour un administrateur système souhaitant définir des identifiants Azure par défaut pour
    <strong>toutes les entreprises</strong>, ajoutez les variables suivantes dans
    <span class="code">backend/.env</span>, puis redémarrez le serveur (<span class="code">php artisan serve</span>) :
</p>

<h2>Azure OpenAI</h2>
<table class="fields">
    <tr><th style="width: 40%;">Variable</th><th>Valeur par défaut</th></tr>
    <tr><td class="field code">AZURE_OPENAI_ENDPOINT</td><td>—</td></tr>
    <tr><td class="field code">AZURE_OPENAI_KEY</td><td>—</td></tr>
    <tr><td class="field code">AZURE_OPENAI_DEPLOYMENT</td><td class="code">gpt-4o-mini</td></tr>
    <tr><td class="field code">AZURE_OPENAI_API_VERSION</td><td class="code">2024-08-01-preview</td></tr>
</table>

<h2>Azure AI Search</h2>
<table class="fields">
    <tr><th style="width: 40%;">Variable</th><th>Valeur par défaut</th></tr>
    <tr><td class="field code">AZURE_SEARCH_ENDPOINT</td><td>—</td></tr>
    <tr><td class="field code">AZURE_SEARCH_KEY</td><td>—</td></tr>
    <tr><td class="field code">AZURE_SEARCH_INDEX</td><td class="code">inov-documents</td></tr>
    <tr><td class="field code">AZURE_SEARCH_API_VERSION</td><td class="code">2024-07-01</td></tr>
</table>

<h2>Azure Blob Storage</h2>
<table class="fields">
    <tr><th style="width: 40%;">Variable</th><th>Valeur par défaut</th></tr>
    <tr><td class="field code">AZURE_STORAGE_ACCOUNT</td><td>—</td></tr>
    <tr><td class="field code">AZURE_STORAGE_KEY</td><td>—</td></tr>
    <tr><td class="field code">AZURE_STORAGE_CONTAINER</td><td class="code">documents</td></tr>
</table>

<div class="callout warning">
    La configuration <span class="code">.env</span> ne sert que de <strong>valeur de repli</strong> :
    si une entreprise configure ses propres identifiants depuis le tableau de bord, ce sont ces derniers
    qui sont utilisés en priorité pour cette entreprise.
</div>

{{-- 10. Troubleshooting --}}
<h1 class="section">10. Dépannage (FAQ)</h1>

<h3>« Endpoint and key are required »</h3>
<p>Le champ Endpoint ou le champ Clé API (ou les deux) sont vides pour ce service. Renseignez les deux
    champs avant de cliquer sur « Test connection ».</p>

<h3>Le test de connexion échoue ou expire</h3>
<ul>
    <li>Vérifiez que l'URL de l'Endpoint commence bien par <span class="code">https://</span> et ne se
        termine pas par une barre oblique (<span class="code">/</span>) finale.</li>
    <li>Vérifiez dans le portail Azure que la ressource est bien à l'état <strong>actif</strong> (pas en
        cours de suppression ni de redéploiement).</li>
    <li>Vérifiez que la clé n'a pas été régénérée depuis sa copie — recopiez Key 1 ou Key 2 depuis le
        portail Azure.</li>
</ul>

<h3>Erreur 401 « Unauthorized »</h3>
<p>La clé API est incorrecte, expirée ou a été régénérée. Retournez dans le portail Azure, copiez la clé
    à jour et enregistrez-la à nouveau dans INOV.</p>

<h3>L'assistant IA / la recherche continuent d'utiliser le mode local malgré la configuration</h3>
<p>
    Cliquez sur <strong>Test connection</strong> pour confirmer que les identifiants sont valides. Si le
    test échoue, INOV bascule automatiquement sur le mode local jusqu'à ce que la connexion soit rétablie —
    c'est le comportement attendu de l'architecture « pluggable » décrite en section 1.
</p>

<h3>« Nom du conteneur introuvable » (Azure Blob Storage)</h3>
<p>Vérifiez que le nom du conteneur saisi dans INOV correspond exactement (en minuscules) au conteneur
    créé dans le compte de stockage à l'étape 6.2.</p>

<div class="footer">
    INOV Business Agent — Guide de configuration Azure — Document généré automatiquement
</div>

</body>
</html>
