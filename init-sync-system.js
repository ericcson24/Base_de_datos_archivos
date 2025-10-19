#!/usr/bin/env node

/**
 * Script de Inicialización del Sistema de Sincronización Inteligente
 * NubeDistribuible - Sistema de Sincronización con IA
 * 
 * Este script configura automáticamente el sistema de sincronización:
 * - Verifica dependencias
 * - Configura base de datos
 * - Inicializa servicios
 * - Ejecuta verificaciones de sistema
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');

class SyncSystemInitializer {
    constructor() {
        this.projectRoot = process.cwd();
        this.envPath = path.join(this.projectRoot, '.env');
        this.envExamplePath = path.join(this.projectRoot, '.env.example');
        
        console.log('🚀 Inicializando Sistema de Sincronización Inteligente');
        console.log('='.repeat(60));
    }

    async initialize() {
        try {
            await this.checkPrerequisites();
            await this.createEnvironmentFile();
            await this.installDependencies();
            await this.setupDatabase();
            await this.verifyServices();
            await this.showSuccessMessage();
        } catch (error) {
            console.error('❌ Error durante la inicialización:', error.message);
            process.exit(1);
        }
    }

    async checkPrerequisites() {
        console.log('📋 Verificando prerequisitos...');
        
        // Verificar Node.js
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        
        if (majorVersion < 16) {
            throw new Error(`Node.js ${nodeVersion} detectado. Se requiere Node.js 16 o superior.`);
        }
        console.log(`✅ Node.js ${nodeVersion} - OK`);

        // Verificar MongoDB
        try {
            await this.runCommand('mongosh', ['--version'], false);
            console.log('✅ MongoDB detectado - OK');
        } catch (error) {
            console.log('⚠️  MongoDB no detectado - Asegúrate de tenerlo instalado y corriendo');
        }

        // Verificar npm/yarn
        try {
            await this.runCommand('npm', ['--version'], false);
            console.log('✅ npm detectado - OK');
        } catch (error) {
            throw new Error('npm no encontrado. Instala Node.js con npm.');
        }

        console.log('');
    }

    async createEnvironmentFile() {
        console.log('📝 Configurando archivo de ambiente...');

        if (fs.existsSync(this.envPath)) {
            console.log('⚠️  .env ya existe, saltando creación...');
            return;
        }

        if (!fs.existsSync(this.envExamplePath)) {
            console.log('⚠️  .env.example no encontrado, creando configuración básica...');
            await this.createBasicEnvFile();
        } else {
            // Copiar .env.example a .env
            const envContent = fs.readFileSync(this.envExamplePath, 'utf8');
            fs.writeFileSync(this.envPath, envContent);
        }

        // Generar claves seguras
        await this.generateSecureKeys();
        
        console.log('✅ Archivo .env creado con claves seguras');
        console.log('');
    }

    async createBasicEnvFile() {
        const basicEnv = `# NubeDistribuible - Configuración Básica
PORT=5000
MONGODB_URL=mongodb://localhost:27017/nube_distribuible
SESSION_SECRET=${this.generateRandomKey(64)}
CLIENT_URL=http://localhost:3000

# Servicio de Sincronización
SYNC_PORT=5001
MAX_CONCURRENT_SYNCS=5
SYNC_INTERVAL=30000
RETRY_ATTEMPTS=3
BATCH_SIZE=10

# Seguridad
JWT_SECRET=${this.generateRandomKey(64)}
ENCRYPTION_KEY=${this.generateRandomKey(32)}
JWT_EXPIRATION=86400

# IA
AI_LEARNING_INTERVAL=86400000
AI_CONFIDENCE_THRESHOLD=0.7
AI_MAX_PATTERNS=1000

# Límites
MAX_FILE_SIZE=104857600
BANDWIDTH_LIMIT_PER_USER=1048576
MAX_QUEUE_SIZE=100

# Logging
LOG_LEVEL=info
LOG_DIR=./logs
LOG_ROTATION_DAYS=7

# Desarrollo
NODE_ENV=development
HOT_RELOAD=true
DEV_PORT=3000
`;
        fs.writeFileSync(this.envPath, basicEnv);
    }

    async generateSecureKeys() {
        let envContent = fs.readFileSync(this.envPath, 'utf8');

        // Reemplazar placeholders con claves reales
        envContent = envContent.replace(
            'tu_clave_secreta_super_segura_aqui_123456789',
            this.generateRandomKey(64)
        );
        
        envContent = envContent.replace(
            'jwt_secret_key_muy_seguro_para_tokens',
            this.generateRandomKey(64)
        );
        
        envContent = envContent.replace(
            'encryption_key_32_chars_long_1234',
            this.generateRandomKey(32)
        );

        fs.writeFileSync(this.envPath, envContent);
    }

    generateRandomKey(length) {
        return crypto.randomBytes(length).toString('hex').substring(0, length);
    }

    async installDependencies() {
        console.log('📦 Instalando dependencias...');
        
        try {
            await this.runCommand('npm', ['install'], true);
            console.log('✅ Dependencias instaladas correctamente');
        } catch (error) {
            console.log('⚠️  Error instalando dependencias:', error.message);
            console.log('💡 Intenta ejecutar: npm install --legacy-peer-deps');
        }
        
        console.log('');
    }

    async setupDatabase() {
        console.log('🗄️  Configurando base de datos...');

        try {
            // Crear directorio para logs si no existe
            const logsDir = path.join(this.projectRoot, 'logs');
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
                console.log('✅ Directorio de logs creado');
            }

            // Crear directorio para backups si no existe
            const backupsDir = path.join(this.projectRoot, 'backups');
            if (!fs.existsSync(backupsDir)) {
                fs.mkdirSync(backupsDir, { recursive: true });
                console.log('✅ Directorio de backups creado');
            }

            // Crear directorio para datos temporales
            const dataDir = path.join(this.projectRoot, 'data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
                console.log('✅ Directorio de datos creado');
            }

            console.log('✅ Estructura de directorios configurada');
        } catch (error) {
            console.log('⚠️  Error configurando directorios:', error.message);
        }

        console.log('');
    }

    async verifyServices() {
        console.log('🔍 Verificando servicios del sistema...');

        // Verificar que los archivos principales existen
        const criticalFiles = [
            'sync-system/core/SyncEngine.js',
            'sync-system/ai/SyncAI.js',
            'sync-system/services/SyncService.js',
            'src/components/SyncButton.jsx',
            'src/components/SyncPanel/SyncPanel.jsx'
        ];

        let allFilesExist = true;
        for (const file of criticalFiles) {
            const filePath = path.join(this.projectRoot, file);
            if (fs.existsSync(filePath)) {
                console.log(`✅ ${file} - OK`);
            } else {
                console.log(`❌ ${file} - FALTANTE`);
                allFilesExist = false;
            }
        }

        if (!allFilesExist) {
            console.log('⚠️  Algunos archivos del sistema están faltantes');
            console.log('💡 Asegúrate de haber descargado todos los archivos del sistema');
        } else {
            console.log('✅ Todos los archivos del sistema presentes');
        }

        console.log('');
    }

    async showSuccessMessage() {
        console.log('🎉 ¡INICIALIZACIÓN COMPLETADA!');
        console.log('='.repeat(60));
        console.log('');
        console.log('📋 PRÓXIMOS PASOS:');
        console.log('');
        console.log('1. 🗄️  Asegúrate de que MongoDB esté corriendo:');
        console.log('   mongod --dbpath /tu/ruta/de/datos');
        console.log('');
        console.log('2. ⚙️  Revisa y ajusta la configuración en .env');
        console.log('');
        console.log('3. 🚀 Inicia el servidor de desarrollo:');
        console.log('   npm run dev');
        console.log('');
        console.log('4. 🌐 Accede a la aplicación:');
        console.log('   Frontend: http://localhost:3000');
        console.log('   Backend:  http://localhost:5000');
        console.log('   Sync API: http://localhost:5001');
        console.log('');
        console.log('📚 RECURSOS:');
        console.log('   📖 Documentación: SYNC_SYSTEM_README.md');
        console.log('   🔧 Configuración: .env');
        console.log('   📊 Logs: ./logs/');
        console.log('');
        console.log('🆘 SOPORTE:');
        console.log('   Si encuentras problemas, revisa el README.md');
        console.log('   para guías de resolución de problemas.');
        console.log('');
        console.log('¡Disfruta tu Sistema de Sincronización Inteligente! 🎯');
    }

    runCommand(command, args, showOutput = false) {
        return new Promise((resolve, reject) => {
            const process = spawn(command, args, {
                stdio: showOutput ? 'inherit' : 'pipe',
                shell: true
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`${command} falló con código ${code}`));
                }
            });

            process.on('error', (error) => {
                reject(error);
            });
        });
    }
}

// Ejecutar inicializador si se llama directamente
if (require.main === module) {
    const initializer = new SyncSystemInitializer();
    initializer.initialize();
}

module.exports = SyncSystemInitializer;