// scripts/set-admin.js
// Utilitaires LOCAL uniquement — PAS inclus dans l'application déployée.
//
// Attribue le custom claim { admin: true } à un utilisateur donné par son UID.
//
// 1) Télécharge la clé de compte de service :
//    Console Firebase → Paramètres du projet → Comptes de service →
//    "Générer une nouvelle clé privée" (un fichier .json est téléchargé).
//    Ne jamais committer cette clé.
//
// 2) Exécute le script avec le chemin de la clé dans GOOGLE_APPLICATION_CREDENTIALS :
//    GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/la-cle.json node scripts/set-admin.js <uid>
//    (Sur Windows PowerShell :
//      $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\chemin\\la-cle.json"; node scripts/set-admin.js <uid>)

const { initializeApp, getApps, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error(
    'Erreur : variable GOOGLE_APPLICATION_CREDENTIALS non définie. ' +
      'Télécharge la clé de compte de service (Console Firebase → Paramètres du projet → Comptes de service).'
  );
  process.exit(1);
}

const uid = process.argv[2];
if (!uid) {
  console.error('Usage : node scripts/set-admin.js <uid>');
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: applicationDefault() });
}

async function main() {
  try {
    const auth = getAuth();
    const user = await auth.getUser(uid);
    await auth.setCustomUserClaims(uid, { admin: true });
    console.log(
      `OK — claims définis pour ${user.email || user.phoneNumber || user.uid} : { admin: true }`
    );
  } catch (err) {
    console.error('Erreur :', err && err.message ? err.message : err);
    process.exit(1);
  }
}

main();
