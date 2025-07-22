const crypto = require('crypto');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Method Not Allowed - Use POST' })
        };
    }

    try {
        const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
        const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
        
        if (!STRIPE_SECRET_KEY || !WEBHOOK_SECRET) {
            console.error('Variables Stripe manquantes');
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Configuration manquante' })
            };
        }

        const payload = event.body;
        const sig = event.headers['stripe-signature'];

        if (!sig) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Signature manquante' })
            };
        }

        const elements = sig.split(',');
        const timestamp = elements.find(e => e.startsWith('t='))?.replace('t=', '');
        const signature = elements.find(e => e.startsWith('v1='))?.replace('v1=', '');

        if (!timestamp || !signature) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Format signature invalide' })
            };
        }

        const payloadForSignature = timestamp + '.' + payload;
        const expectedSignature = crypto
            .createHmac('sha256', WEBHOOK_SECRET)
            .update(payloadForSignature, 'utf8')
            .digest('hex');

        if (signature !== expectedSignature) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Signature invalide' })
            };
        }

        const eventData = JSON.parse(payload);
        console.log('TirageExpress - Événement:', eventData.type);

        if (eventData.type === 'checkout.session.completed') {
            const session = eventData.data.object;
            
            if (session.payment_status === 'paid') {
                console.log('TirageExpress - Paiement confirmé !');
                const result = await handleTirageExpressPremium(session);
                
                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        message: 'TirageExpress Premium activé !',
                        success: result 
                    })
                };
            }
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Webhook reçu' })
        };

    } catch (error) {
        console.error('Erreur webhook:', error.message);
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: error.message })
        };
    }
};

async function handleTirageExpressPremium(session) {
    try {
        const customer_email = session.customer_details?.email;
        const customer_name = session.customer_details?.name || 'Client';
        
        if (!customer_email) {
            throw new Error('Email manquant');
        }

        console.log(`TirageExpress - Client: ${customer_name} - Email: ${customer_email}`);

        const code_premium = generateTirageExpressCode();
        console.log(`TirageExpress - Code généré: ${code_premium}`);

        const emailSent = await sendTirageExpressEmail(customer_email, customer_name, code_premium);
        console.log(`TirageExpress - CODES PREMIUM: ${customer_email} = ${code_premium}`);
        
        return emailSent;
        
    } catch (error) {
        console.error('Erreur handlePremium:', error);
        return false;
    }
}

function generateTirageExpressCode() {
    const prefix = 'PREMIUM2025';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = prefix;
    
    for (let i = 0; i < 3; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    result += Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return result;
}

async function sendTirageExpressEmail(email, name, code) {
    try {
        const prenom = name.split(' ')[0];
        
        // Template HTML complet
        const emailHTML = getEmailTemplate(prenom, code);
        
        // Envoi via Netlify Forms (SOLUTION GRATUITE)
        const formData = new URLSearchParams();
        formData.append('form-name', 'tirageexpress-premium-email');
        formData.append('email', email);
        formData.append('name', prenom);
        formData.append('code', code);
        formData.append('subject', '🎉 Bienvenue dans TirageExpress Premium !');
        formData.append('html-content', emailHTML);
        
        const response = await fetch('https://tirage-express.netlify.app/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        });
        
        console.log('Email envoyé via Netlify Forms:', response.ok);
        
        // Alternative : Envoi via EmailJS (service gratuit)
        await sendViaEmailJS(email, prenom, code, emailHTML);
        
        return true;
        
    } catch (error) {
        console.error('Erreur sendEmail:', error);
        return false;
    }
}

// Fonction d'envoi via EmailJS (service gratuit)
async function sendViaEmailJS(email, name, code, htmlContent) {
    try {
        // Configuration EmailJS - à créer sur emailjs.com
        const emailJSData = {
            service_id: 'service_tirageexpress', // À configurer sur EmailJS
            template_id: 'template_premium',     // À configurer sur EmailJS
            user_id: 'votre_user_id_emailjs',   // À configurer sur EmailJS
            template_params: {
                to_email: email,
                to_name: name,
                from_name: 'TirageExpress',
                subject: '🎉 Bienvenue dans TirageExpress Premium !',
                code_activation: code,
                html_content: htmlContent
            }
        };
        
        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailJSData)
        });
        
        console.log('Email envoyé via EmailJS:', response.ok);
        return response.ok;
        
    } catch (error) {
        console.error('Erreur EmailJS:', error);
        return false;
    }
}

