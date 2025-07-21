// netlify/functions/stripe-webhook.js
// Fonction Netlify pour gérer les webhooks Stripe

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const sgMail = require('@sendgrid/mail');

// Configuration SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Codes d'activation disponibles
const CODES_PREMIUM = [
    'PREMIUM2025A', 'PREMIUM2025B', 'PREMIUM2025C', 'PREMIUM2025D', 'PREMIUM2025E',
    'PREMIUM2025F', 'PREMIUM2025G', 'PREMIUM2025H', 'PREMIUM2025I', 'PREMIUM2025J'
];

const CODES_PRO = [
    'PRO2025A', 'PRO2025B', 'PRO2025C', 'PRO2025D', 'PRO2025E'
];

// Fonction pour envoyer l'email d'activation
async function envoyerEmailActivation(email, nom, produit, codeActivation) {
    console.log(`📧 Envoi email à ${email} pour ${produit} avec code ${codeActivation}`);

    const msg = {
        to: email,
        from: 'tirageexpress.auto@gmail.com', // Utilisation de votre Gmail vérifié
        subject: `🎉 Votre code d'activation TirageExpress ${produit}`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #2c3e50; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
        .code-box { background: #f8f9fa; border: 2px dashed #e74c3c; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; }
        .code { font-size: 24px; font-weight: bold; color: #e74c3c; letter-spacing: 3px; }
        .btn { background: #e74c3c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; margin: 20px 0; font-weight: bold; }
        .highlight { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Bienvenue dans TirageExpress ${produit} !</h1>
            <p>Merci pour votre achat</p>
        </div>
        
        <div class="content">
            <h2>Bonjour ${nom || 'Client'},</h2>
            
            <p>Félicitations ! Votre achat de <strong>TirageExpress ${produit}</strong> a bien été validé.</p>
            
            <div class="highlight">
                <h3>✅ Votre abonnement est maintenant actif !</h3>
                <p>Vous avez maintenant accès à toutes les fonctionnalités ${produit} de TirageExpress.</p>
            </div>
            
            <h3>🔑 Votre code d'activation :</h3>
            <div class="code-box">
                <div class="code">${codeActivation}</div>
                <p><em>Gardez ce code précieusement, il vous permettra d'accéder à votre compte</em></p>
            </div>
            
            <h3>🚀 Comment utiliser TirageExpress ${produit} :</h3>
            <ol>
                <li>Cliquez sur le bouton ci-dessous pour accéder à l'application</li>
                <li>Entrez votre code d'activation : <strong>${codeActivation}</strong></li>
                <li>Profitez de toutes les fonctionnalités ${produit} !</li>
            </ol>
            
            <div style="text-align: center;">
                <a href="https://tirage-express.com/premium.html" class="btn">🎯 Accéder à TirageExpress ${produit}</a>
            </div>
            
            <h3>🎁 Vos avantages ${produit} :</h3>
            ${produit === 'Premium' ? `
            <ul>
                <li>✅ Joueurs illimités</li>
                <li>✅ Tous types de parties (tête-à-tête, doublettes, triplettes)</li>
                <li>✅ Sauvegarde permanente</li>
                <li>✅ Export PDF des feuilles de match</li>
                <li>✅ Support prioritaire par email</li>
            </ul>
            ` : `
            <ul>
                <li>✅ Toutes les fonctionnalités Premium</li>
                <li>✅ Interface personnalisable (logo, couleurs)</li>
                <li>✅ Modèles de tournois pré-configurés</li>
                <li>✅ Formation personnalisée incluse (1h)</li>
                <li>✅ Support téléphonique dédié</li>
                <li>✅ API d'intégration</li>
            </ul>
            `}
            
            <div class="highlight">
                <h3>💡 Besoin d'aide ?</h3>
                <p>Notre équipe est là pour vous accompagner :</p>
                <p>📧 Email : <strong>tirageexpress.auto@gmail.com</strong></p>
                <p>⏰ Réponse sous 24h pour les clients ${produit}</p>
            </div>
            
            <p>Merci de faire confiance à TirageExpress pour vos tirages de pétanque !</p>
            
            <p style="margin-top: 30px;">
                Cordialement,<br>
                <strong>L'équipe TirageExpress</strong><br>
                <em>Le tirage de pétanque en 30 secondes</em>
            </p>
        </div>
        
        <div style="text-align: center; color: #7f8c8d; padding: 20px; font-size: 0.9em;">
            © 2025 TirageExpress - DigitCraft | tirageexpress.auto@gmail.com
        </div>
    </div>
</body>
</html>
        `
    };

    try {
        await sgMail.send(msg);
        console.log(`✅ Email envoyé avec succès à ${email}`);
        return true;
    } catch (error) {
        console.error(`❌ Erreur envoi email:`, error.message);
        return false;
    }
}

// Gestionnaire principal du webhook
exports.handler = async (event, context) => {
    console.log('🔄 Webhook reçu:', event.httpMethod);
    
    // Vérifier que c'est un POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    const sig = event.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let stripeEvent;
    
    try {
        stripeEvent = stripe.webhooks.constructEvent(event.body, sig, endpointSecret);
        console.log('✅ Webhook Stripe vérifié:', stripeEvent.type);
    } catch (err) {
        console.error(`❌ Webhook signature verification failed:`, err.message);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: `Webhook Error: ${err.message}` })
        };
    }

    // Traitement des événements Stripe
    try {
        switch (stripeEvent.type) {
            case 'checkout.session.completed':
                console.log('💰 Checkout session completed');
                await handleCheckoutCompleted(stripeEvent.data.object);
                break;
            case 'payment_intent.succeeded':
                console.log('💳 Payment intent succeeded');
                await handlePaymentSucceeded(stripeEvent.data.object);
                break;
            default:
                console.log(`🤷 Événement non géré: ${stripeEvent.type}`);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ received: true })
        };
    } catch (error) {
        console.error('❌ Erreur webhook:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

async function handleCheckoutCompleted(session) {
    console.log('🔍 Analyse du checkout:', session.id);
    
    // Récupérer les détails du client
    const customerEmail = session.customer_details?.email;
    const customerName = session.customer_details?.name;
    const amountTotal = session.amount_total;
    
    console.log(`📊 Détails: Email=${customerEmail}, Montant=${amountTotal}`);
    
    if (!customerEmail) {
        console.error('❌ Email client introuvable');
        return;
    }

    // Déterminer le produit basé sur le montant
    let produit, codeActivation;
    
    if (amountTotal === 4900) { // 49€ en centimes
        produit = 'Premium';
        codeActivation = getNextAvailableCode(CODES_PREMIUM);
    } else if (amountTotal === 9900) { // 99€ en centimes
        produit = 'Pro';
        codeActivation = getNextAvailableCode(CODES_PRO);
    } else if (amountTotal === 0) { // Test à 0€
        produit = 'Premium';
        codeActivation = 'TEST2025DEMO';
    } else {
        console.error('❌ Montant non reconnu:', amountTotal);
        return;
    }

    console.log(`🎯 Produit déterminé: ${produit}, Code: ${codeActivation}`);

    // Envoyer l'email d'activation
    const emailEnvoye = await envoyerEmailActivation(customerEmail, customerName, produit, codeActivation);
    
    if (emailEnvoye) {
        console.log(`✅ Processus complet réussi pour ${customerEmail}`);
    } else {
        console.error(`❌ Échec envoi email pour ${customerEmail}`);
    }
}

async function handlePaymentSucceeded(paymentIntent) {
    console.log('💰 Payment succeeded:', paymentIntent.id);
    // Traitement supplémentaire si nécessaire
}

function getNextAvailableCode(codesList) {
    // Version simplifiée - dans la vraie vie, utilisez une base de données
    // pour tracker les codes utilisés
    const randomIndex = Math.floor(Math.random() * codesList.length);
    return codesList[randomIndex];
}