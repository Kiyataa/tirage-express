// netlify/functions/stripe-webhook.js - VERSION CORRIGÉE

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const sgMail = require('@sendgrid/mail');

// Configuration SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Mapping des montants vers les plans
const PLAN_MAPPING = {
  100: 'TEST',        // 1€ = Test
  4900: 'PREMIUM',    // 49€ = Premium
  9900: 'PRO'         // 99€ = Pro
};

// Génération de codes d'accès
function generateAccessCode(plan) {
  const prefix = plan === 'PRO' ? 'PRO2025' : 'PREMIUM2025';
  const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  const timestamp = Date.now().toString().slice(-3);
  return `${prefix}${suffix}${timestamp}`;
}

// Templates d'emails
const EMAIL_TEMPLATES = {
  TEST: {
    subject: '🧪 Test TirageExpress - Code d\'accès temporaire',
    html: `
      <h2>🧪 Test TirageExpress</h2>
      <p>Merci pour votre test !</p>
      <div style="background: #f39c12; color: white; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
        <h3>Code d'accès TEST</h3>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">{{ACCESS_CODE}}</p>
      </div>
      <p><strong>⚠️ ATTENTION :</strong> Ceci est un code de test temporaire.</p>
      <p>Pour accéder à la version complète : <a href="https://tirage-express.com/premium.html">tirage-express.com/premium.html</a></p>
    `
  },
  PREMIUM: {
    subject: '🎉 Bienvenue dans TirageExpress Premium !',
    html: `
      <h2>🎉 Bienvenue dans TirageExpress Premium !</h2>
      <p>Merci pour votre achat ! Votre accès Premium est maintenant activé.</p>
      <div style="background: #27ae60; color: white; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
        <h3>🔑 Votre Code d'Accès Premium</h3>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">{{ACCESS_CODE}}</p>
      </div>
      
      <h3>✅ Vos Fonctionnalités Premium</h3>
      <ul>
        <li>👥 <strong>Joueurs illimités</strong></li>
        <li>🎯 <strong>Tous types de parties</strong> (tête-à-tête, doublettes, triplettes)</li>
        <li>💾 <strong>Sauvegarde permanente</strong> de vos données</li>
        <li>📊 <strong>Statistiques détaillées</strong></li>
        <li>📄 <strong>Export PDF</strong> des feuilles de match</li>
        <li>📞 <strong>Support prioritaire</strong> sous 24h</li>
      </ul>
      
      <h3>🚀 Comment accéder ?</h3>
      <ol>
        <li>Rendez-vous sur : <a href="https://tirage-express.com/premium.html">tirage-express.com/premium.html</a></li>
        <li>Entrez votre code d'accès : <strong>{{ACCESS_CODE}}</strong></li>
        <li>Profitez de TirageExpress Premium !</li>
      </ol>
      
      <p><strong>💡 Astuce :</strong> Sauvegardez ce code dans vos favoris !</p>
      <p>Besoin d'aide ? Répondez à cet email ou contactez-nous à contact@tirage-express.com</p>
    `
  },
  PRO: {
    subject: '🏆 TirageExpress Pro - Accès VIP Activé !',
    html: `
      <h2>🏆 Bienvenue dans TirageExpress Pro !</h2>
      <p>Félicitations ! Vous venez de rejoindre l'élite TirageExpress avec notre formule Pro.</p>
      <div style="background: linear-gradient(135deg, #f39c12, #e67e22); color: white; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
        <h3>🔑 Code d'Accès Pro VIP</h3>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">{{ACCESS_CODE}}</p>
      </div>
      
      <h3>🏆 Vos Privilèges Pro</h3>
      <ul>
        <li>✅ <strong>Toutes les fonctionnalités Premium</strong></li>
        <li>🎨 <strong>Interface personnalisable</strong> (logo, couleurs)</li>
        <li>🏅 <strong>Modèles de tournois</strong> pré-configurés</li>
        <li>📈 <strong>Rapports avancés</strong> et analyses</li>
        <li>🔗 <strong>API d'intégration</strong> pour sites web</li>
        <li>🎓 <strong>Formation personnalisée</strong> incluse (1h)</li>
        <li>📞 <strong>Support téléphonique</strong> dédié</li>
        <li>☁️ <strong>Sauvegarde cloud</strong> automatique</li>
        <li>🚀 <strong>Accès anticipé</strong> aux nouveautés</li>
      </ul>
      
      <h3>🎯 Prochaines Étapes</h3>
      <ol>
        <li>Accédez à votre espace Pro : <a href="https://tirage-express.com/premium.html">tirage-express.com/premium.html</a></li>
        <li>Entrez votre code VIP : <strong>{{ACCESS_CODE}}</strong></li>
        <li>Planifiez votre formation personnalisée</li>
      </ol>
      
      <p><strong>📅 Formation Incluse :</strong> Nous vous contacterons sous 48h pour planifier votre session de formation personnalisée !</p>
      <p>Contact VIP : contact@tirage-express.com | Priorité Pro</p>
    `
  }
};

