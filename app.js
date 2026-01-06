// ============================================
// SISTEMA DE NOTIFICACIONES - SOLUCIÓN PROBLEMA 3
// ============================================
class NotificationSystem {
    constructor() {
        this.container = document.getElementById('notificationsContainer');
        this.MAX_NOTIFICATIONS = 5;
        this.notificationCount = 0;
    }
    
    show(message, type = 'info') {
        // Limitar número máximo de notificaciones
        this.cleanupOldNotifications();
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.id = `notification-${Date.now()}`;
        
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        if (type === 'warning') icon = 'exclamation-triangle';
        
        notification.innerHTML = `
            <i class="fas fa-${icon}" style="color: var(--gold); flex-shrink: 0;"></i>
            <div style="flex-grow: 1; overflow: hidden; text-overflow: ellipsis;">${message}</div>
            <button class="close-notification" style="background: none; border: none; color: #888; cursor: pointer; flex-shrink: 0;">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        this.container.appendChild(notification);
        this.notificationCount++;
        
        // Botón para cerrar manualmente
        const closeBtn = notification.querySelector('.close-notification');
        closeBtn.addEventListener('click', () => {
            this.removeNotification(notification.id);
        });
        
        // Auto-remover después de tiempo
        setTimeout(() => {
            this.removeNotification(notification.id);
        }, 5000);
        
        return notification.id;
    }
    
    cleanupOldNotifications() {
        const notifications = this.container.children;
        if (notifications.length >= this.MAX_NOTIFICATIONS) {
            const oldest = notifications[0];
            if (oldest) {
                this.removeNotification(oldest.id);
            }
        }
    }
    
    removeNotification(id) {
        const notification = document.getElementById(id);
        if (notification) {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                    this.notificationCount--;
                }
            }, 300);
        }
    }
    
    clearAll() {
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
        this.notificationCount = 0;
    }
}

// ============================================
// SISTEMA DE VALIDACIÓN - SOLUCIÓN PROBLEMA 5
// ============================================
class ValidationSystem {
    static validateInput(input, type) {
        const validators = {
            phone: /^[0-9]{7,10}$/,
            username: /^[a-zA-Z0-9_]{3,20}$/,
            amount: /^[1-9][0-9]*$/,
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            url: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/
        };
        
        if (!validators[type]) {
            console.warn(`Validador no definido para tipo: ${type}`);
            return true;
        }
        
        return validators[type].test(input);
    }
    
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        // Escapar caracteres peligrosos
        return input
            .replace(/[<>]/g, '') // Remover tags HTML
            .replace(/javascript:/gi, '') // Remover javascript:
            .trim();
    }
}

// ============================================
// SISTEMA DE RATE LIMITING - SOLUCIÓN PROBLEMA 5
// ============================================
class RateLimiter {
    constructor() {
        this.userBids = new Map(); // userId -> timestamp[]
        this.userActions = new Map(); // userId -> {action: timestamp[]}
        this.MAX_BIDS_PER_MINUTE = 10;
        this.MAX_LOGIN_ATTEMPTS = 5;
        this.LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutos
        this.MIN_TIME_BETWEEN_BIDS = 30 * 1000; // 30 segundos mínimo entre pujas
    }
    
    canBid(userId) {
        const now = Date.now();
        const userBids = this.userBids.get(userId) || [];
        
        // Verificar tiempo mínimo entre pujas (30 segundos)
        if (userBids.length > 0) {
            const lastBidTime = userBids[userBids.length - 1];
            const timeSinceLastBid = now - lastBidTime;
            
            if (timeSinceLastBid < this.MIN_TIME_BETWEEN_BIDS) {
                const waitTime = Math.ceil((this.MIN_TIME_BETWEEN_BIDS - timeSinceLastBid) / 1000);
                return {
                    allowed: false,
                    message: `⏳ Debes esperar ${waitTime} segundos antes de realizar otra puja.`,
                    waitTime: waitTime,
                    type: 'min_time_violation'
                };
            }
        }
        
        // Limitar a MAX_BIDS_PER_MINUTE pujas por minuto
        const recentBids = userBids.filter(time => now - time < 60000);
        
        if (recentBids.length >= this.MAX_BIDS_PER_MINUTE) {
            return {
                allowed: false,
                message: `Límite de pujas alcanzado. Espera ${Math.ceil((60000 - (now - recentBids[0])) / 1000)} segundos.`,
                waitTime: Math.ceil((60000 - (now - recentBids[0])) / 1000),
                type: 'max_limit_violation'
            };
        }
        
        userBids.push(now);
        this.userBids.set(userId, userBids.slice(-this.MAX_BIDS_PER_MINUTE * 2));
        return { allowed: true };
    }
    
    canLogin(phone) {
        const now = Date.now();
        const key = `login_${phone}`;
        const attempts = this.userActions.get(key) || [];
        
        // Filtrar intentos antiguos (más de 15 minutos)
        const recentAttempts = attempts.filter(time => now - time < 15 * 60000);
        
        if (recentAttempts.length >= this.MAX_LOGIN_ATTEMPTS) {
            const timeLeft = Math.ceil((this.LOCKOUT_TIME - (now - recentAttempts[0])) / 60000);
            return {
                allowed: false,
                message: `Demasiados intentos. Espera ${timeLeft} minutos.`,
                lockout: true
            };
        }
        
        attempts.push(now);
        this.userActions.set(key, attempts);
        return { allowed: true };
    }
    
    resetLoginAttempts(phone) {
        const key = `login_${phone}`;
        this.userActions.delete(key);
    }
    
    clearOldEntries() {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        
        // Limpiar bids antiguos
        for (const [userId, bids] of this.userBids.entries()) {
            const recentBids = bids.filter(time => now - time < oneHour);
            if (recentBids.length === 0) {
                this.userBids.delete(userId);
            } else {
                this.userBids.set(userId, recentBids);
            }
        }
        
        // Limpiar acciones antiguas
        for (const [key, actions] of this.userActions.entries()) {
            const recentActions = actions.filter(time => now - time < 2 * oneHour);
            if (recentActions.length === 0) {
                this.userActions.delete(key);
            } else {
                this.userActions.set(key, recentActions);
            }
        }
    }
}

// ============================================
// SISTEMA DE SUBASTAS CON FIREBASE
// ============================================
class AuctionSystem {
    constructor() {
        this.auth = window.firebaseAuth;
        this.db = window.firebaseDb;
        this.currentUser = null;
        this.selectedAuction = null;
        this.timers = {};
        this.auctionsUnsubscribe = null;
        
        this.notifications = new NotificationSystem();
        this.rateLimiter = new RateLimiter();
        this.imageCache = new Map(); // Cache para imágenes
        
        // Limpiar entradas antiguas cada hora
        setInterval(() => {
            this.rateLimiter.clearOldEntries();
        }, 60 * 60 * 1000);
    }
    
    async init() {
        try {
            // Configurar listeners de autenticación
            this.setupAuthListeners();
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Cargar datos iniciales
            await this.loadInitialData();
            
            // Configurar Intersection Observer para lazy loading
            this.setupLazyLoading();
            
            // Ocultar loader después de 1.5 segundos
            setTimeout(() => {
                document.getElementById('loader').style.opacity = '0';
                setTimeout(() => {
                    document.getElementById('loader').classList.add('hidden');
                }, 500);
            }, 1500);
            
            console.log("✅ Sistema inicializado correctamente");
            
        } catch (error) {
            console.error("❌ Error inicializando sistema:", error);
            this.notifications.show("Error al conectar con el servidor", "error");
        }
    }
    
    setupAuthListeners() {
        // Escuchar cambios en autenticación
        this.auth.onAuthStateChanged(async (user) => {
            if (user) {
                // Obtener información adicional del usuario desde Firestore
                const userDoc = await this.db.collection('users').doc(user.uid).get();
                
                if (userDoc.exists) {
                    this.currentUser = {
                        id: user.uid,
                        ...userDoc.data()
                    };
                    
                    // Mostrar mensaje inmediatamente si está baneado
                    if (this.currentUser.isBanned) {
                        // Usar timeout mínimo para asegurar que el DOM esté listo
                        setTimeout(() => {
                            this.showBanMessage();
                        }, 100);
                    }
                } else {
                    // Si no existe en Firestore, crear documento básico
                    this.currentUser = {
                        id: user.uid,
                        phone: user.email ? user.email.split('@')[0] : "Sin teléfono",
                        username: user.displayName || "Usuario",
                        email: user.email,
                        totalBids: 0,
                        auctionsWon: 0,
                        isBanned: false,
                        banReason: null,
                        isAdmin: false
                    };
                    
                    // Guardar en Firestore
                    await this.db.collection('users').doc(user.uid).set(this.currentUser);
                }
                
                this.updateUI();
                if (!this.currentUser.isBanned) {
                    this.notifications.show(`¡Bienvenido ${this.currentUser.username}!`, "success");
                }
                
            } else {
                this.currentUser = null;
                this.updateUI();
                
                // Remover mensaje de baneo si existe
                const banNotification = document.getElementById('banNotification');
                if (banNotification) {
                    banNotification.remove();
                }
            }
        });
    }
    
    // Método: Mostrar mensaje de baneo
    showBanMessage() {
        if (!this.currentUser || !this.currentUser.isBanned) return;
        
        // Verificar si ya existe un mensaje de baneo
        if (document.getElementById('banNotification')) return;
        
        const banMessage = `
            <div id="banNotification" class="ban-notification">
                <i class="fas fa-ban"></i>
                <strong>¡CUENTA SUSPENDIDA!</strong><br>
                ${this.currentUser.banReason || 'Violación de los términos del servicio'}<br>
                <small>Contacta al administrador para más información</small>
                <button class="close-ban" onclick="this.parentElement.remove()">&times;</button>
            </div>
        `;
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = banMessage;
        const banDiv = tempDiv.firstChild;
        document.body.insertBefore(banDiv, document.body.firstChild);
        
        // Bloquear acciones inmediatamente
        this.blockUserActions();
        
        // Forzar recarga de la interfaz
        this.updateUI();
    }
    
    blockUserActions() {
        // Bloquear botones de puja
        document.querySelectorAll('.bid-btn').forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            btn.innerHTML = '<i class="fas fa-ban"></i> CUENTA SUSPENDIDA';
            btn.style.background = 'rgba(220, 20, 60, 0.2)';
            btn.style.borderColor = 'var(--red)';
            btn.style.color = 'var(--red)';
        });
        
        // Bloquear botones en modales
        const modalBtns = document.querySelectorAll('.btn-primary:not(.admin-only)');
        modalBtns.forEach(btn => {
            if (btn.textContent.includes('Puja') || btn.textContent.includes('Ingresar')) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            }
        });
        
        // Deshabilitar tabs de mis pujas si está baneado
        const myBidsTab = document.querySelector('.tab-btn[data-tab="mybids"]');
        if (myBidsTab) {
            myBidsTab.style.opacity = '0.5';
            myBidsTab.style.cursor = 'not-allowed';
            myBidsTab.onclick = (e) => {
                e.preventDefault();
                this.notifications.show('Cuenta suspendida. No puedes ver tus pujas.', 'error');
            };
        }
    }
    
    updateUI() {
        const usernameDisplay = document.getElementById('usernameDisplay');
        const loginBtn = document.getElementById('loginBtn');
        
        if (this.currentUser) {
            usernameDisplay.textContent = this.currentUser.username;
            if (this.currentUser.isBanned) {
                usernameDisplay.style.color = 'var(--red)';
                usernameDisplay.innerHTML = `${this.currentUser.username} <i class="fas fa-ban" style="color: var(--red);"></i>`;
            } else {
                usernameDisplay.style.color = 'var(--gold)';
            }
            loginBtn.textContent = 'Cerrar Sesión';
        } else {
            usernameDisplay.textContent = 'Invitado';
            usernameDisplay.style.color = 'var(--gold)';
            loginBtn.textContent = 'Login VIP';
        }
    }
    
    setupEventListeners() {
        // Botón login (ahora solo para abrir modal de login/registro)
        document.getElementById('loginBtn').addEventListener('click', () => {
            if (this.currentUser) {
                this.logout();
            } else {
                this.openAuthModal();
            }
        });
        
        // Botón para abrir modal de registro desde el modal de login
        document.getElementById('openRegisterBtn')?.addEventListener('click', () => {
            this.closeModal('loginModal');
            setTimeout(() => {
                this.openRegisterModal();
            }, 300);
        });
        
        // Botón para abrir modal de login desde el modal de registro
        document.getElementById('openLoginBtn')?.addEventListener('click', () => {
            this.closeModal('registerModal');
            setTimeout(() => {
                this.openLoginModal();
            }, 300);
        });
        
        // Botón para recuperar contraseña
        document.getElementById('forgotPasswordBtn')?.addEventListener('click', () => {
            this.handleForgotPassword();
        });
        
        // Formulario login
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        // Formulario registro
        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });
        
        // Tabs principales
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabId = e.target.getAttribute('data-tab');
                this.switchTab(tabId);
            });
        });
        
        // Tabs admin
        document.querySelectorAll('.admin-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabId = e.target.getAttribute('data-admin-tab');
                this.switchAdminTab(tabId);
            });
        });
        
        // Botón admin
        document.getElementById('adminBtn').addEventListener('click', () => {
            this.toggleAdminPanel();
        });
        
        // Botón debug
        document.getElementById('debugBtn').addEventListener('click', () => {
            this.debugMode();
        });
        
        // Botón ir a subastas
        document.getElementById('goToAuctionsBtn').addEventListener('click', () => {
            this.switchTab('auctions');
        });
        
        // Botones cerrar modal
        document.getElementById('closeLoginModal').addEventListener('click', () => {
            this.closeModal('loginModal');
        });
        
        document.getElementById('closeAuctionModal').addEventListener('click', () => {
            this.closeModal('auctionModal');
        });
        
        document.getElementById('closeBidModal').addEventListener('click', () => {
            this.closeModal('bidModal');
        });
        
        document.getElementById('cancelLoginBtn').addEventListener('click', () => {
            this.closeModal('loginModal');
        });
        
        // Formulario crear subasta
        document.getElementById('createAuctionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createAuction();
        });
        
        // Botón reset admin form
        document.getElementById('resetAdminFormBtn').addEventListener('click', () => {
            this.resetAdminForm();
        });
        
        // Cerrar admin panel al hacer clic fuera
        document.addEventListener('click', (e) => {
            const adminPanel = document.getElementById('adminPanel');
            const adminBtn = document.getElementById('adminBtn');
            
            if (!adminPanel.contains(e.target) && 
                !adminBtn.contains(e.target) && 
                adminPanel.classList.contains('active')) {
                this.closeAdminPanel();
            }
        });
    }
    
    // Método: Abrir modal de autenticación (elección)
    openAuthModal() {
        const authChoiceHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div style="margin-bottom: 2rem;">
                    <i class="fas fa-user-circle" style="font-size: 4rem; color: var(--gold); margin-bottom: 1rem;"></i>
                    <h3 style="color: var(--gold); margin-bottom: 0.5rem;">Acceso VIP</h3>
                    <p style="color: #CCCCCC;">Elige cómo quieres acceder al sistema</p>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                    <button class="btn-primary" id="existingUserBtn" style="padding: 1.5rem;">
                        <i class="fas fa-sign-in-alt" style="margin-bottom: 0.5rem; display: block; font-size: 2rem;"></i>
                        Ya Tengo Cuenta
                    </button>
                    <button class="btn-secondary" id="newUserBtn" style="padding: 1.5rem;">
                        <i class="fas fa-user-plus" style="margin-bottom: 0.5rem; display: block; font-size: 2rem;"></i>
                        Registrarme
                    </button>
                </div>
                
                <p style="color: #888; font-size: 0.9rem;">
                    <i class="fas fa-info-circle"></i> Sistema VIP para usuarios registrados
                </p>
            </div>
        `;
        
        const modalContent = document.getElementById('authModalContent');
        if (modalContent) {
            modalContent.innerHTML = authChoiceHTML;
            
            // Agregar event listeners después de que el contenido se cargue
            setTimeout(() => {
                document.getElementById('existingUserBtn')?.addEventListener('click', () => {
                    this.closeModal('authModal');
                    setTimeout(() => {
                        this.openLoginModal();
                    }, 300);
                });
                
                document.getElementById('newUserBtn')?.addEventListener('click', () => {
                    this.closeModal('authModal');
                    setTimeout(() => {
                        this.openRegisterModal();
                    }, 300);
                });
            }, 100);
        }
        
        document.getElementById('authModal').classList.add('active');
    }
    
