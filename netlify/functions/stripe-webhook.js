// Version PRODUCTION recommandée - Plus propre
async function sendWelcomeEmail({ customerEmail, customerName, productType, activationCode, amount }) {
  try {
    console.log(`📤 Envoi email à ${customerEmail} - Code: ${activationCode}`);
    
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
    
    // Payload pour EmailJS REST API
    const emailPayload = {
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: templateParams
    };
    
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
    console.error('❌ Erreur sendWelcomeEmail:', error.message);
    return false;
  }
}
