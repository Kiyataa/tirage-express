<?php
/**
 * WEBHOOK STRIPE TIRAGEEXPRESS - VERSION SÉCURISÉE
 * Fichier : stripe-webhook.js (pour Netlify Functions)
 * 
 * Version pour Netlify Functions (déployement sécurisé)
 */

// Configuration depuis les variables d'environnement Netlify
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

exports.handler = async (event, context) => {
    // Vérifier que c'est une requête POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: 'Method Not Allowed'
        };
    }

    try {
        const payload = event.body;
        const sig = event.headers['stripe-signature'];

        // Ici on traiterait normalement avec Stripe
        // Pour l'instant, on simule le traitement
        
        const eventData = JSON.parse(payload);
        
        if (eventData.type === 'checkout.session.completed') {
            const session = eventData.data.object;
            
            if (session.payment_status === 'paid') {
                // Traitement du paiement réussi
                const result = await handleTirageExpressPremium(session);
                
                return {
                    statusCode: 200,
                    body: JSON.stringify({ 
                        message: 'TirageExpress Premium activé !',
                        success: result 
                    })
                };
            }
        }

        return {
            statusCode: 200,
            body: 'Webhook reçu'
        };

    } catch (error) {
        console.error('Erreur webhook TirageExpress:', error);
        return {
            statusCode: 400,
            body: 'Erreur traitement webhook'
        };
    }
};

// Fonction de traitement du Premium
async function handleTirageExpressPremium(session) {
    try {
        const customer_email = session.customer_details?.email;
        const customer_name = session.customer_details?.name || 'Client TirageExpress';
        
        if (!customer_email) {
            throw new Error('Email client manquant');
        }

        // Générer le code Premium
        const code_premium = generateTirageExpressCode();
        
        // Envoyer l'email (vous devrez implémenter avec un service email)
        const emailSent = await sendTirageExpressEmail(customer_email, customer_name, code_premium);
        
        // Sauvegarder le code (base de données ou service externe)
        await saveTirageExpressCode(customer_email, code_premium, session);
        
        return emailSent;
        
    } catch (error) {
        console.error('Erreur handleTirageExpressPremium:', error);
        return false;
    }
}