exports.handler = async (event, context) => {
  console.log('🔄 Webhook reçu:', event.httpMethod);
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Vérification signature Stripe
    const sig = event.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let stripeEvent;
    try {
      stripeEvent = stripe.webhooks.constructEvent(event.body, sig, endpointSecret);
      console.log('✅ Webhook Stripe vérifié:', stripeEvent.type);
    } catch (err) {
      console.error('❌ Erreur signature webhook:', err.message);
      return { statusCode: 400, body: `Webhook Error: ${err.message}` };
    }

    // Traitement des événements
    if (stripeEvent.type === 'payment_intent.succeeded') {
      console.log('💳 Payment intent succeeded');
      const paymentIntent = stripeEvent.data.object;
      console.log('💰 Payment succeeded:', paymentIntent.id);
      
      return { statusCode: 200, body: 'Payment intent handled' };
    }

    if (stripeEvent.type === 'checkout.session.completed') {
      console.log('💰 Checkout session completed');
      const session = stripeEvent.data.object;
      
      console.log('🔍 Analyse du checkout:', session.id);
      
      // Extraction des données
      const customerEmail = session.customer_details?.email || session.customer_email;
      const amountTotal = session.amount_total;
      
      console.log('📊 Détails: Email=' + customerEmail + ', Montant=' + amountTotal);
      
      // Identification du plan
      const plan = PLAN_MAPPING[amountTotal];
      
      if (!plan) {
        console.error('❌ Montant non reconnu:', amountTotal);
        console.log('💡 Montants acceptés:', Object.keys(PLAN_MAPPING).join(', '));
        return { statusCode: 400, body: 'Montant non reconnu' };
      }
      
      console.log('🎯 Plan identifié:', plan);
      
      // Génération du code d'accès
      const accessCode = generateAccessCode(plan);
      console.log('🔑 Code généré:', accessCode);
      
      // Préparation de l'email
      const template = EMAIL_TEMPLATES[plan];
      const emailHtml = template.html.replace(/{{ACCESS_CODE}}/g, accessCode);
      
      const emailData = {
        to: customerEmail,
        from: {
          email: 'contact@tirage-express.com',
          name: 'TirageExpress'
        },
        subject: template.subject,
        html: emailHtml
      };
      
      console.log('📧 Envoi email à:', customerEmail);
      
      try {
        await sgMail.send(emailData);
        console.log('✅ Email envoyé avec succès !');
        
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            message: 'Email envoyé',
            plan: plan,
            accessCode: accessCode
          })
        };
        
      } catch (emailError) {
        console.error('❌ Erreur SendGrid:', emailError.message);
        console.error('📋 Détails:', emailError.response?.body);
        
        return {
          statusCode: 500,
          body: JSON.stringify({
            error: 'Erreur envoi email',
            details: emailError.message
          })
        };
      }
    }

    console.log('🤷 Événement non traité:', stripeEvent.type);
    return { statusCode: 200, body: 'Événement non traité' };

  } catch (error) {
    console.error('💥 Erreur générale:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
