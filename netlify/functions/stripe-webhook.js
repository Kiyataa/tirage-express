// Trouvez cette partie dans votre stripe-webhook.js (vers la ligne 150) :

// Configuration de l'email - VERSION CORRIGÉE
const msg = {
  to: customerEmail,
  from: {
    email: 'noreply@tirage-express.com',  // ← Email vérifié dans SendGrid
    name: 'TirageExpress'
  },
  reply_to: {
    email: 'contact@tirage-express.com',
    name: 'TirageExpress Support'
  },
  subject: `🎉 Bienvenue dans TirageExpress ${productType} !`,
  html: htmlContent,
  text: `
🎉 BIENVENUE DANS TIRAGEEXPRESS ${productType.toUpperCase()} !

Bonjour ${customerName || 'Cher client'},

Merci pour votre achat ! Votre abonnement TirageExpress ${productType} (${amount}€/an) est maintenant ACTIF.

🔑 VOTRE CODE D'ACCÈS : ${activationCode}

Pour accéder à votre application :
1. Rendez-vous sur : ${productType === 'Pro' ? 'https://tirage-express.netlify.app/pro.html' : 'https://tirage-express.netlify.app/premium.html'}
2. Entrez votre code d'accès : ${activationCode}
3. Profitez de toutes les fonctionnalités !

📋 VOS FONCTIONNALITÉS ${productType.toUpperCase()} :
✅ Joueurs illimités
✅ Tous types de parties
✅ Sauvegarde permanente
✅ Export PDF
✅ Statistiques avancées

Besoin d'aide ?
📧 contact@tirage-express.com
⏰ Support 7j/7 pour les clients ${productType}

Merci de votre confiance !
L'équipe TirageExpress
  `
};
