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
        
        console.log(`EMAIL TIRAGEEXPRESS PREMIUM:`);
        console.log(`À: ${email}`);
        console.log(`Nom: ${prenom}`);
        console.log(`Code: ${code}`);
        console.log(`Sujet: 🎉 Bienvenue dans TirageExpress Premium !`);
        
        return true;
        
    } catch (error) {
        console.error('Erreur sendEmail:', error);
        return false;
    }
}