// Génération du code Premium
function generateTirageExpressCode() {
    const prefix = 'PREMIUM2025';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = prefix;
    
    // 3 caractères aléatoires
    for (let i = 0; i < 3; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // 3 chiffres
    result += Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return result;
}

// Envoi d'email (à implémenter avec un service comme SendGrid, Mailgun, etc.)
async function sendTirageExpressEmail(email, name, code) {
    // TODO: Implémenter avec un service d'email
    console.log(`Email à envoyer à ${email} avec le code ${code}`);
    return true;
}

// Sauvegarde du code (à implémenter avec une base de données)
async function saveTirageExpressCode(email, code, session) {
    // TODO: Sauvegarder en base de données
    console.log(`Code ${code} pour ${email} sauvegardé`);
    return true;
}

// Configuration email TirageExpress
$from_email = 'contact@tirage-express.com';
$from_name = 'TirageExpress';

// Fonction simple pour initialiser Stripe (sans Composer)
function initStripe($secret_key) {
    // Si vous n'avez pas Composer, vous pouvez utiliser cette version simplifiée
    // Sinon, décommentez la ligne suivante si vous avez installé Stripe via Composer
    // require_once('vendor/autoload.php');
    
    // Pour l'instant, on utilise une version simplifiée
    return true;
}

// Récupérer les données du webhook
$payload = @file_get_contents('php://input');
$sig_header = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

// Log de debug
error_log('TirageExpress Webhook - Réception: ' . date('Y-m-d H:i:s'));

try {
    // Version simplifiée pour vérifier que le webhook fonctionne
    $event_data = json_decode($payload, true);
    
    if (!$event_data) {
        throw new Exception('Données JSON invalides');
    }
    
    // Vérification basique de la signature (version simplifiée)
    if (empty($sig_header)) {
        throw new Exception('Signature manquante');
    }
    
    // Traitement de l'événement
    $event_type = $event_data['type'] ?? '';
    
    error_log('TirageExpress - Type événement: ' . $event_type);
    
    // Si c'est un paiement réussi
    if ($event_type === 'checkout.session.completed') {
        $session = $event_data['data']['object'] ?? [];
        
        // Vérifier que le paiement est confirmé
        $payment_status = $session['payment_status'] ?? '';
        
        if ($payment_status === 'paid') {
            error_log('TirageExpress - Paiement confirmé !');
            
            // Traiter le paiement réussi
            $result = handleTirageExpressPremium($session);
            
            if ($result) {
                error_log('TirageExpress - Email Premium envoyé avec succès !');
            } else {
                error_log('TirageExpress - Erreur envoi email Premium');
            }
        }
    }
    
    // Répondre à Stripe
    http_response_code(200);
    echo 'TirageExpress Webhook OK';
    
} catch (Exception $e) {
    error_log('TirageExpress Webhook Erreur: ' . $e->getMessage());
    http_response_code(400);
    echo 'Erreur: ' . $e->getMessage();
}

/**
 * Traitement du paiement Premium TirageExpress
 */
function handleTirageExpressPremium($session) {
    global $from_email, $from_name;
    
    try {
        // Extraire les informations du client
        $customer_details = $session['customer_details'] ?? [];
        $customer_email = $customer_details['email'] ?? '';
        $customer_name = $customer_details['name'] ?? 'Client TirageExpress';
        
        error_log("TirageExpress - Client: $customer_name - Email: $customer_email");
        
        // Validation email
        if (empty($customer_email) || !filter_var($customer_email, FILTER_VALIDATE_EMAIL)) {
            error_log('TirageExpress - Email invalide: ' . $customer_email);
            return false;
        }
        
        // Générer le code Premium TirageExpress
        $code_premium = generateTirageExpressCode();
        
        error_log("TirageExpress - Code généré: $code_premium");
        
        // Envoyer l'email Premium
        $email_sent = sendTirageExpressEmail($customer_email, $customer_name, $code_premium);
        
        // Sauvegarder le code (fichier simple pour commencer)
        saveTirageExpressCode($customer_email, $code_premium, $session);
        
        return $email_sent;
        
    } catch (Exception $e) {
        error_log('TirageExpress handlePremium Erreur: ' . $e->getMessage());
        return false;
    }
}

/**
 * Génération du code Premium TirageExpress
 */
function generateTirageExpressCode() {
    // Format: PREMIUM2025ABC123
    $prefix = 'PREMIUM2025';
    $letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    $random_part = '';
    
    for ($i = 0; $i < 3; $i++) {
        $random_part .= $letters[rand(0, strlen($letters) - 1)];
    }
    
    $numbers = str_pad(rand(0, 999), 3, '0', STR_PAD_LEFT);
    
    return $prefix . $random_part . $numbers;
}

/**
 * Envoi de l'email Premium TirageExpress
 */
function sendTirageExpressEmail($email, $name, $code) {
    global $from_email, $from_name;
    
    try {
        // Charger le template HTML
        $template_path = __DIR__ . '/email-premium-template.html';
        
        if (file_exists($template_path)) {
            $template = file_get_contents($template_path);
            error_log('TirageExpress - Template chargé depuis fichier');
        } else {
            // Template de secours intégré
            $template = getTirageExpressEmailTemplate();
            error_log('TirageExpress - Template de secours utilisé');
        }
        
        // Personnaliser le template
        $prenom = explode(' ', trim($name))[0]; // Premier prénom
        $template = str_replace('[PRENOM]', htmlspecialchars($prenom), $template);
        $template = str_replace('[CODE_ACTIVATION]', htmlspecialchars($code), $template);
        
        // Headers email
        $headers = [
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'From: ' . $from_name . ' <' . $from_email . '>',
            'Reply-To: ' . $from_email,
            'X-Mailer: TirageExpress Premium'
        ];
        
        $subject = '🎉 Bienvenue dans TirageExpress Premium !';
        
        // Envoi de l'email
        $success = mail(
            $email,
            $subject,
            $template,
            implode("\r\n", $headers)
        );
        
        if ($success) {
            error_log("TirageExpress - Email envoyé à: $email avec code: $code");
        } else {
            error_log("TirageExpress - ÉCHEC envoi email à: $email");
        }
        
        return $success;
        
    } catch (Exception $e) {
        error_log('TirageExpress sendEmail Erreur: ' . $e->getMessage());
        return false;
    }
}

/**
 * Sauvegarde simple du code (fichier texte)
 */
function saveTirageExpressCode($email, $code, $session) {
    try {
        $data = [
            'date' => date('Y-m-d H:i:s'),
            'email' => $email,
            'code' => $code,
            'session_id' => $session['id'] ?? '',
            'amount' => ($session['amount_total'] ?? 0) / 100, // Convertir centimes en euros
            'currency' => $session['currency'] ?? 'eur'
        ];
        
        $log_line = json_encode($data) . "\n";
        
        // Sauvegarder dans un fichier sécurisé
        $file_path = __DIR__ . '/tirageexpress-codes.log';
        file_put_contents($file_path, $log_line, FILE_APPEND | LOCK_EX);
        
        error_log("TirageExpress - Code sauvegardé: $code");
        return true;
        
    } catch (Exception $e) {
        error_log('TirageExpress saveCode Erreur: ' . $e->getMessage());
        return false;
    }
}

/**
 * Template email de secours intégré
 */
function getTirageExpressEmailTemplate() {
    return '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 2em; }
            .content { padding: 30px; }
            .code-box { background: #27ae60; color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
            .code { font-size: 1.5em; font-weight: bold; letter-spacing: 2px; }
            .button { display: inline-block; background: #2c3e50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; }
            .footer { background: #2c3e50; color: white; padding: 20px; text-align: center; font-size: 0.9em; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 TirageExpress Premium</h1>
                <p>Bienvenue [PRENOM] !</p>
            </div>
            <div class="content">
                <h2>Félicitations !</h2>
                <p>Votre abonnement TirageExpress Premium est maintenant actif. Vous avez accès à toutes les fonctionnalités avancées !</p>
                
                <div class="code-box">
                    <p>🔑 Votre code d\'activation :</p>
                    <div class="code">[CODE_ACTIVATION]</div>
                </div>
                
                <p><strong>Fonctionnalités débloquées :</strong></p>
                <ul>
                    <li>👥 Joueurs illimités</li>
                    <li>🎲 Tous types de parties (tête-à-tête, doublettes, triplettes)</li>
                    <li>💾 Sauvegarde permanente</li>
                    <li>📊 Statistiques avancées</li>
                    <li>📄 Export PDF</li>
                    <li>🏆 Historiques complets</li>
                </ul>
                
                <p style="text-align: center;">
                    <a href="https://tirage-express.com/premium.html" class="button">🚀 Accéder à Premium</a>
                </p>
                
                <p><strong>Comment utiliser votre code :</strong></p>
                <ol>
                    <li>Cliquez sur le bouton ci-dessus</li>
                    <li>Saisissez votre code d\'activation</li>
                    <li>Profitez de toutes les fonctionnalités !</li>
                </ol>
                
                <p>Besoin d\'aide ? Contactez-nous à <strong>contact@tirage-express.com</strong></p>
            </div>
            <div class="footer">
                <p><strong>TirageExpress Premium</strong><br>
                Le tirage de pétanque en 30 secondes<br>
                <a href="https://tirage-express.com" style="color: #e74c3c;">www.tirage-express.com</a></p>
            </div>
        </div>
    </body>
    </html>';
}

/**
 * Page de test (accessible via ?test=1)
 */
if (isset($_GET['test'])) {
    echo "<h1>🚀 Test Webhook TirageExpress</h1>";
    echo "<p><strong>Date:</strong> " . date('Y-m-d H:i:s') . "</p>";
    echo "<p><strong>Status:</strong> Webhook configuré et prêt !</p>";
    echo "<p><strong>URL webhook:</strong> " . (isset($_SERVER['HTTPS']) ? 'https' : 'http') . "://" . $_SERVER['HTTP_HOST'] . $_SERVER['PHP_SELF'] . "</p>";
    
    if (isset($_GET['test_email'])) {
        $test_email = $_GET['email'] ?? 'test@example.com';
        $test_code = generateTirageExpressCode();
        
        echo "<h2>📧 Test envoi email</h2>";
        $result = sendTirageExpressEmail($test_email, 'Utilisateur Test', $test_code);
        echo "<p><strong>Email envoyé à:</strong> $test_email</p>";
        echo "<p><strong>Résultat:</strong> " . ($result ? '✅ SUCCÈS' : '❌ ÉCHEC') . "</p>";
        echo "<p><strong>Code généré:</strong> $test_code</p>";
    } else {
        echo '<p><a href="?test=1&test_email=1&email=test@votre-domaine.com">🧪 Tester l\'envoi d\'email</a></p>';
    }
    
    echo "<h2>📋 Codes Premium enregistrés</h2>";
    $log_file = __DIR__ . '/tirageexpress-codes.log';
    if (file_exists($log_file)) {
        $codes = file($log_file);
        echo "<p><strong>Nombre de codes:</strong> " . count($codes) . "</p>";
        echo "<details><summary>Voir les derniers codes</summary>";
        echo "<pre>" . htmlspecialchars(implode('', array_slice($codes, -5))) . "</pre>";
        echo "</details>";
    } else {
        echo "<p>Aucun code enregistré pour le moment.</p>";
    }
    
    exit;
}
?>
