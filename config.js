// ============================================
// CONFIGURACIÓN FIREBASE
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyDJ39Oc7sLPuk70gT7kkiOzYevyp4Un4o0",
    authDomain: "subastas-bolvia.firebaseapp.com",
    projectId: "subastas-bolvia",
    storageBucket: "subastas-bolvia.firebasestorage.app",
    messagingSenderId: "1099257592438",
    appId: "1:1099257592438:web:cdb3625d2c1c389c5afd57"
};

// ============================================
// INICIALIZAR FIREBASE
// ============================================
let auth, db;

try {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    console.log("✅ Firebase inicializado correctamente");
} catch (error) {
    console.error("❌ Error inicializando Firebase:", error);
    showError("Error de configuración Firebase. Contacta al administrador.");
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================
function showError(message) {
    const statusDiv = document.createElement('div');
    statusDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        background: #DC143C;
        color: white;
        padding: 15px;
        text-align: center;
        z-index: 10000;
        font-weight: bold;
    `;
    statusDiv.textContent = `❌ ${message}`;
    document.body.appendChild(statusDiv);
    
    setTimeout(() => {
        statusDiv.remove();
    }, 5000);
}

// Hacer disponible globalmente
window.firebaseConfig = firebaseConfig;
window.firebaseAuth = auth;
window.firebaseDb = db;