function getEmailTemplate(prenom, code) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TirageExpress Premium</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; padding: 40px 30px; text-align: center; position: relative; }
        .header::before { content: '🎉'; position: absolute; top: 20px; left: 30px; font-size: 2em; animation: bounce 2s ease-in-out infinite; }
        .header::after { content: '⭐'; position: absolute; top: 20px; right: 30px; font-size: 2em; animation: bounce 2s ease-in-out infinite 1s; }
        @keyframes bounce { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
        .header h1 { margin: 0; font-size: 2.2em; text-shadow: 2px 2px 8px rgba(0,0,0,0.3); }
        .content { padding: 40px 30px; }
        .welcome { text-align: center; margin-bottom: 30px; }
        .welcome h2 { color: #2c3e50; font-size: 1.8em; margin-bottom: 15px; }
        .code-box { background: linear-gradient(135deg, #27ae60, #2ecc71); color: white; padding: 25px; text-align: center; border-radius: 15px; margin: 30px 0; box-shadow: 0 6px 20px rgba(39, 174, 96, 0.3); }
        .code-box h3 { margin: 0 0 15px 0; font-size: 1.3em; }
        .code { font-size: 1.8em; font-weight: bold; letter-spacing: 3px; background: rgba(255,255,255,0.2); padding: 15px 20px; border-radius: 10px; }
        .features { margin: 30px 0; }
        .features ul { list-style: none; padding: 0; }
        .features li { padding: 10px 0; font-size: 1.1em; color: #2c3e50; }
        .features li::before { content: '✓'; color: #27ae60; font-weight: bold; margin-right: 15px; font-size: 1.3em; }
        .button { display: inline-block; background: linear-gradient(135deg, #2c3e50, #34495e); color: white; padding: 18px 35px; text-decoration: none; border-radius: 30px; margin: 25px 0; font-weight: 600; font-size: 1.1em; box-shadow: 0 6px 20px rgba(44, 62, 80, 0.3); transition: all 0.3s ease; }
        .instructions { background: linear-gradient(135deg, #fff8e1, #ffecb3); border: 2px solid #ffa726; padding: 20px; border-radius: 12px; margin: 25px 0; }
        .instructions h4 { color: #ef6c00; margin-bottom: 15px; font-size: 1.2em; }
        .instructions ol { color: #e65100; font-weight: 500; }
        .footer { background: linear-gradient(135deg, #2c3e50, #34495e); color: white; padding: 30px; text-align: center; }
        .footer h4 { color: #e74c3c; margin-bottom: 10px; }
        .support { background: linear-gradient(135deg, #e3f2fd, #bbdefb); border: 2px solid #2196f3; padding: 20px; border-radius: 12px; margin: 25px 0; text-align: center; }
        .support h4 { color: #1565c0; margin-bottom: 10px; }
        .support p { color: #0d47a1; font-weight: 500; }
        @media (max-width: 600px) {
            .container { margin: 10px; }
            .header { padding: 30px 20px; }
            .content { padding: 25px 20px; }
            .code { font-size: 1.4em; letter-spacing: 2px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>TirageExpress Premium</h1>
            <p style="font-size: 1.2em; margin-top: 10px; opacity: 0.95;">Bienvenue ${prenom} !</p>
        </div>
        
        <div class="content">
            <div class="welcome">
                <h2>Félicitations !</h2>
                <p style="font-size: 1.1em; color: #7f8c8d; line-height: 1.6;">
                    Votre abonnement TirageExpress Premium est maintenant actif. 
                    Vous avez accès à toutes les fonctionnalités avancées pour organiser vos tirages comme un pro !
                </p>
            </div>
            
            <div class="code-box">
                <h3>🔑 Votre code d'activation Premium :</h3>
                <div class="code">${code}</div>
                <p style="margin-top: 15px; font-size: 0.9em; opacity: 0.9;">
                    Conservez précieusement ce code !
                </p>
            </div>
            
            <div class="features">
                <h3 style="color: #2c3e50; text-align: center; margin-bottom: 20px;">
                    ✨ Vos fonctionnalités Premium débloquées
                </h3>
                <ul>
                    <li>Joueurs illimités (vs 6 en gratuit)</li>
                    <li>Tous types de parties : tête-à-tête, doublettes, triplettes</li>
                    <li>Sauvegarde permanente de tous vos joueurs</li>
                    <li>Statistiques détaillées et historiques complets</li>
                    <li>Export PDF des feuilles de match</li>
                    <li>Support prioritaire par email sous 24h</li>
                </ul>
            </div>
            
            <div style="text-align: center;">
                <a href="https://tirage-express.netlify.app/premium.html" class="button">
                    🚀 Accéder à Premium Maintenant
                </a>
            </div>
            
            <div class="instructions">
                <h4>📋 Comment utiliser votre accès Premium :</h4>
                <ol>
                    <li>Cliquez sur le bouton "Accéder à Premium" ci-dessus</li>
                    <li>Saisissez votre code d'activation : <strong>${code}</strong></li>
                    <li>Cliquez sur "🚀 Accéder à Premium"</li>
                    <li>Profitez de toutes les fonctionnalités débloquées !</li>
                </ol>
            </div>
            
            <div class="support">
                <h4>💬 Besoin d'aide ?</h4>
                <p>
                    Notre équipe est là pour vous accompagner !<br>
                    📧 <strong>contact@tirage-express.com</strong><br>
                    ⏰ Support Premium : 7j/7 sous 24h
                </p>
            </div>
        </div>
        
        <div class="footer">
            <h4>TirageExpress Premium</h4>
            <p>
                Le tirage de pétanque en 30 secondes<br>
                <a href="https://tirage-express.netlify.app" style="color: #e74c3c;">tirage-express.netlify.app</a><br><br>
                
                Merci de votre confiance !<br>
                L'équipe TirageExpress
            </p>
        </div>
    </div>
</body>
</html>`;
}
