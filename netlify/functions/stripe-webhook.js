// netlify/functions/stripe-webhook.js - VERSION FINALE AVEC SENDGRID

exports.handler = async (event, context) => {
  // Configuration
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  
  // Vérification de la méthode HTTP
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Import de Stripe (dynamique pour Netlify)
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    // Vérification de la signature Stripe
    const sig = event.headers['stripe-signature'];
    const body = event.body;
    
    let stripeEvent;
    
    try {
      stripeEvent = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('❌ Erreur signature Stripe:', err.message);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` })
      };
    }

    console.log(`✅ TirageExpress - Événement: ${stripeEvent.type}`);

    // Traitement des événements
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(stripeEvent.data.object);
        break;
        
      case 'payment_intent.succeeded':
        console.log('💰 Payment confirmé:', stripeEvent.data.object.id);
        break;
        
      default:
        console.log(`ℹ️ Événement non géré: ${stripeEvent.type}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };

  } catch (error) {
    console.error('❌ Erreur webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }

  // Fonction de traitement du checkout
  async function handleCheckoutCompleted(session) {
    try {
      console.log('🛒 Session checkout complétée:', session.id);
      
      // Récupération des informations client
      const customerEmail = session.customer_details?.email || session.customer_email;
      const customerName = session.customer_details?.name || '';
      const amountTotal = session.amount_total / 100; // Convertir en euros
      
      if (!customerEmail) {
        console.error('❌ Pas d\'email client trouvé');
        return;
      }
      
      console.log(`👤 Client: ${customerName} - Email: ${customerEmail}`);
      console.log(`💰 Montant: ${amountTotal}€`);
      
      // Déterminer le produit
      const productType = determineProduct(amountTotal);
      console.log(`📦 Produit: ${productType}`);
      
      // Générer le code d'activation
      const activationCode = generateActivationCode(productType);
      console.log(`🔑 Code généré: ${activationCode}`);
      
      // Envoyer l'email via SendGrid
      const emailSent = await sendWelcomeEmail({
        customerEmail,
        customerName,
        productType,
        activationCode,
        amount: amountTotal
      });
      
      console.log(`📧 Email envoyé via SendGrid: ${emailSent}`);
      
      if (emailSent) {
        // Log du code pour suivi
        console.log(`🔑 TirageExpress - CODE ${productType.toUpperCase()}: ${customerEmail} = ${activationCode}`);
      }
      
    } catch (error) {
      console.error('❌ Erreur handleCheckoutCompleted:', error);
    }
  }

  // Déterminer le produit selon le montant
  function determineProduct(amount) {
    if (amount >= 99) {
      return 'Pro';
    } else if (amount >= 49) {
      return 'Premium';
    } else {
      return 'Premium'; // Par défaut
    }
  }

  // Générer un code d'activation
  function generateActivationCode(productType) {
    const prefix = productType === 'Pro' ? 'PRO2025' : 'PREMIUM2025';
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ0123456789';
    const numbers = '0123456789';
    
    let code = prefix;
    
    // 3 caractères alphanumériques
    for (let i = 0; i < 3; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    
    // 3 chiffres
    for (let i = 0; i < 3; i++) {
      code += numbers[Math.floor(Math.random() * numbers.length)];
    }
    
    return code;
  }

  // FONCTION EMAIL AVEC SENDGRID
  async function sendWelcomeEmail({ customerEmail, customerName, productType, activationCode, amount }) {
    try {
      console.log(`📤 Envoi email à ${customerEmail} - Code: ${activationCode}`);
      
      // Import SendGrid
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      
      // Template HTML pour l'email
      const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Bienvenue TirageExpress ${productType}</title>
      </head>
      <body style="font-family: Arial, sans-serif; background: #f8f9fa; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 30px; text-align: center;">
                  <h1 style="margin: 0; font-size: 2em;">🎉 TirageExpress ${productType}</h1>
                  <p style="margin: 10px 0 0 0; font-size: 1.1em; opacity: 0.95;">Bienvenue ${customerName || 'Cher client'} !</p>
              </div>
              
              <!-- Contenu principal -->
              <div style="padding: 30px;">
                  <p style="font-size: 1.1em; color: #2c3e50; margin-bottom: 20px;">
                      Bonjour ${customerName || 'Cher client'},
                  </p>
                  
                  <p style="color: #2c3e50; line-height: 1.6; margin-bottom: 25px;">
                      Félicitations ! Votre abonnement TirageExpress <strong>${productType}</strong> 
                      (${amount}€/an) est maintenant <span style="color: #27ae60; font-weight: 600;">✅ ACTIF</span>.
                  </p>
                  
                  <!-- Code d'accès -->
                  <div style="background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); color: white; padding: 25px; border-radius: 12px; text-align: center; margin: 25px 0;">
                      <h2 style="margin: 0 0 15px 0; font-size: 1.3em;">🔑 Votre Code d'Accès</h2>
                      <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; font-family: monospace; font-size: 1.8em; font-weight: bold; letter-spacing: 2px; margin: 15px 0;">
                          ${activationCode}
                      </div>
                      <p style="margin: 15px 0 0 0; font-size: 0.9em; opacity: 0.9;">
                          ⚠️ Conservez précieusement ce code
                      </p>
                  </div>
                  
                  <!-- Bouton d'accès -->
                  <div style="text-align: center; margin: 30px 0;">
                      <a href="${productType === 'Pro' ? 'https://tirage-express.netlify.app/pro.html' : 'https://tirage-express.netlify.app/premium.html'}" style="display: inline-block; background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; font-size: 1.1em; box-shadow: 0 4px 15px rgba(44, 62, 80, 0.3);">
                          🚀 Accéder à TirageExpress ${productType}
                      </a>
                  </div>
                  
                  <!-- Fonctionnalités -->
                  <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 25px 0;">
                      <h3 style="color: #2c3e50; margin: 0 0 15px 0;">📋 Vos fonctionnalités ${productType} :</h3>
                      <ul style="color: #2c3e50; line-height: 1.8; margin: 0; padding-left: 20px;">
                          <li>✅ Joueurs illimités</li>
                          <li>✅ Tous types de parties (tête-à-tête, doublettes, triplettes)</li>
                          <li>✅ Sauvegarde permanente automatique</li>
                          <li>✅ Export PDF des feuilles de match</li>
                          <li>✅ Historique complet et statistiques</li>
                      </ul>
                  </div>
                  
                  <!-- Instructions -->
                  <div style="border-left: 4px solid #3498db; padding: 15px 20px; background: #e3f2fd; margin: 25px 0; border-radius: 0 8px 8px 0;">
                      <h4 style="color: #1565c0; margin: 0 0 10px 0;">💡 Comment procéder :</h4>
                      <ol style="color: #1565c0; margin: 0; padding-left: 20px; line-height: 1.6;">
                          <li>Cliquez sur le bouton ci-dessus</li>
                          <li>Entrez votre code d'accès : <strong>${activationCode}</strong></li>
                          <li>Profitez de toutes les fonctionnalités !</li>
                      </ol>
                  </div>
                  
                  <!-- Support -->
                  <p style="color: #7f8c8d; font-size: 0.95em; line-height: 1.6; margin: 25px 0;">
                      <strong>Besoin d'aide ?</strong><br>
                      📧 Email : contact@tirage-express.com<br>
                      ⏰ Support : 7j/7 pour les clients ${productType}
                  </p>
              </div>
              
              <!-- Footer -->
              <div style="background: #2c3e50; color: white; padding: 20px; text-align: center;">
                  <p style="margin: 0; font-size: 0.9em; opacity: 0.8;">
                      © 2025 TirageExpress - Le tirage de pétanque en 30 secondes<br>
                      <a href="https://tirage-express.netlify.app" style="color: #e74c3c; text-decoration: none;">tirage-express.netlify.app</a>
                  </p>
              </div>
          </div>
      </body>
      </html>`;
      
      // Configuration de l'email
      const msg = {
        to: customerEmail,
        from: {
          email: 'tirageexpress.auto@gmail.com',
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
      
      // Envoi de l'email
      await sgMail.send(msg);
      console.log('✅ Email envoyé avec succès via SendGrid');
      return true;
      
    } catch (error) {
      console.error('❌ Erreur SendGrid:', error.message);
      if (error.response) {
        console.error('❌ SendGrid Response:', error.response.body);
      }
      return false;
    }
  }
};
