// netlify/functions/stripe-webhook.js - VERSION AVEC VRAIES CLÉS

exports.handler = async (event, context) => {
  // Configuration avec les vraies clés EmailJS
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || 'service_mdlk0r4';
  const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || 'template_p0s3qi7';
  const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || 'oD0JHZRYENBhOM8OB';
  
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
      
      // Envoyer l'email via EmailJS avec la nouvelle API
      const emailSent = await sendWelcomeEmail({
        customerEmail,
        customerName,
        productType,
        activationCode,
        amount: amountTotal
      });
      
      console.log(`📧 Email envoyé via EmailJS: ${emailSent}`);
      
      if (emailSent) {
        // Optionnel : Sauvegarder le client
        await saveCustomerData({
          email: customerEmail,
          name: customerName,
          product: productType,
          code: activationCode,
          date: new Date().toISOString(),
          sessionId: session.id
        });
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

  // ⚡ FONCTION EMAIL CORRIGÉE avec les vraies clés EmailJS
  async function sendWelcomeEmail({ customerEmail, customerName, productType, activationCode, amount }) {
    try {
      console.log('📤 Tentative d\'envoi email...');
      
      // Import fetch pour Netlify Functions
      const fetch = require('node-fetch');
      
      // Données pour le template EmailJS
      const templateParams = {
        to_email: customerEmail,
        to_name: customerName || 'Cher client',
        product_type: productType,
        activation_code: activationCode,
        amount: amount,
        app_url: productType === 'Pro' 
          ? 'https://tirage-express.netlify.app/pro.html'
          : 'https://tirage-express.netlify.app/premium.html'
      };
      
      // Payload pour EmailJS REST API avec les vraies clés
      const emailPayload = {
        service_id: EMAILJS_SERVICE_ID,    // service_mdlk0r4
        template_id: EMAILJS_TEMPLATE_ID,  // template_p0s3qi7
        user_id: EMAILJS_PUBLIC_KEY,       // oD0JHZRYENBhOM8OB
        template_params: templateParams
      };
      
      console.log('📋 Template params:', templateParams);
      console.log('📬 EmailJS Config:', {
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY
      });
      
      // Appel à l'API EmailJS
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload)
      });
      
      if (response.ok) {
        console.log('✅ Email envoyé avec succès via EmailJS');
        return true;
      } else {
        const errorText = await response.text();
        console.error('❌ Erreur EmailJS:', response.status, errorText);
        return false;
      }
      
    } catch (error) {
      console.error('❌ Erreur sendWelcomeEmail:', error);
      return false;
    }
  }

  // Sauvegarder les données client (optionnel)
  async function saveCustomerData(customerData) {
    try {
      // Ici vous pourriez sauvegarder dans une base de données
      // Pour l'instant, on log juste
      console.log('💾 Données client sauvegardées:', customerData);
      return true;
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
      return false;
    }
  }
};