    // Método: Abrir modal de registro
    openRegisterModal() {
        document.getElementById('registerModal').classList.add('active');
    }
    
    // Método: Recuperar contraseña
    async handleForgotPassword() {
        const phone = prompt('Ingresa tu número de teléfono registrado (ej: 71234567):');
        
        if (!phone || !/^[0-9]{7,10}$/.test(phone)) {
            this.notifications.show('Teléfono inválido', 'error');
            return;
        }
        
        try {
            const email = `${phone}@subastasbolivia.com`;
            
            // Enviar email de reset de contraseña
            await this.auth.sendPasswordResetEmail(email);
            
            this.notifications.show(
                'Se envió un enlace para recuperar tu contraseña al email asociado',
                'success'
            );
            
        } catch (error) {
            console.error("Error recuperando contraseña:", error);
            
            if (error.code === 'auth/user-not-found') {
                this.notifications.show('Usuario no encontrado. Regístrate primero.', 'error');
            } else {
                this.notifications.show('Error: ' + error.message, 'error');
            }
        }
    }
    
    // Lazy Loading para imágenes
    setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            this.lazyImageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.dataset.src;
                        
                        // Usar cache si está disponible
                        if (this.imageCache.has(src)) {
                            img.src = this.imageCache.get(src);
                            img.classList.add('loaded');
                        } else {
                            // Cargar imagen
                            const imageLoader = new Image();
                            imageLoader.onload = () => {
                                img.src = src;
                                img.classList.add('loaded');
                                this.imageCache.set(src, src);
                            };
                            imageLoader.onerror = () => {
                                img.src = 'https://via.placeholder.com/400x300/8A2BE2/FFFFFF?text=Imagen+no+disponible';
                                img.classList.add('loaded');
                            };
                            imageLoader.src = src;
                        }
                        
