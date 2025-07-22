// Ajoutez cette fonction EmailJS avec debug complet dans votre stripe-webhook.js

async function sendWelcomeEmail({ customerEmail, customerName, productType, activationCode, amount }) {
  try {
    console.log('📤 DEBUG EmailJS - Début tentative envoi...');
    console.log('📧 Email destinataire:', customerEmail);
    console.log('👤 Nom client:', customerName);
    console.log('📦 Type produit:', productType);
    console.log('🔑 Code activation:', activationCode);
    
    // Import fetch pour Netlify Functions
    const fetch = require('node-fetch');
    
    // Vérification des clés EmailJS
    console.log('🔑 EMAILJS_SERVICE_ID:', EMAILJS_SERVICE_ID);
    console.log('🔑 EMAILJS_TEMPLATE_ID:', EMAILJS_TEMPLATE_ID);
    console.log('🔑 EMAILJS_PUBLIC_KEY:', EMAILJS_PUBLIC_KEY);
    
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
    
    console.log('📋 Template params complet:', JSON.stringify(templateParams, null, 2));
    console.log('📮 Payload EmailJS complet:', JSON.stringify(emailPayload, null, 2));
    
    // Appel à l'API EmailJS
    console.log('🌐 Appel API EmailJS...');
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload)
    });
    
    console.log('📡 Réponse EmailJS - Status:', response.status);
    console.log('📡 Réponse EmailJS - StatusText:', response.statusText);
    
    if (response.ok) {
      const responseText = await response.text();
      console.log('✅ Email envoyé avec succès via EmailJS');
      console.log('📄 Réponse complète:', responseText);
      return true;
    } else {
      const errorText = await response.text();
      console.error('❌ Erreur EmailJS - Status:', response.status);
      console.error('❌ Erreur EmailJS - StatusText:', response.statusText);
      console.error('❌ Erreur EmailJS - Body:', errorText);
      
      // Essayer de parser l'erreur JSON
      try {
        const errorJson = JSON.parse(errorText);
        console.error('❌ Erreur EmailJS - JSON:', JSON.stringify(errorJson, null, 2));
      } catch (e) {
        console.error('❌ Erreur EmailJS - Raw Text:', errorText);
      }
      
      return false;
    }
    
  } catch (error) {
    console.error('❌ Exception sendWelcomeEmail:', error.name);
    console.error('❌ Message:', error.message);
    console.error('❌ Stack:', error.stack);
    return false;
  }
}
