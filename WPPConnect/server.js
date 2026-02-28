/**
 * ========================================
 * AVELAR SYSTEM - WPPConnect Server
 * ========================================
 * Servidor Node.js para integração WhatsApp via WPPConnect
 * Funciona como alternativa ao WhatsApp Business API
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const redis = require('redis');
const { create, Whatsapp } = require('@wppconnect-team/wppconnect');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// ==========================================
// CONFIGURAÇÃO DE LOGGING
// ==========================================

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}] ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/wppconnect.log' })
    ]
});

// Criar diretório de logs
if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
}

// ==========================================
// CONFIGURAÇÃO DO REDIS
// ==========================================

let redisClient = null;

async function initializeRedis() {
    try {
        redisClient = redis.createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            socket: {
                reconnectStrategy: (retries) => {
                    const delay = Math.min(retries * 50, 500);
                    return delay;
                }
            }
        });

        redisClient.on('error', (err) => logger.warn(`⚠️ Redis erro: ${err.message}`));
        redisClient.on('connect', () => logger.info('✅ Conectado ao Redis'));

        await redisClient.connect();
        logger.info('✅ Redis inicializado com sucesso');
    } catch (error) {
        logger.warn(`⚠️ Redis não disponível, operando sem cache: ${error.message}`);
        redisClient = null;
    }
}

// ==========================================
// CONFIGURAÇÕES
// ==========================================

const config = {
    port: process.env.WPP_PORT || 8003,  // Porta fixa para produção
    sessionName: process.env.WPP_SESSION || 'avelar-session',
    secretKey: process.env.WPP_SECRET || 'avelar-wpp-secret',
    webhookUrl: process.env.WEBHOOK_URL || 'http://avadmin-backend:8000/api/whatsapp/webhook',
    tokensPath: './tokens',
    autoClose: 0, // Nunca fechar automaticamente
};

// ==========================================
// ESTADO GLOBAL
// ==========================================

let whatsappClient = null;
let connectionStatus = {
    status: 'disconnected',
    qrCode: null,
    lastUpdate: new Date().toISOString(),
    sessionName: config.sessionName
};
let messageQueue = [];
let sentMessages = [];

// ==========================================
// EXPRESS APP
// ==========================================

const app = express();

// Middlewares de Compressão e Performance
app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || [
        'http://localhost:3000', 
        'http://localhost:3001',
        'http://localhost:8010',
        'https://avadmin.avelarcompany.com.br',
        'https://app.avelarcompany.com.br',
        'https://stocktech.avelarcompany.com.br',
        'http://217.216.48.148:3000',
        'http://217.216.48.148:3001'
    ],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// ==========================================
// FUNÇÕES DE INICIALIZAÇÃO WHATSAPP
// ==========================================

async function initializeWhatsApp() {
    logger.info('🚀 Iniciando cliente WhatsApp...');

    try {
        // Limpar processos e locks antigos do Chromium antes de iniciar
        try {
            execSync('pkill -f chromium || true');
            execSync('pkill -f chrome || true');
            const lockFiles = [
                path.join(config.tokensPath, config.sessionName, 'DevToolsActivePort'),
                path.join(config.tokensPath, config.sessionName, 'SingletonLock'),
                path.join(config.tokensPath, config.sessionName, 'SingletonSocket'),
                path.join(config.tokensPath, config.sessionName, 'SingletonCookie'),
            ];
            lockFiles.forEach((file) => {
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                }
            });
        } catch (cleanupError) {
            logger.warn(`⚠️ Falha ao limpar locks do Chromium: ${cleanupError?.message || cleanupError}`);
        }

        whatsappClient = await create({
            session: config.sessionName,
            catchQR: (base64Qr, asciiQR, attempts, urlCode) => {
                logger.info(`📱 QR Code gerado (tentativa ${attempts})`);
                connectionStatus.qrCode = base64Qr;
                connectionStatus.status = 'waiting_scan';
                connectionStatus.lastUpdate = new Date().toISOString();
                
                // Cachear QR Code no Redis
                if (redisClient) {
                    redisClient.setEx('wpp_qrcode', 300, base64Qr).catch(err => 
                        logger.warn(`⚠️ Redis setEx erro: ${err.message}`)
                    );
                }
                
                // Log QR Code ASCII no console
                console.log('\n' + asciiQR + '\n');
            },
            statusFind: (statusSession, session) => {
                logger.info(`📊 Status da sessão: ${statusSession}`);
                
                switch (statusSession) {
                    case 'isLogged':
                    case 'qrReadSuccess':
                    case 'inChat':
                        connectionStatus.status = 'connected';
                        connectionStatus.qrCode = null;
                        // Cachear status no Redis
                        if (redisClient) {
                            redisClient.setEx('wpp_status', 3600, 'connected').catch(err =>
                                logger.warn(`⚠️ Redis setEx erro: ${err.message}`)
                            );
                        }
                        break;
                    case 'notLogged':
                    case 'browserClose':
                    case 'qrReadFail':
                        connectionStatus.status = 'disconnected';
                        break;
                    case 'desconnectedMobile':
                        connectionStatus.status = 'phone_disconnected';
                        break;
                    default:
                        connectionStatus.status = statusSession;
                }
                
                connectionStatus.lastUpdate = new Date().toISOString();
            },
            headless: true,
            devtools: false,
            useChrome: true,
            debug: false,
            logQR: true,
            browserWS: '',
            browserArgs: (() => {
                const args = [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-extensions',
                    '--disable-sync',
                    '--disable-plugins',
                    '--no-default-browser-check',
                    // Fingerprint spoofing
                    '--disable-blink-features=AutomationControlled',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process'
                ];
                
                // Proxy support (se configurado)
                const proxyUrl = process.env.WPP_PROXY_URL;
                if (proxyUrl) {
                    args.push(`--proxy-server=${proxyUrl}`);
                    logger.info(`🌐 Proxy configurado: ${proxyUrl}`);
                }
                
                return args;
            })(),
            puppeteerOptions: {
                timeout: 30000,
                args: ['--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36']
            },
            disableWelcome: true,
            updatesLog: true,
            autoClose: config.autoClose,
            tokenStore: 'file',
            folderNameToken: config.tokensPath
        });

        // Registrar eventos
        setupEventListeners(whatsappClient);
        
        logger.info('✅ Cliente WhatsApp inicializado com sucesso!');

    } catch (error) {
        logger.error(`❌ Erro ao inicializar WhatsApp: ${error.message}`);
        connectionStatus.status = 'error';
        connectionStatus.error = error.message;
        connectionStatus.lastUpdate = new Date().toISOString();
    }
}

function setupEventListeners(client) {
    // Mensagem recebida
    client.onMessage(async (message) => {
        logger.info(`📩 Mensagem recebida de ${message.from}: ${message.body?.substring(0, 50)}...`);
        
        // Enviar para webhook do AvAdmin
        try {
            await fetch(config.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'message_received',
                    message: {
                        id: message.id,
                        from: message.from,
                        to: message.to,
                        body: message.body,
                        type: message.type,
                        timestamp: message.timestamp,
                        isGroupMsg: message.isGroupMsg
                    }
                })
            });
        } catch (error) {
            logger.error(`❌ Erro ao enviar webhook: ${error.message}`);
        }
    });

    // Status de mensagem
    client.onAck(async (ack) => {
        const statusMap = {
            '-1': 'error',
            '0': 'pending',
            '1': 'sent',
            '2': 'received',
            '3': 'read',
            '4': 'played'
        };
        
        logger.info(`📊 ACK: ${ack.id?.id} -> ${statusMap[ack.ack] || ack.ack}`);
    });

    // Desconexão
    client.onStateChange((state) => {
        logger.info(`🔄 Estado alterado: ${state}`);
        
        if (state === 'CONFLICT' || state === 'UNLAUNCHED') {
            client.useHere();
        }
    });

    // Quando o stream for fechado
    client.onStreamChange((state) => {
        logger.info(`📡 Stream: ${state}`);
    });
}

// ==========================================
// ROTAS DA API
// ==========================================

// Status
app.get('/api/status', async (req, res) => {
    // Tentar obter status do cache primeiro
    let cachedStatus = null;
    if (redisClient) {
        cachedStatus = await redisClient.get('wpp_status').catch(() => null);
    }

    res.json({
        service: 'wppconnect',
        ...connectionStatus,
        cached: !!cachedStatus,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: connectionStatus.status === 'connected' ? 'healthy' : 'unhealthy',
        connected: connectionStatus.status === 'connected'
    });
});

// Obter QR Code (com cache)
app.get('/api/qrcode', async (req, res) => {
    if (connectionStatus.status === 'connected') {
        return res.json({
            status: 'connected',
            message: 'WhatsApp já está conectado'
        });
    }
    
    let qrCode = connectionStatus.qrCode;
    
    // Tentar obter QR Code do cache se não estiver em memória
    if (!qrCode && redisClient) {
        qrCode = await redisClient.get('wpp_qrcode').catch(() => null);
        if (qrCode) {
            logger.info('📦 QR Code recuperado do cache Redis');
        }
    }
    
    if (qrCode) {
        res.json({
            status: 'waiting_scan',
            qrcode: qrCode,
            qrCode: qrCode
        });
    } else {
        res.json({
            status: 'error',
            message: 'QR Code não disponível. Aguarde ou reinicie o servidor. Se acabou de subir o container, espere 1–2 minutos e tente novamente.'
        });
    }
});

// Enviar mensagem de texto
app.post('/api/send-message', async (req, res) => {
    const { phone, message, isGroup = false, typing = true, typingDuration } = req.body;
    
    if (!phone || !message) {
        return res.status(400).json({ error: 'phone e message são obrigatórios' });
    }
    
    if (!whatsappClient || connectionStatus.status !== 'connected') {
        return res.status(503).json({ 
            error: 'WhatsApp não está conectado',
            status: connectionStatus.status 
        });
    }
    
    try {
        // Formatar número
        let formattedPhone = phone.replace(/\D/g, '');
        if (!formattedPhone.includes('@')) {
            formattedPhone = isGroup ? `${formattedPhone}@g.us` : `${formattedPhone}@c.us`;
        }
        
        logger.info(`📤 Enviando mensagem para ${formattedPhone}...`);
        
        // Simulação de "digitando..." se habilitado
        if (typing !== false) {
            const duration = typingDuration || Math.min(Math.max(message.length * 50, 2000), 8000);
            logger.info(`⌨️ Simulando digitação por ${duration}ms...`);
            await whatsappClient.startTyping(formattedPhone);
            await new Promise(r => setTimeout(r, duration));
            await whatsappClient.stopTyping(formattedPhone);
        }
        
        const result = await whatsappClient.sendText(formattedPhone, message);
        
        const messageRecord = {
            id: result.id || uuidv4(),
            to: formattedPhone,
            message: message,
            status: 'sent',
            timestamp: new Date().toISOString()
        };
        
        sentMessages.push(messageRecord);
        
        logger.info(`✅ Mensagem enviada: ${messageRecord.id}`);
        
        res.json({
            success: true,
            id: messageRecord.id,
            to: formattedPhone,
            status: 'sent'
        });
        
    } catch (error) {
        logger.error(`❌ Erro ao enviar mensagem: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Enviar imagem
app.post('/api/send-image', async (req, res) => {
    const { phone, imageUrl, caption = '', typing = true, typingDuration } = req.body;
    
    if (!phone || !imageUrl) {
        return res.status(400).json({ error: 'phone e imageUrl são obrigatórios' });
    }
    
    if (!whatsappClient || connectionStatus.status !== 'connected') {
        return res.status(503).json({ error: 'WhatsApp não está conectado' });
    }
    
    try {
        let formattedPhone = phone.replace(/\D/g, '');
        if (!formattedPhone.includes('@')) {
            formattedPhone = `${formattedPhone}@c.us`;
        }
        
        // Simulação de "digitando..." se habilitado
        if (typing !== false) {
            const duration = typingDuration || Math.min(Math.max(caption.length * 50, 2000), 8000);
            logger.info(`⌨️ Simulando digitação por ${duration}ms...`);
            await whatsappClient.startTyping(formattedPhone);
            await new Promise(r => setTimeout(r, duration));
            await whatsappClient.stopTyping(formattedPhone);
        }
        
        const result = await whatsappClient.sendImage(
            formattedPhone,
            imageUrl,
            'image',
            caption
        );
        
        res.json({
            success: true,
            id: result.id || uuidv4(),
            to: formattedPhone,
            status: 'sent'
        });
        
    } catch (error) {
        logger.error(`❌ Erro ao enviar imagem: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Enviar arquivo
app.post('/api/send-file', async (req, res) => {
    const { phone, fileUrl, fileName, caption = '', typing = true, typingDuration } = req.body;
    
    if (!phone || !fileUrl) {
        return res.status(400).json({ error: 'phone e fileUrl são obrigatórios' });
    }
    
    if (!whatsappClient || connectionStatus.status !== 'connected') {
        return res.status(503).json({ error: 'WhatsApp não está conectado' });
    }
    
    try {
        let formattedPhone = phone.replace(/\D/g, '');
        if (!formattedPhone.includes('@')) {
            formattedPhone = `${formattedPhone}@c.us`;
        }
        
        // Simulação de "digitando..." se habilitado
        if (typing !== false) {
            const duration = typingDuration || Math.min(Math.max(caption.length * 50, 2000), 8000);
            logger.info(`⌨️ Simulando digitação por ${duration}ms...`);
            await whatsappClient.startTyping(formattedPhone);
            await new Promise(r => setTimeout(r, duration));
            await whatsappClient.stopTyping(formattedPhone);
        }
        
        const result = await whatsappClient.sendFile(
            formattedPhone,
            fileUrl,
            fileName || 'file',
            caption
        );
        
        res.json({
            success: true,
            id: result.id || uuidv4(),
            to: formattedPhone,
            status: 'sent'
        });
        
    } catch (error) {
        logger.error(`❌ Erro ao enviar arquivo: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obter todos os contatos
app.get('/api/contacts', async (req, res) => {
    if (!whatsappClient || connectionStatus.status !== 'connected') {
        return res.status(503).json({ error: 'WhatsApp não está conectado' });
    }
    
    try {
        const contacts = await whatsappClient.getAllContacts();
        
        const formattedContacts = contacts.map(contact => ({
            id: contact.id?._serialized || contact.id,
            phone: contact.id?.user || contact.number,
            name: contact.name || contact.pushname || contact.verifiedName || '',
            pushname: contact.pushname || '',
            verifiedName: contact.verifiedName || '',
            isBusiness: contact.isBusiness || false,
            isGroup: contact.isGroup || false,
            profilePicUrl: contact.profilePicThumb?.eurl || '',
            status: contact.status || ''
        })).filter(c => !c.isGroup && c.phone); // Remove grupos e contatos sem telefone
        
        logger.info(`📋 ${formattedContacts.length} contatos retornados`);
        
        res.json({
            success: true,
            count: formattedContacts.length,
            contacts: formattedContacts
        });
        
    } catch (error) {
        logger.error(`❌ Erro ao obter contatos: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obter todos os chats
app.get('/api/chats', async (req, res) => {
    if (!whatsappClient || connectionStatus.status !== 'connected') {
        return res.status(503).json({ error: 'WhatsApp não está conectado' });
    }
    
    try {
        const chats = await whatsappClient.getAllChats();
        
        const formattedChats = chats.map(chat => ({
            id: chat.id?._serialized || chat.id,
            phone: chat.id?.user || '',
            name: chat.name || chat.pushname || chat.verifiedName || '',
            pushname: chat.pushname || '',
            verifiedName: chat.verifiedName || '',
            isGroup: chat.isGroup || false,
            unreadCount: chat.unreadCount || 0,
            timestamp: chat.timestamp || 0,
            lastMessage: chat.lastMessage?.body || ''
        })).filter(c => !c.isGroup && c.phone); // Remove grupos e chats sem telefone
        
        logger.info(`💬 ${formattedChats.length} chats retornados`);
        
        res.json({
            success: true,
            count: formattedChats.length,
            chats: formattedChats
        });
        
    } catch (error) {
        logger.error(`❌ Erro ao obter chats: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obter contatos combinados (contatos salvos + chats recentes)
app.get('/api/contacts/all', async (req, res) => {
    if (!whatsappClient || connectionStatus.status !== 'connected') {
        return res.status(503).json({ error: 'WhatsApp não está conectado' });
    }
    
    try {
        // Buscar contatos salvos
        const contacts = await whatsappClient.getAllContacts();
        const savedContacts = contacts.map(contact => ({
            id: contact.id?._serialized || contact.id,
            phone: contact.id?.user || contact.number,
            name: contact.name || '',
            pushname: contact.pushname || '',
            verifiedName: contact.verifiedName || '',
            isBusiness: contact.isBusiness || false,
            isGroup: contact.isGroup || false,
            isSaved: true,
            source: 'contacts'
        })).filter(c => !c.isGroup && c.phone);
        
        // Buscar chats recentes
        const chats = await whatsappClient.getAllChats();
        const chatContacts = chats.map(chat => ({
            id: chat.id?._serialized || chat.id,
            phone: chat.id?.user || '',
            name: chat.name || '',
            pushname: chat.pushname || '',
            verifiedName: chat.verifiedName || '',
            isGroup: chat.isGroup || false,
            isSaved: false,
            source: 'chats'
        })).filter(c => !c.isGroup && c.phone);
        
        // Combinar e remover duplicados (preferir contatos salvos)
        const contactMap = new Map();
        
        // Primeiro adicionar chats
        chatContacts.forEach(contact => {
            contactMap.set(contact.phone, contact);
        });
        
        // Sobrescrever com contatos salvos (que têm prioridade)
        savedContacts.forEach(contact => {
            contactMap.set(contact.phone, contact);
        });
        
        const allContacts = Array.from(contactMap.values());
        
        // Ordenar por nome (ou pushname se não tiver nome)
        allContacts.sort((a, b) => {
            const nameA = (a.name || a.pushname || a.verifiedName || a.phone).toLowerCase();
            const nameB = (b.name || b.pushname || b.verifiedName || b.phone).toLowerCase();
            return nameA.localeCompare(nameB);
        });
        
        logger.info(`📋 ${allContacts.length} contatos combinados retornados (${savedContacts.length} salvos + ${chatContacts.length} chats)`);
        
        res.json({
            success: true,
            count: allContacts.length,
            savedCount: savedContacts.length,
            chatsCount: chatContacts.length,
            contacts: allContacts
        });
        
    } catch (error) {
        logger.error(`❌ Erro ao obter contatos combinados: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Verificar número válido
app.get('/api/check-number/:phone', async (req, res) => {
    const { phone } = req.params;
    
    if (!whatsappClient || connectionStatus.status !== 'connected') {
        return res.status(503).json({ error: 'WhatsApp não está conectado' });
    }
    
    try {
        let formattedPhone = phone.replace(/\D/g, '');
        const result = await whatsappClient.checkNumberStatus(`${formattedPhone}@c.us`);
        
        res.json({
            phone: formattedPhone,
            valid: result.status === 200,
            status: result.status,
            canReceiveMessage: result.canReceiveMessage
        });
        
    } catch (error) {
        logger.error(`❌ Erro ao verificar número: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Listar mensagens enviadas (com cache)
app.get('/api/messages', async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    
    // Cachear lista de mensagens por 60 segundos
    if (redisClient) {
        const cachedMessages = await redisClient.get('wpp_messages').catch(() => null);
        if (cachedMessages) {
            logger.info('📦 Mensagens recuperadas do cache Redis');
            return res.json(JSON.parse(cachedMessages));
        }
    }
    
    const response = {
        total: sentMessages.length,
        messages: sentMessages.slice(-limit)
    };
    
    if (redisClient) {
        redisClient.setEx('wpp_messages', 60, JSON.stringify(response)).catch(err =>
            logger.warn(`⚠️ Redis setEx erro: ${err.message}`)
        );
    }
    
    res.json(response);
});

// Reiniciar sessão
app.post('/api/restart', async (req, res) => {
    logger.info('🔄 Reiniciando sessão WhatsApp...');
    
    try {
        if (whatsappClient) {
            await whatsappClient.close();
        }
        
        connectionStatus.status = 'restarting';
        connectionStatus.qrCode = null;
        
        setTimeout(() => {
            initializeWhatsApp();
        }, 2000);
        
        res.json({ success: true, message: 'Reiniciando...' });
        
    } catch (error) {
        logger.error(`❌ Erro ao reiniciar: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Desconectar
app.post('/api/disconnect', async (req, res) => {
    logger.info('🔌 Desconectando WhatsApp...');
    
    try {
        if (whatsappClient) {
            await whatsappClient.logout();
            await whatsappClient.close();
            whatsappClient = null;
        }
        
        connectionStatus.status = 'disconnected';
        connectionStatus.qrCode = null;
        
        res.json({ success: true, message: 'Desconectado' });
        
    } catch (error) {
        logger.error(`❌ Erro ao desconectar: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obter info do perfil conectado
app.get('/api/profile', async (req, res) => {
    if (!whatsappClient || connectionStatus.status !== 'connected') {
        return res.status(503).json({ error: 'WhatsApp não está conectado' });
    }
    
    try {
        const hostDevice = await whatsappClient.getHostDevice();
        
        res.json({
            phone: hostDevice.id?.user,
            name: hostDevice.pushname,
            platform: hostDevice.platform,
            connected: true
        });
        
    } catch (error) {
        logger.error(`❌ Erro ao obter perfil: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// INICIALIZAÇÃO DO SERVIDOR
// ==========================================

app.listen(config.port, async () => {
    logger.info('='.repeat(50));
    logger.info('🚀 AVELAR WPPCONNECT SERVER');
    logger.info('='.repeat(50));
    logger.info(`📡 Servidor rodando em http://localhost:${config.port}`);
    logger.info(`📋 Sessão: ${config.sessionName}`);
    logger.info(`🔑 Secret Key: ${config.secretKey.substring(0, 10)}...`);
    logger.info(`🗜️ Compressão: Ativada (threshold: 1KB)`);
    logger.info('='.repeat(50));
    
    // Inicializar Redis
    await initializeRedis();
    
    // Inicializar WhatsApp
    initializeWhatsApp();
});

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('🛑 Encerrando servidor...');
    
    if (whatsappClient) {
        await whatsappClient.close();
    }
    
    if (redisClient) {
        await redisClient.quit();
    }
    
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('🛑 Encerrando servidor (SIGTERM)...');
    
    if (whatsappClient) {
        await whatsappClient.close();
    }
    
    if (redisClient) {
        await redisClient.quit();
    }
    
    process.exit(0);
});