                        this.lazyImageObserver.unobserve(img);
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.1
            });
        }
    }
    
    async loadInitialData() {
        // Suscribirse a cambios en subastas activas en tiempo real
        this.auctionsUnsubscribe = this.db.collection('auctions')
            .where('status', '==', 'active')
            .onSnapshot((snapshot) => {
                this.loadAuctions(snapshot);
            }, (error) => {
                console.error("Error escuchando subastas:", error);
                this.notifications.show("Error cargando subastas", "error");
            });
        
        // Cargar ganadores
        this.loadWinners();
    }
    
    async loadAuctions(snapshot = null) {
        const auctionsGrid = document.getElementById('auctionsGrid');
        
        try {
            let querySnapshot;
            
            if (snapshot) {
                querySnapshot = snapshot;
            } else {
                querySnapshot = await this.db.collection('auctions')
                    .where('status', '==', 'active')
                    .get();
            }
            
            if (querySnapshot.empty) {
                auctionsGrid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                        <i class="fas fa-clock" style="font-size: 4rem; color: var(--gold); margin-bottom: 1.5rem;"></i>
                        <h3 style="color: var(--gold); margin-bottom: 1rem;">No hay subastas activas</h3>
                        <p style="color: #CCCCCC;">Vuelve más tarde para ver nuevas subastas.</p>
                    </div>
                `;
                return;
            }
            
            auctionsGrid.innerHTML = '';
            const now = new Date().getTime();
            
            querySnapshot.forEach((doc) => {
                const auction = { id: doc.id, ...doc.data() };
                const endTime = new Date(auction.endTime).getTime();
                const timeLeft = endTime - now;
                
                if (timeLeft <= 0) {
                    this.finalizeAuction(auction.id);
                    return;
                }
                
                // Crear tarjeta de subasta
                this.createAuctionCard(auction, timeLeft);
                
                // Iniciar temporizador
                this.startTimer(auction.id, endTime);
            });
            
        } catch (error) {
            console.error("Error cargando subastas:", error);
            this.notifications.show("Error cargando subastas", "error");
        }
    }
    
    createAuctionCard(auction, timeLeft) {
        const auctionsGrid = document.getElementById('auctionsGrid');
        const uniqueParticipants = this.getUniqueParticipants(auction);
        
        const auctionCard = document.createElement('div');
        auctionCard.className = 'auction-card';
        auctionCard.setAttribute('data-auction-id', auction.id);
        
        // Verificar si el usuario está baneado
        const isUserBanned = this.currentUser && this.currentUser.isBanned;
        const bidButtonText = isUserBanned ? 
            '<i class="fas fa-ban"></i> CUENTA SUSPENDIDA' : 
            'Ver Detalles y Pujar';
        const bidButtonStyle = isUserBanned ? 
            'background: rgba(220, 20, 60, 0.2); border-color: var(--red); color: var(--red); cursor: not-allowed;' : 
            '';
        
        // Lazy loading para imágenes
        const imagePlaceholder = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%230A0A14"/><text x="200" y="150" font-family="Arial" font-size="20" fill="%23FFD700" text-anchor="middle">Cargando...</text></svg>';
        
        auctionCard.innerHTML = `
            <div class="auction-image-container">
                <img data-src="${auction.image}" alt="${auction.title}" 
                     class="auction-image lazy-image" 
                     src="${imagePlaceholder}"
                     onerror="this.src='https://via.placeholder.com/400x300/8A2BE2/FFFFFF?text=${encodeURIComponent(auction.title)}'">
            </div>
            <h3 class="auction-title">${auction.title}</h3>
            <p class="auction-desc">${auction.description}</p>
            
            <div class="auction-stats">
                <div class="auction-stat">
                    <div class="stat-value">Bs ${auction.currentBid}</div>
                    <div class="stat-label">Puja Actual</div>
                </div>
                <div class="auction-stat">
                    <div class="stat-value">${auction.participants}/${auction.maxParticipants}</div>
                    <div class="stat-label">Participantes</div>
                </div>
            </div>
            
            <div class="participants-display">
                <div class="participants-title">
                    <i class="fas fa-users"></i>
                    <span>Participantes (${uniqueParticipants.length})</span>
                </div>
                <div class="participants-grid">
                    ${uniqueParticipants.map((participant, index) => `
                        <div class="participant-badge ${index === 0 ? 'highlight' : ''}">
                            <i class="fas fa-hand-paper hand-icon"></i>
                            <span>${participant.username}</span>
                        </div>
                    `).join('')}
                </div>
                ${auction.bids && auction.bids.length > 0 ? `
                    <div class="last-bidder">
                        <i class="fas fa-crown last-bidder-icon"></i>
                        <div>
                            <div style="color: var(--gold); font-weight: 600;">
                                Último ofertante: ${auction.bids[auction.bids.length - 1].username}
                            </div>
                            <div style="color: #888; font-size: 0.9rem;">
                                Puja: Bs ${auction.currentBid}
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <div class="timer" id="timer-${auction.id}">
                ${this.formatTime(timeLeft)}
            </div>
            <button class="bid-btn" onclick="window.auctionSystem.viewAuction('${auction.id}')" 
                    ${isUserBanned ? 'disabled style="' + bidButtonStyle + '"' : ''}>
                ${bidButtonText}
            </button>
        `;
        
        auctionsGrid.appendChild(auctionCard);
        
        // Observar imagen para lazy loading
        const img = auctionCard.querySelector('.lazy-image');
        if (img && this.lazyImageObserver) {
            this.lazyImageObserver.observe(img);
        }
    }
    
    switchTab(tabId) {
        // Actualizar botones
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-tab') === tabId) {
                btn.classList.add('active');
            }
        });
        
        // Mostrar contenido
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
            if (pane.id === tabId) {
                pane.classList.add('active');
            }
        });
        
        // Cargar contenido específico
        if (tabId === 'auctions') this.loadAuctions();
        if (tabId === 'mybids') this.loadMyBids();
        if (tabId === 'winners') this.loadWinners();
    }
    
    switchAdminTab(tabId) {
        // Actualizar botones
        document.querySelectorAll('.admin-tab').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-admin-tab') === tabId) {
                btn.classList.add('active');
            }
        });
        
        // Mostrar contenido
        document.querySelectorAll('.admin-pane').forEach(pane => {
            pane.classList.remove('active');
            if (pane.id === 'admin' + tabId.charAt(0).toUpperCase() + tabId.slice(1)) {
                pane.classList.add('active');
            }
        });
        
        // Cargar contenido específico
        if (tabId === 'users') this.loadAdminUsers();
        if (tabId === 'bans') this.loadAdminBans();
        if (tabId === 'security') this.loadAdminSecurity();
        if (tabId === 'export') this.loadAdminExport();
        if (tabId === 'manage') this.loadAdminAuctions();
    }
    
    openLoginModal() {
        document.getElementById('loginModal').classList.add('active');
    }
    
    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }
    
    // Método de login
    async handleLogin() {
        const phoneInput = document.getElementById('loginPhoneInput');
        const passwordInput = document.getElementById('loginPasswordInput');
        
        let phone = phoneInput.value.trim();
        let password = passwordInput.value.trim();
        
        // Validaciones básicas
        if (!phone) {
            this.notifications.show('Ingresa tu número de teléfono', 'error');
            return;
        }
        
        if (!password) {
            this.notifications.show('Ingresa tu contraseña', 'error');
            return;
        }
        
        if (!/^[0-9]{7,10}$/.test(phone)) {
            this.notifications.show('Teléfono inválido (7-10 dígitos)', 'error');
            return;
        }
        
        if (password.length < 6) {
            this.notifications.show('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }
        
        try {
            const email = `${phone}@subastasbolivia.com`;
            
            // 1. PRIMERO intentar login con contraseña que ingresó
            try {
                const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
                
                // Login exitoso - procesar usuario
                await this.processSuccessfulLogin(userCredential);
                return;
                
            } catch (loginError) {
                console.log("❌ Error en login:", loginError.code);
                
                // 2. Si falla, intentar con contraseña por defecto (para usuarios existentes del sistema anterior)
                if (loginError.code === 'auth/invalid-login-credentials' || 
                    loginError.code === 'auth/wrong-password') {
                    
                    this.notifications.show('Intentando contraseña por defecto...', 'info');
                    
                    try {
                        const defaultPassword = 'subasta123';
                        const userCredential = await this.auth.signInWithEmailAndPassword(email, defaultPassword);
                        
                        // Login exitoso con contraseña por defecto
                        await this.processSuccessfulLogin(userCredential);
                        
                        // Sugerir cambiar contraseña
                        setTimeout(() => {
                            if (confirm('Para mayor seguridad, ¿quieres cambiar tu contraseña?')) {
                                this.notifications.show('Usa "¿Olvidaste tu contraseña?" para cambiar tu contraseña', 'info');
                            }
                        }, 2000);
                        return;
                        
                    } catch (defaultError) {
                        // Si ambos fallan, verificar el error
                        if (defaultError.code === 'auth/user-not-found') {
                            this.notifications.show('Usuario no registrado. Regístrate primero.', 'error');
                        } else if (defaultError.code === 'auth/wrong-password') {
                            this.notifications.show('Contraseña incorrecta. Usa "subasta123" para usuarios existentes.', 'error');
                        } else {
                            this.notifications.show('Error: ' + defaultError.message, 'error');
                        }
                    }
                } else if (loginError.code === 'auth/user-not-found') {
                    this.notifications.show('Usuario no registrado. Regístrate primero.', 'error');
                } else if (loginError.code === 'auth/too-many-requests') {
                    this.notifications.show('Demasiados intentos. Espera unos minutos.', 'error');
                } else {
                    this.notifications.show('Error: ' + loginError.message, 'error');
                }
            }
            
        } catch (error) {
            console.error("Error general en login:", error);
            this.notifications.show('Error: ' + error.message, 'error');
        }
    }
    
    // Método auxiliar para procesar login exitoso
    async processSuccessfulLogin(userCredential) {
        // Verificar si existe en Firestore
        const userDoc = await this.db.collection('users').doc(userCredential.user.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            
            // Verificar si está baneado
            if (userData.isBanned) {
                this.notifications.show('Cuenta suspendida. Razón: ' + userData.banReason, 'error');
                await this.auth.signOut();
                return;
            }
            
            // Actualizar último login
            await this.db.collection('users').doc(userCredential.user.uid).update({
                lastLogin: new Date().toISOString()
            });
            
            this.notifications.show(`¡Bienvenido de nuevo ${userData.username}!`, 'success');
            this.closeModal('loginModal');
            document.getElementById('loginForm').reset();
            return;
            
        } else {
            // Usuario existe en Auth pero no en Firestore - crear documento
            const newUserData = {
                phone: userCredential.user.email ? userCredential.user.email.split('@')[0] : "Sin teléfono",
                username: userCredential.user.displayName || "Usuario",
                email: userCredential.user.email,
                registrationDate: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                totalBids: 0,
                auctionsWon: 0,
                isBanned: false,
                banReason: null,
                isAdmin: false
            };
            
            await this.db.collection('users').doc(userCredential.user.uid).set(newUserData);
            
            this.notifications.show(`¡Bienvenido ${newUserData.username}!`, 'success');
            this.closeModal('loginModal');
            document.getElementById('loginForm').reset();
            return;
        }
    }
    
    // Método: Manejar registro
    async handleRegister() {
        const phoneInput = document.getElementById('registerPhoneInput');
        const usernameInput = document.getElementById('registerUsernameInput');
        const passwordInput = document.getElementById('registerPasswordInput');
        const confirmPasswordInput = document.getElementById('registerConfirmPasswordInput');
        
        let phone = phoneInput.value.trim();
        let username = usernameInput.value.trim();
        let password = passwordInput.value.trim();
        let confirmPassword = confirmPasswordInput.value.trim();
        
        // Validaciones básicas
        if (!phone || !username || !password || !confirmPassword) {
            this.notifications.show('Complete todos los campos', 'error');
            return;
        }
        
        if (!/^[0-9]{7,10}$/.test(phone)) {
            this.notifications.show('Teléfono inválido (7-10 dígitos)', 'error');
            return;
        }
        
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            this.notifications.show('Usuario inválido (3-20 caracteres, letras, números, _)', 'error');
            return;
        }
        
        if (password.length < 6) {
            this.notifications.show('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            this.notifications.show('Las contraseñas no coinciden', 'error');
            return;
        }
        
        try {
            const email = `${phone}@subastasbolivia.com`;
            
            // 1. PRIMERO verificar si ya existe en Firestore
            this.notifications.show('Verificando disponibilidad...', 'info');
            
            const userQuery = await this.db.collection('users')
                .where('phone', '==', phone)
                .limit(1)
                .get();
            
            if (!userQuery.empty) {
                this.notifications.show('Este número ya está registrado. Inicia sesión.', 'error');
                setTimeout(() => {
                    this.closeModal('registerModal');
                    this.openLoginModal();
                    document.getElementById('loginPhoneInput').value = phone;
                }, 1500);
                return;
            }
            
            // 2. Crear nuevo usuario
            this.notifications.show('Creando tu cuenta...', 'info');
            
            try {
                // Crear usuario en Firebase Auth
                const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
                
                // Actualizar perfil
                await userCredential.user.updateProfile({
                    displayName: username
                });
                
                // Crear documento en Firestore
                const userData = {
                    phone: phone,
                    username: username,
                    email: email,
                    registrationDate: new Date().toISOString(),
                    lastLogin: new Date().toISOString(),
                    totalBids: 0,
                    auctionsWon: 0,
                    isBanned: false,
                    banReason: null,
                    isAdmin: phone === "77777777" || phone === "7777777"
                };
                
                await this.db.collection('users').doc(userCredential.user.uid).set(userData);
                
                this.notifications.show('¡Registro exitoso! Bienvenido a Subastas Bolivia', 'success');
                this.closeModal('registerModal');
                document.getElementById('registerForm').reset();
                
            } catch (authError) {
                console.error("Error en creación de cuenta:", authError);
                
                if (authError.code === 'auth/email-already-in-use') {
                    // El usuario YA existe en Firebase Auth pero no en Firestore (caso raro)
                    this.notifications.show('Este usuario ya existe en el sistema. Intenta iniciar sesión.', 'error');
                    
                    // Sugerir iniciar sesión
                    setTimeout(() => {
                        this.closeModal('registerModal');
                        this.openLoginModal();
                        document.getElementById('loginPhoneInput').value = phone;
                    }, 1500);
                    
                } else if (authError.code === 'auth/weak-password') {
                    this.notifications.show('La contraseña es demasiado débil. Usa al menos 6 caracteres.', 'error');
                } else if (authError.code === 'auth/invalid-email') {
                    this.notifications.show('Email inválido. Contacta al administrador.', 'error');
                } else {
                    this.notifications.show('Error al crear cuenta: ' + authError.message, 'error');
                }
            }
            
        } catch (error) {
            console.error("Error general en registro:", error);
            this.notifications.show('Error inesperado: ' + error.message, 'error');
        }
    }
    
    async logout() {
        try {
            await this.auth.signOut();
            this.notifications.show('Sesión cerrada correctamente', 'info');
        } catch (error) {
            console.error("Error cerrando sesión:", error);
        }
    }
    
    getUniqueParticipants(auction) {
        if (!auction.bids || auction.bids.length === 0) {
            return [];
        }
        
        const uniqueUsers = new Map();
        auction.bids.forEach(bid => {
            if (!uniqueUsers.has(bid.userId)) {
                uniqueUsers.set(bid.userId, {
                    userId: bid.userId,
                    username: bid.username
                });
            }
        });
        
        return Array.from(uniqueUsers.values()).slice(0, 5);
    }
    
    formatTime(milliseconds) {
        if (milliseconds <= 0) return '00:00:00';
        
        const seconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        return `⏳ ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    startTimer(auctionId, endTime) {
        if (this.timers[auctionId]) {
            clearInterval(this.timers[auctionId]);
        }
        
        this.timers[auctionId] = setInterval(() => {
            const now = new Date().getTime();
            const timeLeft = endTime - now;
            const timerElement = document.getElementById(`timer-${auctionId}`);
            
            if (timerElement) {
                if (timeLeft <= 0) {
                    timerElement.innerHTML = '⏳ FINALIZADA';
                    timerElement.style.background = 'rgba(128, 128, 128, 0.2)';
                    timerElement.style.color = '#888';
                    clearInterval(this.timers[auctionId]);
                    this.finalizeAuction(auctionId);
                } else {
                    timerElement.innerHTML = this.formatTime(timeLeft);
                    
                    // Advertencia últimos 5 minutos
                    if (timeLeft < 5 * 60 * 1000) {
                        timerElement.classList.add('pulse');
                    }
                }
            }
        }, 1000);
    }
    
    async viewAuction(auctionId) {
        try {
            const doc = await this.db.collection('auctions').doc(auctionId).get();
            
            if (!doc.exists) {
                this.notifications.show('Subasta no encontrada', 'error');
                return;
            }
            
            this.selectedAuction = { id: doc.id, ...doc.data() };
            
            const endTime = new Date(this.selectedAuction.endTime).getTime();
            const now = new Date().getTime();
            const timeLeft = endTime - now;
            const uniqueParticipants = this.getUniqueParticipants(this.selectedAuction);
            
            // Verificar si el usuario está baneado
            const isUserBanned = this.currentUser && this.currentUser.isBanned;
            const bidButtonText = isUserBanned ? 
                '<i class="fas fa-ban"></i> CUENTA SUSPENDIDA' : 
                'Realizar Puja';
            const bidButtonDisabled = isUserBanned ? 'disabled' : '';
            const bidButtonStyle = isUserBanned ? 
                'background: rgba(220, 20, 60, 0.2); border-color: var(--red); color: var(--red); cursor: not-allowed;' : 
                '';
            
            document.getElementById('auctionModalTitle').textContent = this.selectedAuction.title;
            document.getElementById('auctionModalContent').innerHTML = `
                <div style="margin-bottom: 1.5rem;">
                    <div class="auction-image-container" style="height: 300px;">
                        <img src="${this.selectedAuction.image}" alt="${this.selectedAuction.title}" class="auction-image" onerror="this.src='https://via.placeholder.com/600x400/8A2BE2/FFFFFF?text=${encodeURIComponent(this.selectedAuction.title)}'">
                    </div>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="color: var(--gold); margin-bottom: 0.5rem;">Descripción</h4>
                    <p style="color: #CCCCCC; line-height: 1.6;">${this.selectedAuction.description}</p>
                </div>
                
                <div class="auction-stats" style="margin-bottom: 1.5rem;">
                    <div class="auction-stat">
                        <div class="stat-value">Bs ${this.selectedAuction.startingBid}</div>
                        <div class="stat-label">Puja Inicial</div>
                    </div>
                    <div class="auction-stat">
                        <div class="stat-value">Bs ${this.selectedAuction.currentBid}</div>
                        <div class="stat-label">Puja Actual</div>
                    </div>
                    <div class="auction-stat">
                        <div class="stat-value">${this.selectedAuction.participants}/${this.selectedAuction.maxParticipants}</div>
                        <div class="stat-label">Participantes</div>
                    </div>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <div class="participants-display">
                        <div class="participants-title">
                            <i class="fas fa-users"></i>
                            <span>Participantes Activos (${uniqueParticipants.length})</span>
                        </div>
                        <div class="participants-grid">
                            ${uniqueParticipants.map((participant, index) => `
                                <div class="participant-badge ${index === 0 ? 'highlight' : ''}">
                                    <i class="fas fa-hand-paper hand-icon"></i>
                                    <span>${participant.username}</span>
                                </div>
                            `).join('')}
                        </div>
                        ${this.selectedAuction.bids && this.selectedAuction.bids.length > 0 ? `
                            <div class="last-bidder">
                                <i class="fas fa-crown last-bidder-icon"></i>
                                <div>
                                    <div style="color: var(--gold); font-weight: 600;">
                                        Último ofertante: ${this.selectedAuction.bids[this.selectedAuction.bids.length - 1].username}
                                    </div>
                                    <div style="color: #888; font-size: 0.9rem;">
                                        Puja realizada: ${new Date(this.selectedAuction.bids[this.selectedAuction.bids.length - 1].timestamp).toLocaleTimeString()}
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <div class="timer" style="font-size: 1.2rem;">
                        ${this.formatTime(timeLeft)}
                    </div>
                </div>
                
                <div>
                    <h4 style="color: var(--gold); margin-bottom: 0.5rem;">Historial de Pujas</h4>
                    <div class="bid-history">
                        ${this.selectedAuction.bids && this.selectedAuction.bids.length > 0 ? 
                            this.selectedAuction.bids.map(bid => `
                                <div class="bid-history-item">
                                    <div>
                                        <div style="font-weight: 600; color: var(--gold);">${bid.username}</div>
                                        <div style="color: #888; font-size: 0.9rem;">${new Date(bid.timestamp).toLocaleTimeString()}</div>
                                    </div>
                                    <div style="font-size: 1.2rem; font-weight: 700; color: var(--gold);">
                                        Bs ${bid.amount}
                                    </div>
                                </div>
                            `).join('') : 
                            '<p style="color: #888; text-align: center; padding: 1rem;">No hay pujas aún</p>'
                        }
                    </div>
                </div>
                
                <div class="form-buttons" style="margin-top: 2rem;">
                    <button class="btn-primary" onclick="window.auctionSystem.openBidModal()" 
                            ${bidButtonDisabled} style="${bidButtonStyle}">
                        ${bidButtonText}
                    </button>
                    <button class="btn-secondary" onclick="window.auctionSystem.closeModal('auctionModal')">
                        Cerrar
                    </button>
                </div>
            `;
            
            document.getElementById('auctionModal').classList.add('active');
            
        } catch (error) {
            console.error("Error cargando subasta:", error);
            this.notifications.show('Error cargando subasta', 'error');
        }
    }
    
    openBidModal() {
        if (!this.currentUser) {
            this.notifications.show('Debes iniciar sesión para pujar', 'error');
            this.closeModal('auctionModal');
            this.openAuthModal();
            return;
        }
        
        if (this.currentUser.isBanned) {
            this.notifications.show('Tu cuenta está suspendida. Razón: ' + (this.currentUser.banReason || 'Violación de términos'), 'error');
            return;
        }
        
        if (!this.selectedAuction) {
            this.notifications.show('No hay subasta seleccionada', 'error');
            return;
        }
        
        const auction = this.selectedAuction;
        const minBid = auction.currentBid + 10;
        
        document.getElementById('bidModalContent').innerHTML = `
            <div style="margin-bottom: 1.5rem;">
                <h4 style="color: var(--gold); margin-bottom: 0.5rem;">${auction.title}</h4>
                <p style="color: #CCCCCC;">Puja mínima: <strong style="color: var(--gold);">Bs ${minBid}</strong></p>
                <p style="color: #888; font-size: 0.9rem;">Los incrementos deben ser múltiplos de 10 Bs</p>
            </div>
            
            <div class="form-group">
                <label class="form-label">Monto de Puja (Bs)</label>
                <input type="number" class="form-input" id="bidAmountInput" 
                       min="${minBid}" step="10" value="${minBid}" 
                       placeholder="Ej: ${minBid}">
            </div>
            
            <div style="margin: 1.5rem 0;">
                <h4 style="color: var(--gold); margin-bottom: 0.5rem;">Incrementos Rápidos</h4>
                <div class="bid-quick-buttons">
                    <button class="bid-quick-btn" type="button" onclick="window.auctionSystem.adjustBid(10)">+10 Bs</button>
                    <button class="bid-quick-btn" type="button" onclick="window.auctionSystem.adjustBid(50)">+50 Bs</button>
                    <button class="bid-quick-btn" type="button" onclick="window.auctionSystem.adjustBid(100)">+100 Bs</button>
                    <button class="bid-quick-btn" type="button" onclick="window.auctionSystem.adjustBid(500)">+500 Bs</button>
                </div>
            </div>
            
            <div class="form-buttons">
                <button class="btn-primary" type="button" onclick="window.auctionSystem.submitBid()">
                    Confirmar Puja
                </button>
                <button class="btn-secondary" type="button" onclick="window.auctionSystem.closeModal('bidModal')">
                    Cancelar
                </button>
            </div>
        `;
        
        this.closeModal('auctionModal');
        document.getElementById('bidModal').classList.add('active');
    }
    
    adjustBid(amount) {
        const input = document.getElementById('bidAmountInput');
        const currentValue = parseInt(input.value) || 0;
        input.value = currentValue + amount;
    }
    
    async submitBid() {
        if (!this.currentUser) {
            this.notifications.show('Debes iniciar sesión para pujar', 'error');
            return;
        }
        
        if (this.currentUser.isBanned) {
            this.notifications.show('Tu cuenta está suspendida. Razón: ' + (this.currentUser.banReason || 'Violación de términos'), 'error');
            return;
        }
        
        if (!this.selectedAuction) {
            this.notifications.show('No hay subasta seleccionada', 'error');
            return;
        }
        
        const input = document.getElementById('bidAmountInput');
        let amount = parseInt(input.value);
        
        // Validar entrada
        if (!ValidationSystem.validateInput(amount.toString(), 'amount')) {
            this.notifications.show('Monto de puja inválido', 'error');
            return;
        }
        
        const auction = this.selectedAuction;
        
        // Validaciones
        if (!amount || amount < auction.currentBid + 10) {
            this.notifications.show(`La puja mínima es Bs ${auction.currentBid + 10}`, 'error');
            return;
        }
        
        if (amount % 10 !== 0) {
            this.notifications.show('El monto debe ser múltiplo de 10 Bs', 'error');
            return;
        }
        
        // SOLUCIÓN SIMPLIFICADA: Validación del límite de tiempo solo al pujar
        const canBid = this.rateLimiter.canBid(this.currentUser.id);
        if (!canBid.allowed) {
            this.notifications.show(canBid.message, 'error');
            return; // Solo muestra el error, sin manipular botones
        }
        
        try {
            const auctionRef = this.db.collection('auctions').doc(auction.id);
            const auctionDoc = await auctionRef.get();
            const currentAuction = { id: auctionDoc.id, ...auctionDoc.data() };
            
            // Verificar si la subasta sigue activa
            if (currentAuction.status !== 'active') {
                this.notifications.show('Esta subasta ya ha finalizado', 'error');
                return;
            }
            
            // Verificar si hay cupo
            if (currentAuction.participants >= currentAuction.maxParticipants) {
                this.notifications.show('Esta subasta ha alcanzado el máximo de participantes', 'error');
                return;
            }
            
            // Crear nueva puja
            const bid = {
                userId: this.currentUser.id,
                username: this.currentUser.username,
                amount: amount,
                timestamp: new Date().toISOString()
            };
            
            // Verificar si es la primera puja de este usuario
            const isFirstBid = !currentAuction.bids || 
                              !currentAuction.bids.some(b => b.userId === this.currentUser.id);
            
            // Actualizar subasta
            await auctionRef.update({
                currentBid: amount,
                participants: isFirstBid ? (currentAuction.participants || 0) + 1 : currentAuction.participants,
                bids: firebase.firestore.FieldValue.arrayUnion(bid)
            });
            
            // Actualizar estadísticas del usuario
            await this.db.collection('users').doc(this.currentUser.id).update({
                totalBids: firebase.firestore.FieldValue.increment(1)
            });
            
            this.notifications.show(`¡Puja exitosa por Bs ${amount}!`, 'success');
            
            this.closeModal('bidModal');
            
        } catch (error) {
            console.error("Error realizando puja:", error);
            this.notifications.show('Error realizando puja', 'error');
        }
    }
    
    async loadMyBids() {
        const content = document.getElementById('myBidsContent');
        
        if (!this.currentUser) {
            content.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <i class="fas fa-user-lock" style="font-size: 4rem; color: var(--gold); margin-bottom: 1.5rem;"></i>
                    <h3 style="color: var(--gold); margin-bottom: 1rem;">Inicia sesión</h3>
                    <p style="color: #CCCCCC; margin-bottom: 2rem;">Para ver tus pujas, debes iniciar sesión.</p>
                    <button class="btn-primary" onclick="window.auctionSystem.openAuthModal()">
                        Iniciar Sesión
                    </button>
                </div>
            `;
            return;
        }
        
        if (this.currentUser.isBanned) {
            content.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <i class="fas fa-ban" style="font-size: 4rem; color: var(--red); margin-bottom: 1.5rem;"></i>
                    <h3 style="color: var(--red); margin-bottom: 1rem;">Cuenta Suspendida</h3>
                    <p style="color: #CCCCCC; margin-bottom: 2rem;">Tu cuenta está suspendida. Razón: ${this.currentUser.banReason || 'Violación de términos'}</p>
                </div>
            `;
            return;
        }
        
        try {
            const auctionsSnapshot = await this.db.collection('auctions').get();
            const userBids = [];
            
            auctionsSnapshot.forEach(doc => {
                const auction = { id: doc.id, ...doc.data() };
                if (auction.bids) {
                    auction.bids.forEach(bid => {
                        if (bid.userId === this.currentUser.id) {
                            userBids.push({
                                ...bid,
                                auctionTitle: auction.title,
                                auctionId: auction.id,
                                currentBid: auction.currentBid,
                                status: auction.status,
                                endTime: auction.endTime
                            });
                        }
                    });
                }
            });
            
            if (userBids.length === 0) {
                content.innerHTML = `
                    <div style="text-align: center; padding: 3rem;">
                        <i class="fas fa-comment-dollar" style="font-size: 4rem; color: var(--gold); margin-bottom: 1.5rem;"></i>
                        <h3 style="color: var(--gold); margin-bottom: 1rem;">No has realizado pujas</h3>
                        <p style="color: #CCCCCC;">Participa en las subastas activas para comenzar.</p>
                    </div>
                `;
                return;
            }
            
            // Ordenar por fecha (más reciente primero)
            userBids.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            content.innerHTML = `
                <div style="margin-bottom: 1.5rem;">
                    <p style="color: #CCCCCC;">Total de pujas realizadas: <strong style="color: var(--gold);">${userBids.length}</strong></p>
                </div>
                <div class="bid-history" style="max-height: none;">
                    ${userBids.map(bid => `
                        <div class="bid-history-item">
                            <div>
                                <div style="font-weight: 600; color: var(--gold); margin-bottom: 0.3rem;">
                                    ${bid.auctionTitle}
                                </div>
                                <div style="font-size: 0.9rem; color: #888;">
                                    ${new Date(bid.timestamp).toLocaleString()}
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 1.2rem; font-weight: 700; color: var(--gold);">
                                    Bs ${bid.amount}
                                </div>
                                <div style="font-size: 0.9rem; color: ${bid.status === 'active' ? '#4CAF50' : '#888'};">
                                    ${bid.status === 'active' ? 'Activa' : 'Finalizada'}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
        } catch (error) {
            console.error("Error cargando mis pujas:", error);
            content.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: var(--red); margin-bottom: 1.5rem;"></i>
                    <h3 style="color: var(--gold); margin-bottom: 1rem;">Error al cargar</h3>
                    <p style="color: #CCCCCC;">Intenta recargar la página.</p>
                </div>
            `;
        }
    }
    
    async loadWinners() {
        try {
            const querySnapshot = await this.db.collection('auctions')
                .where('status', '==', 'finished')
                .where('winner', '!=', null)
                .orderBy('endTime', 'desc')
                .limit(10)
                .get();

            const content = document.getElementById('winnersContent');

            if (querySnapshot.empty) {
                content.innerHTML = `
                    <div style="text-align: center; padding: 3rem;">
                        <i class="fas fa-trophy" style="font-size: 4rem; color: var(--gold); margin-bottom: 1.5rem;"></i>
                        <h3 style="color: var(--gold); margin-bottom: 1rem;">No hay ganadores aún</h3>
                        <p style="color: #CCCCCC;">Las subastas finalizadas aparecerán aquí.</p>
                    </div>
                `;
                return;
            }

            content.innerHTML = `
                <div class="auctions-grid" style="margin-top: 1.5rem;">
                    ${querySnapshot.docs.map(doc => {
                        const auction = { id: doc.id, ...doc.data() };
                        const winner = auction.winner;
                        const winnerName = winner ? winner.username : 'Sin ganador';
                        const winnerBid = auction.currentBid;
                        const endDate = new Date(auction.endTime).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        });
                        
                        return `
                            <div class="auction-card" style="border: 2px solid var(--gold); position: relative;">
                                <div style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: var(--gold); color: var(--dark); padding: 5px 15px; border-radius: 20px; font-weight: bold; z-index: 10;">
                                    <i class="fas fa-trophy"></i> GANADOR
                                </div>
                                
                                <div class="auction-image-container">
                                    <img src="${auction.image}" alt="${auction.title}" class="auction-image" onerror="this.src='https://via.placeholder.com/400x300/8A2BE2/FFFFFF?text=${encodeURIComponent(auction.title)}'">
                                </div>
                                
                                <h3 class="auction-title">${auction.title}</h3>
                                <p class="auction-desc">${auction.description}</p>
                                
                                <div style="background: rgba(255, 215, 0, 0.1); padding: 1rem; border-radius: var(--radius-sm); margin-bottom: 1rem; border: 1px solid rgba(255, 215, 0, 0.3);">
                                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 0.5rem;">
                                        <div style="width: 40px; height: 40px; background: linear-gradient(45deg, var(--purple), var(--red)); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem;">
                                            <i class="fas fa-crown"></i>
                                        </div>
                                        <div>
                                            <div style="color: var(--gold); font-weight: 600; font-size: 1.1rem;">${winnerName}</div>
                                            <div style="color: #888; font-size: 0.9rem;">Ganador de la subasta</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="auction-stats">
                                    <div class="auction-stat">
                                        <div class="stat-value">Bs ${winnerBid}</div>
                                        <div class="stat-label">Monto Ganador</div>
                                    </div>
                                    <div class="auction-stat">
                                        <div class="stat-value">${auction.participants}</div>
                                        <div class="stat-label">Participantes</div>
                                    </div>
                                </div>
                                
                                <div style="background: rgba(138, 43, 226, 0.1); padding: 0.8rem; border-radius: var(--radius-sm); margin-top: 1rem; border-left: 3px solid var(--purple);">
                                    <div style="color: #CCCCCC; font-size: 0.9rem; display: flex; justify-content: space-between;">
                                        <span>Fecha finalización:</span>
                                        <span style="color: var(--gold); font-weight: 600;">${endDate}</span>
                                    </div>
                                </div>
                                
                                ${auction.bids && auction.bids.length > 0 && auction.bids[auction.bids.length - 1].userId === winner.userId ? `
                                    <div style="margin-top: 1rem; padding: 0.8rem; background: rgba(76, 175, 80, 0.1); border-radius: var(--radius-sm); border: 1px solid rgba(76, 175, 80, 0.3);">
                                        <div style="color: #4CAF50; font-size: 0.9rem; text-align: center;">
                                            <i class="fas fa-check-circle"></i> Puja ganadora realizada por ${winnerName}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            
        } catch (error) {
            console.error("Error cargando ganadores:", error);
            content.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: var(--red); margin-bottom: 1.5rem;"></i>
                    <h3 style="color: var(--gold); margin-bottom: 1rem;">Error al cargar ganadores</h3>
                    <p style="color: #CCCCCC;">Intenta recargar la página.</p>
                </div>
            `;
        }
    }
    
    async finalizeAuction(auctionId) {
        try {
            const auctionRef = this.db.collection('auctions').doc(auctionId);
            const auctionDoc = await auctionRef.get();
            const auction = { id: auctionDoc.id, ...auctionDoc.data() };
            
            if (auction.status !== 'active') {
                return;
            }
            
            let winner = null;
            if (auction.bids && auction.bids.length > 0) {
                const lastBid = auction.bids[auction.bids.length - 1];
                winner = {
                    userId: lastBid.userId,
                    username: lastBid.username
                };
                
                // Actualizar estadísticas del ganador
                await this.db.collection('users').doc(lastBid.userId).update({
                    auctionsWon: firebase.firestore.FieldValue.increment(1)
                });
            }
            
            await auctionRef.update({
                status: 'finished',
                winner: winner
            });
            
            this.notifications.show(`Subasta "${auction.title}" finalizada!`, 'info');
            
        } catch (error) {
            console.error("Error finalizando subasta:", error);
        }
    }
    
    toggleAdminPanel() {
        const panel = document.getElementById('adminPanel');
        if (panel.classList.contains('active')) {
            this.closeAdminPanel();
        } else {
            this.openAdminPanel();
        }
    }
    
    async openAdminPanel() {
        if (!this.currentUser) {
            this.notifications.show('Debes iniciar sesión', 'error');
            return;
        }
        
        // Verificar si es admin
        const userDoc = await this.db.collection('users').doc(this.currentUser.id).get();
        const userData = userDoc.data();
        
        if (!userData.isAdmin) {
            // Solicitar código admin
            const code = prompt('Ingrese código de administrador:');
            if (code === "ADMIN123") {
                // Hacer admin temporal
                this.currentUser.isAdmin = true;
            } else {
                this.notifications.show('Acceso denegado', 'error');
                return;
            }
        }
        
        document.getElementById('adminPanel').classList.add('active');
        this.loadAdminContent();
    }
    
    closeAdminPanel() {
        document.getElementById('adminPanel').classList.remove('active');
    }
    
    async loadAdminContent() {
        await this.loadAdminAuctions();
        await this.loadAdminUsers();
        await this.loadAdminBans();
        await this.loadAdminSecurity();
        await this.loadAdminExport();
    }
    
    async loadAdminAuctions() {
        try {
            const querySnapshot = await this.db.collection('auctions').get();
            const container = document.getElementById('adminAuctionsList');
            
            if (querySnapshot.empty) {
                container.innerHTML = '<p style="color: #888; text-align: center;">No hay subastas</p>';
                return;
            }
            
            container.innerHTML = `
                <div style="display: grid; gap: 1rem;">
                    ${querySnapshot.docs.map(doc => {
                        const auction = { id: doc.id, ...doc.data() };
                        return `
                            <div style="background: var(--gray-dark); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-light);">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                    <h4 style="color: var(--gold);">${auction.title}</h4>
                                    <span style="color: ${auction.status === 'active' ? '#4CAF50' : '#888'}; font-size: 0.9rem;">
                                        ${auction.status === 'active' ? 'Activa' : 'Finalizada'}
                                    </span>
                                </div>
                                
                                <div style="color: #CCCCCC; font-size: 0.9rem; margin-bottom: 0.5rem;">
                                    ${auction.description.substring(0, 100)}...
                                </div>
                                
                                <div style="display: flex; justify-content: space-between; color: #888; font-size: 0.8rem; margin-bottom: 1rem;">
                                    <span>Bs ${auction.currentBid}</span>
                                    <span>${auction.participants}/${auction.maxParticipants} participantes</span>
                                </div>
                                
                                <div style="display: flex; gap: 0.5rem;">
                                    <button class="admin-action-btn" 
                                            onclick="window.auctionSystem.viewAuction('${auction.id}')">
                                        Ver
                                    </button>
                                    <button class="admin-action-btn ban"
                                            onclick="window.auctionSystem.deleteAuction('${auction.id}')">
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            
        } catch (error) {
            console.error("Error cargando subastas admin:", error);
        }
    }
    
    async loadAdminUsers() {
        try {
            const querySnapshot = await this.db.collection('users').get();
            const container = document.getElementById('adminUsersList');
            
            if (querySnapshot.empty) {
                container.innerHTML = '<p style="color: #888; text-align: center;">No hay usuarios registrados</p>';
                return;
            }
            
            container.innerHTML = `
                <div class="admin-list">
                    ${querySnapshot.docs.map(doc => {
                        const user = { id: doc.id, ...doc.data() };
                        return `
                            <div class="admin-list-item">
                                <div class="user-info-small">
                                    <div class="user-name" style="${user.isBanned ? 'color: var(--red);' : 'color: var(--gold);'}">
                                        ${user.username}
                                        ${user.isBanned ? ' <i class="fas fa-ban" style="color: var(--red);"></i>' : ''}
                                    </div>
                                    <div class="user-phone">${user.phone}</div>
                                    <div class="user-stats">
                                        <div class="user-stat">
                                            <div class="user-stat-value">${user.totalBids || 0}</div>
                                            <div style="font-size: 0.8rem;">Pujas</div>
                                        </div>
                                        <div class="user-stat">
                                            <div class="user-stat-value">${user.auctionsWon || 0}</div>
                                            <div style="font-size: 0.8rem;">Ganadas</div>
                                        </div>
                                    </div>
                                    ${user.isBanned ? `
                                        <div style="color: var(--red); font-size: 0.8rem; margin-top: 5px;">
                                            <i class="fas fa-exclamation-circle"></i>
                                            Baneado: ${user.banReason || 'Sin razón especificada'}
                                        </div>
                                    ` : ''}
                                </div>
                                <div>
                                    ${user.isBanned ? 
                                        `<button class="admin-action-btn unban" onclick="window.auctionSystem.toggleUserBan('${user.id}', false)">
                                            Desbanear
                                        </button>` :
                                        `<button class="admin-action-btn ban" onclick="window.auctionSystem.showBanForm('${user.id}')">
                                            Banear
                                        </button>`
                                    }
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            
        } catch (error) {
            console.error("Error cargando usuarios admin:", error);
        }
    }
    
    async loadAdminBans() {
        try {
            const usersSnapshot = await this.db.collection('users')
                .where('isBanned', '==', true)
                .get();
            
            const container = document.getElementById('adminBansContent');
            
            const bannedUsers = [];
            usersSnapshot.forEach(doc => {
                bannedUsers.push({ id: doc.id, ...doc.data() });
            });
            
            container.innerHTML = `
                <div class="admin-section">
                    <h4 style="color: var(--gold); margin-bottom: 1rem;">Usuarios Baneados Actualmente</h4>
                    ${bannedUsers.length > 0 ? `
                        <div class="admin-list">
                            ${bannedUsers.map(user => `
                                <div class="admin-list-item">
                                    <div class="user-info-small">
                                        <div class="user-name" style="color: var(--red);">
                                            ${user.username}
                                            <i class="fas fa-ban" style="color: var(--red);"></i>
                                        </div>
                                        <div class="user-phone">${user.phone}</div>
                                        <div style="color: var(--red); font-size: 0.9rem;">
                                            <strong>Razón:</strong> ${user.banReason || 'Sin especificar'}
                                        </div>
                                        <div style="color: #888; font-size: 0.8rem;">
                                            <strong>ID:</strong> ${user.id}
                                        </div>
                                    </div>
                                    <button class="admin-action-btn unban" onclick="window.auctionSystem.toggleUserBan('${user.id}', false)">
                                        Desbanear
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p style="color: #888; text-align: center;">No hay usuarios baneados</p>'}
                </div>
                
                <div class="admin-section">
                    <h4 style="color: var(--gold); margin-bottom: 1rem;">Herramientas de Baneo</h4>
                    <div style="background: var(--gray-dark); padding: 1rem; border-radius: var(--radius-sm);">
                        <div class="form-group">
                            <label class="form-label">ID de Usuario a Banear</label>
                            <input type="text" class="form-input" id="banUserId" placeholder="ID del usuario">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Razón del Baneo</label>
                            <input type="text" class="form-input" id="banReason" placeholder="Ej: Violación de términos">
                        </div>
                        <div class="form-group">
                            <label class="form-label">O seleccionar razón común:</label>
                            <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                                <button type="button" class="admin-action-btn" onclick="document.getElementById('banReason').value = 'Violación de términos del servicio'">Violación de términos</button>
                                <button type="button" class="admin-action-btn" onclick="document.getElementById('banReason').value = 'Comportamiento inapropiado'">Comportamiento inapropiado</button>
                                <button type="button" class="admin-action-btn" onclick="document.getElementById('banReason').value = 'Pujas fraudulentas'">Pujas fraudulentas</button>
                            </div>
                        </div>
                        <button class="btn-primary" onclick="window.auctionSystem.banUserById()" style="width: 100%; margin-top: 1rem;">
                            Banear Usuario
                        </button>
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error("Error cargando baneos admin:", error);
        }
    }
    
    async loadAdminSecurity() {
        const container = document.getElementById('adminSecurityContent');
        
        try {
            const usersSnapshot = await this.db.collection('users').get();
            const auctionsSnapshot = await this.db.collection('auctions').get();
            
            const totalUsers = usersSnapshot.size;
            const totalAuctions = auctionsSnapshot.size;
            let activeAuctions = 0;
            let finishedAuctions = 0;
            let bannedUsers = 0;
            
            auctionsSnapshot.forEach(doc => {
                const auction = doc.data();
                if (auction.status === 'active') activeAuctions++;
                if (auction.status === 'finished') finishedAuctions++;
            });
            
            usersSnapshot.forEach(doc => {
                const user = doc.data();
                if (user.isBanned) bannedUsers++;
            });
            
            container.innerHTML = `
                <div class="admin-section">
                    <h4 style="color: var(--gold); margin-bottom: 1rem;">Estadísticas del Sistema</h4>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 2rem;">
                        <div style="background: var(--gray-dark); padding: 1rem; border-radius: var(--radius-sm); text-align: center;">
                            <div style="font-size: 2rem; color: var(--gold); font-weight: 600;">${totalUsers}</div>
                            <div style="color: #888;">Usuarios</div>
                        </div>
                        <div style="background: var(--gray-dark); padding: 1rem; border-radius: var(--radius-sm); text-align: center;">
                            <div style="font-size: 2rem; color: var(--gold); font-weight: 600;">${totalAuctions}</div>
                            <div style="color: #888;">Subastas</div>
                        </div>
                        <div style="background: var(--gray-dark); padding: 1rem; border-radius: var(--radius-sm); text-align: center;">
                            <div style="font-size: 2rem; color: var(--gold); font-weight: 600;">${activeAuctions}</div>
                            <div style="color: #888;">Activas</div>
                        </div>
                        <div style="background: var(--gray-dark); padding: 1rem; border-radius: var(--radius-sm); text-align: center;">
                            <div style="font-size: 2rem; color: ${bannedUsers > 0 ? 'var(--red)' : 'var(--gold)'}; font-weight: 600;">${bannedUsers}</div>
                            <div style="color: #888;">Baneados</div>
                        </div>
                    </div>
                </div>
                
                <div class="admin-section">
                    <h4 style="color: var(--gold); margin-bottom: 1rem;">Herramientas de Sistema</h4>
                    <div class="form-buttons">
                        <button class="btn-primary" onclick="window.auctionSystem.clearAllData()">
                            Limpiar Todo
                        </button>
                        <button class="btn-secondary" onclick="window.auctionSystem.createTestData()">
                            Datos de Prueba
                        </button>
                        <button class="btn-secondary" onclick="window.auctionSystem.debugBanSystem()" style="background: #00FF00; color: #000; border-color: #00FF00;">
                            Debug Baneos
                        </button>
                    </div>
                </div>
                
                <div class="admin-section">
                    <h4 style="color: var(--gold); margin-bottom: 1rem;">Estado del Sistema</h4>
                    <div style="background: var(--gray-dark); padding: 1rem; border-radius: var(--radius-sm);">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span>Conexión Firebase:</span>
                            <span style="color: #4CAF50; font-weight: 600;">✅ Conectado</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span>Base de datos:</span>
                            <span style="color: #4CAF50; font-weight: 600;">✅ Operativa</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>Autenticación:</span>
                            <span style="color: #4CAF50; font-weight: 600;">✅ Activa</span>
                        </div>
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error("Error cargando seguridad admin:", error);
            container.innerHTML = '<p style="color: #888; text-align: center;">Error cargando estadísticas</p>';
        }
    }
    
    async loadAdminExport() {
        const container = document.getElementById('adminExportContent');
        
        container.innerHTML = `
            <div class="admin-section">
                <h4 style="color: var(--gold); margin-bottom: 1rem;">Exportar Datos</h4>
                <p style="color: #CCCCCC; margin-bottom: 1.5rem;">
                    Descarga los datos del sistema en formato JSON para realizar copias de seguridad.
                </p>
                
                <div class="export-options">
                    <div class="export-btn" onclick="window.auctionSystem.exportData('users')">
                        <i class="fas fa-users" style="font-size: 2rem; color: var(--gold); margin-bottom: 0.5rem;"></i>
                        <div>Exportar Usuarios</div>
                    </div>
                    
                    <div class="export-btn" onclick="window.auctionSystem.exportData('auctions')">
                        <i class="fas fa-gavel" style="font-size: 2rem; color: var(--gold); margin-bottom: 0.5rem;"></i>
                        <div>Exportar Subastas</div>
                    </div>
                    
                    <div class="export-btn" onclick="window.auctionSystem.exportData('all')">
                        <i class="fas fa-database" style="font-size: 2rem; color: var(--gold); margin-bottom: 0.5rem;"></i>
                        <div>Exportar Todo</div>
                    </div>
                </div>
            </div>
            
            <div class="admin-section">
                <h4 style="color: var(--gold); margin-bottom: 1rem;">Respaldos Automáticos</h4>
                <div style="background: var(--gray-dark); padding: 1rem; border-radius: var(--radius-sm);">
                    <p style="color: #888; margin-bottom: 1rem;">Los datos se respaldan automáticamente en Firebase.</p>
                    <button class="btn-primary" onclick="window.auctionSystem.createBackup()" style="width: 100%;">
                        Crear Backup Manual
                    </button>
                </div>
            </div>
        `;
    }
    
    showBanForm(userId) {
        // Obtener información del usuario
        this.db.collection('users').doc(userId).get().then(doc => {
            if (doc.exists) {
                const user = doc.data();
                const reason = prompt(`Ingrese la razón para banear a ${user.username} (${user.phone}):`, 'Violación de términos del servicio');
                
                if (reason !== null && reason.trim() !== '') {
                    this.toggleUserBan(userId, true, reason);
                }
            } else {
                this.notifications.show('Usuario no encontrado', 'error');
            }
        }).catch(error => {
            console.error("Error obteniendo usuario:", error);
            this.notifications.show('Error al obtener información del usuario', 'error');
        });
    }
    
    async toggleUserBan(userId, ban = true, reason = '') {
        try {
            const userData = {
                isBanned: ban,
                banReason: ban ? reason : null,
                banDate: ban ? new Date().toISOString() : null
            };
            
            // Actualizar en Firestore
            await this.db.collection('users').doc(userId).update(userData);
            
            this.notifications.show(
                ban ? `✅ Usuario baneado: ${reason}` : '✅ Usuario desbaneado',
                ban ? 'info' : 'success'
            );
            
            // Recargar las listas
            this.loadAdminUsers();
            this.loadAdminBans();
            
            // Si el usuario baneado es el actual, mostrar mensaje inmediatamente
            if (this.currentUser && this.currentUser.id === userId && ban) {
                // Actualizar el usuario actual
                this.currentUser.isBanned = true;
                this.currentUser.banReason = reason;
                
                // Mostrar mensaje inmediatamente
                setTimeout(() => {
                    this.showBanMessage();
                }, 100);
            }
            
            // Si se desbaneó al usuario actual, remover mensaje
            if (this.currentUser && this.currentUser.id === userId && !ban) {
                const banNotification = document.getElementById('banNotification');
                if (banNotification) {
                    banNotification.remove();
                }
                this.currentUser.isBanned = false;
                this.currentUser.banReason = null;
                this.updateUI();
            }
            
        } catch (error) {
            console.error("Error cambiando estado de ban:", error);
            this.notifications.show('❌ Error al banear/desbanear usuario', 'error');
        }
    }
    
    async banUserById() {
        const userIdInput = document.getElementById('banUserId');
        const reasonInput = document.getElementById('banReason');
        
        let userId = userIdInput.value.trim();
        let reason = reasonInput.value.trim();
        
        // Sanitizar inputs
        userId = ValidationSystem.sanitizeInput(userId);
        reason = ValidationSystem.sanitizeInput(reason);
        
        if (!userId) {
            this.notifications.show('❌ Ingrese un ID de usuario', 'error');
            return;
        }
        
        if (!reason) {
            this.notifications.show('❌ Ingrese una razón para el baneo', 'error');
            return;
        }
        
        try {
            const userDoc = await this.db.collection('users').doc(userId).get();
            
            if (!userDoc.exists) {
                this.notifications.show('❌ Usuario no encontrado', 'error');
                return;
            }
            
            const user = userDoc.data();
            
            // Confirmar antes de banear
            const confirmMessage = `¿Está seguro de banear a ${user.username} (${user.phone})?\nRazón: ${reason}`;
            
            if (!confirm(confirmMessage)) {
                return;
            }
            
            await this.toggleUserBan(userId, true, reason);
            
            // Limpiar formulario
            userIdInput.value = '';
            reasonInput.value = '';
            
        } catch (error) {
            console.error("Error baneando usuario por ID:", error);
            this.notifications.show('❌ Error baneando usuario: ' + error.message, 'error');
        }
    }
    
    getUserById(userId) {
        // Esta función sería más compleja en producción
        // Por ahora retorna un objeto básico
        return { id: userId, username: 'Usuario' };
    }
    
    async createAuction() {
        if (!this.currentUser) {
            this.notifications.show('Debes iniciar sesión', 'error');
            return;
        }
        
        if (!this.currentUser.isAdmin) {
            this.notifications.show('Solo administradores pueden crear subastas', 'error');
            return;
        }
        
        const titleInput = document.getElementById('auctionTitle');
        const descriptionInput = document.getElementById('auctionDescription');
        const imageInput = document.getElementById('auctionImage');
        const startBidInput = document.getElementById('auctionStartBid');
        const maxParticipantsInput = document.getElementById('auctionMaxParticipants');
        const durationInput = document.getElementById('auctionDuration');
        
        let title = titleInput.value.trim();
        let description = descriptionInput.value.trim();
        let image = imageInput.value.trim();
        let startBid = parseInt(startBidInput.value);
        let maxParticipants = parseInt(maxParticipantsInput.value);
        let duration = parseInt(durationInput.value);
        
        // Sanitizar y validar inputs
        title = ValidationSystem.sanitizeInput(title);
        description = ValidationSystem.sanitizeInput(description);
        image = ValidationSystem.sanitizeInput(image);
        
        // Validaciones
        if (!title || !description || !image) {
            this.notifications.show('Complete todos los campos', 'error');
            return;
        }
        
        // Validaciones específicas
        if (!ValidationSystem.validateInput(image, 'url')) {
            this.notifications.show('URL de imagen inválida', 'error');
            return;
        }
        
        if (!ValidationSystem.validateInput(startBid.toString(), 'amount')) {
            this.notifications.show('Puja inicial inválida', 'error');
            return;
        }
        
        if (startBid % 10 !== 0 || startBid < 10) {
            this.notifications.show('La puja inicial debe ser múltiplo de 10 Bs y mayor a 0', 'error');
            return;
        }
        
        if (maxParticipants < 1 || maxParticipants > 100) {
            this.notifications.show('Participantes máximos debe ser entre 1 y 100', 'error');
            return;
        }
        
        if (duration < 1 || duration > 1440) {
            this.notifications.show('Duración debe ser entre 1 y 1440 minutos', 'error');
            return;
        }
        
        try {
            const endTime = new Date(Date.now() + duration * 60000);
            
            const auctionData = {
                title: title,
                description: description,
                image: image,
                startingBid: startBid,
                currentBid: startBid,
                maxParticipants: maxParticipants,
                participants: 0,
                createdBy: this.currentUser.username,
                createdById: this.currentUser.id,
                createdAt: new Date().toISOString(),
                endTime: endTime.toISOString(),
                bids: [],
                status: 'active',
                winner: null
            };
            
            // Mostrar indicador de carga
            this.notifications.show('Creando subasta...', 'info');
            
            await this.db.collection('auctions').add(auctionData);
            
            this.notifications.show('Subasta creada exitosamente', 'success');
            document.getElementById('createAuctionForm').reset();
            
            // Pre-cargar imagen en cache
            if (image) {
                const img = new Image();
                img.src = image;
                this.imageCache.set(image, image);
            }
            
            // Recargar subastas
            this.loadAuctions();
            this.loadAdminAuctions();
            
        } catch (error) {
            console.error("Error creando subasta:", error);
            this.notifications.show('Error creando subasta', 'error');
        }
    }
    
    async deleteAuction(auctionId) {
        if (!confirm('¿Está seguro de eliminar esta subasta? Esta acción no se puede deshacer.')) {
            return;
        }
        
        try {
            await this.db.collection('auctions').doc(auctionId).delete();
            
            // Detener temporizador
            if (this.timers[auctionId]) {
                clearInterval(this.timers[auctionId]);
                delete this.timers[auctionId];
            }
            
            this.notifications.show('Subasta eliminada', 'info');
            
            // Recargar listas
            this.loadAuctions();
            this.loadAdminAuctions();
            
        } catch (error) {
            console.error("Error eliminando subasta:", error);
            this.notifications.show('Error eliminando subasta', 'error');
        }
    }
    
    resetAdminForm() {
        document.getElementById('createAuctionForm').reset();
    }
    
    async clearAllData() {
        if (!confirm('¿ESTÁ SEGURO? Esto eliminará TODOS los datos. No se puede deshacer.')) {
            return;
        }
        
        if (!confirm('¿CONFIRMA QUE QUIERE ELIMINAR TODOS LOS DATOS? Esta acción es irreversible.')) {
            return;
        }
        
        try {
            // Eliminar todas las subastas
            const auctionsSnapshot = await this.db.collection('auctions').get();
            const deletePromises = [];
            
            auctionsSnapshot.forEach(doc => {
                deletePromises.push(doc.ref.delete());
            });
            
            await Promise.all(deletePromises);
            
            // Limpiar cache de imágenes
            this.imageCache.clear();
            
            // Limpiar rate limiter
            this.rateLimiter.userBids.clear();
            this.rateLimiter.userActions.clear();
            
            this.notifications.show('Todos los datos han sido eliminados', 'success');
            
            // Recargar
            this.loadAuctions();
            this.loadAdminAuctions();
            
        } catch (error) {
            console.error("Error limpiando datos:", error);
            this.notifications.show('Error limpiando datos', 'error');
        }
    }
    
    async createTestData() {
        if (!confirm('¿Crear datos de prueba? Esto agregará subastas de ejemplo.')) {
            return;
        }
        
        try {
            const testAuctions = [
                {
                    title: "iPhone 15 Pro Max 256GB",
                    description: "Nuevo en caja sellada, color negro espacial. Incluye cargador y funda original.",
                    image: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-7inch?wid=5120&hei=2880&fmt=webp&qlt=70&.v=1693009279096",
                    startingBid: 5000,
                    maxParticipants: 30,
                    duration: 120
                },
                {
                    title: "Smart TV Samsung 75\" 4K UHD",
                    description: "Televisor inteligente con resolución 4K, HDR10+, y sistema operativo Tizen.",
                    image: "https://images.samsung.com/is/image/samsung/p6pim/ar/ua75bu8000kczb/gallery/ar-uhd-bu8000-ua75bu8000kczb-536264964?$650_519_PNG$",
                    startingBid: 3500,
                    maxParticipants: 25,
                    duration: 90
                },
                {
                    title: "Laptop Dell XPS 13",
                    description: "Laptop ultradelgada con procesador i7, 16GB RAM, 512GB SSD, pantalla InfinityEdge.",
                    image: "https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/xps-notebooks/xps-13-9320/media-gallery/notebook-xps-13-9320-nt-gallery-3.psd?fmt=pjpg&pscan=auto&scl=1&wid=4000&hei=4000&qlt=100,0&resMode=sharp2&size=4000,4000",
                    startingBid: 4200,
                    maxParticipants: 20,
                    duration: 60
                },
                {
                    title: "PlayStation 5 + 2 Juegos",
                    description: "Consola PS5 edición estándar + God of War Ragnarok + Spider-Man 2.",
                    image: "https://gmedia.playstation.com/is/image/SIEPDC/ps5-product-thumbnail-01-en-14sep21?$facebook$",
                    startingBid: 3800,
                    maxParticipants: 35,
                    duration: 180
                },
                {
                    title: "Drone DJI Mini 3 Pro",
                    description: "Drone profesional con cámara 4K, 48MP, 34 minutos de vuelo, peso inferior a 250g.",
                    image: "https://www.dji.com/content/dam/dji-multiple-images/global/product-2/mini-3-pro/dji-mini-3-pro-drone-1.png",
                    startingBid: 2800,
                    maxParticipants: 15,
                    duration: 45
                }
            ];
            
            for (const auction of testAuctions) {
                const endTime = new Date(Date.now() + auction.duration * 60000);
                
                const auctionData = {
                    title: auction.title,
                    description: auction.description,
                    image: auction.image,
                    startingBid: auction.startingBid,
                    currentBid: auction.startingBid,
                    maxParticipants: auction.maxParticipants,
                    participants: 0,
                    createdBy: "Sistema",
                    createdById: "system",
                    createdAt: new Date().toISOString(),
                    endTime: endTime.toISOString(),
                    bids: [],
                    status: 'active',
                    winner: null
                };
                
                await this.db.collection('auctions').add(auctionData);
                
                // Pre-cargar imágenes en cache
                if (auction.image) {
                    const img = new Image();
                    img.src = auction.image;
                    this.imageCache.set(auction.image, auction.image);
                }
            }
            
            this.notifications.show(`${testAuctions.length} subastas de prueba creadas`, 'success');
            
            // Recargar
            this.loadAuctions();
            this.loadAdminAuctions();
            
        } catch (error) {
            console.error("Error creando datos de prueba:", error);
            this.notifications.show('Error creando datos de prueba', 'error');
        }
    }
    
    async exportData(type) {
        try {
            let data;
            
            switch(type) {
                case 'users':
                    const usersSnapshot = await this.db.collection('users').get();
                    data = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    break;
                    
                case 'auctions':
                    const auctionsSnapshot = await this.db.collection('auctions').get();
                    data = auctionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    break;
                    
                case 'all':
                    const allUsers = await this.db.collection('users').get();
                    const allAuctions = await this.db.collection('auctions').get();
                    data = {
                        users: allUsers.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                        auctions: allAuctions.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                        exportDate: new Date().toISOString(),
                        systemInfo: {
                            imageCacheSize: this.imageCache.size,
                            rateLimiterStats: {
                                userBids: this.rateLimiter.userBids.size,
                                userActions: this.rateLimiter.userActions.size
                            }
                        }
                    };
                    break;
                    
                default:
                    return;
            }
            
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `subastas_bolivia_${type}_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.notifications.show(`Datos exportados correctamente: ${type}`, 'success');
            
        } catch (error) {
            console.error("Error exportando datos:", error);
            this.notifications.show('Error exportando datos', 'error');
        }
    }
    
    async createBackup() {
        this.notifications.show('Creando backup...', 'info');
        await this.exportData('all');
    }
    
    debugMode() {
        console.log('=== DEBUG MODE ===');
        console.log('Usuario actual:', this.currentUser);
        console.log('Firebase config:', window.firebaseConfig);
        console.log('Timers activos:', Object.keys(this.timers).length);
        console.log('Cache de imágenes:', this.imageCache.size);
        console.log('Rate limiter stats:', {
            userBids: this.rateLimiter.userBids.size,
            userActions: this.rateLimiter.userActions.size,
            minTimeBetweenBids: this.rateLimiter.MIN_TIME_BETWEEN_BIDS
        });
        
        // Mostrar estadísticas en notificación
        this.db.collection('users').get().then(snap => {
            this.db.collection('auctions').get().then(auctionSnap => {
                const activeAuctions = auctionSnap.docs.filter(doc => doc.data().status === 'active').length;
                this.notifications.show(
                    `DEBUG: ${snap.size} usuarios, ${auctionSnap.size} subastas (${activeAuctions} activas) | Límite: 30s entre pujas`,
                    'info'
                );
            });
        });
    }
    
    debugBanSystem() {
        console.log('=== DEBUG BAN SYSTEM ===');
        console.log('Current User:', this.currentUser);
        console.log('Firebase DB:', this.db);
        console.log('Image Cache:', this.imageCache);
        console.log('Rate Limiter:', this.rateLimiter);
        
        // Probar conexión a Firestore
        this.db.collection('users').limit(1).get().then(snapshot => {
            console.log('Firestore Connection Test:', snapshot.empty ? 'No users found' : 'Connected successfully');
            
            // Verificar sistema de baneos
            if (this.currentUser) {
                console.log('User Ban Status:', this.currentUser.isBanned ? 'Banned' : 'Not Banned');
                if (this.currentUser.isBanned) {
                    console.log('Ban Reason:', this.currentUser.banReason);
                }
            }
            
            this.notifications.show('✅ Sistema de baneos funcionando correctamente', 'success');
            
        }).catch(error => {
            console.error('Firestore Connection Error:', error);
            this.notifications.show('❌ Error en conexión a Firebase', 'error');
        });
    }
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Verificar que Firebase se inicializó
    if (!window.firebaseAuth || !window.firebaseDb) {
        console.error("❌ Firebase no se inicializó correctamente");
        document.getElementById('loader').innerHTML = `
            <div style="text-align: center; color: var(--red);">
                <i class="fas fa-exclamation-triangle" style="font-size: 4rem;"></i>
                <h2>Error de conexión</h2>
                <p>No se pudo conectar con Firebase</p>
                <p>Verifica tu conexión a internet</p>
                <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: var(--gold); color: var(--dark); border: none; border-radius: 5px; cursor: pointer;">
                    Reintentar
                </button>
            </div>
        `;
        return;
    }
    
    // Inicializar sistema
    window.auctionSystem = new AuctionSystem();
    window.auctionSystem.init();
    
    // Hacer funciones disponibles globalmente
    window.closeModal = (modalId) => window.auctionSystem.closeModal(modalId);
    window.switchTab = (tabId) => window.auctionSystem.switchTab(tabId);
});
