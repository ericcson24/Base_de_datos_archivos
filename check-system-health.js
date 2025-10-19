#!/usr/bin/env node

/**
 * Script de Verificación del Sistema de Sincronización
 * NubeDistribuible - Diagnóstico y Estado del Sistema
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

class SystemHealthChecker {
    constructor() {
        this.projectRoot = process.cwd();
        this.results = {
            overall: 'unknown',
            checks: []
        };
    }

    async checkSystemHealth() {
        console.log('🔍 VERIFICACIÓN DE SALUD DEL SISTEMA');
        console.log('='.repeat(50));
        console.log('');

        await this.checkEnvironmentFile();
        await this.checkCriticalFiles();
        await this.checkDirectories();
        await this.checkDependencies();
        await this.checkMongoDB();
        await this.checkPorts();
        await this.generateReport();
    }

    async checkEnvironmentFile() {
        console.log('📋 Verificando archivo de configuración...');
        
        const envPath = path.join(this.projectRoot, '.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            
            // Verificar variables críticas
            const criticalVars = [
                'PORT', 'MONGODB_URL', 'SESSION_SECRET',
                'SYNC_PORT', 'JWT_SECRET', 'ENCRYPTION_KEY'
            ];
            
            const missingVars = [];
            for (const varName of criticalVars) {
                if (!envContent.includes(`${varName}=`)) {
                    missingVars.push(varName);
                }
            }
            
            if (missingVars.length === 0) {
                this.addCheck('env_file', true, 'Archivo .env completo');
            } else {
                this.addCheck('env_file', false, `Variables faltantes: ${missingVars.join(', ')}`);
            }
        } else {
            this.addCheck('env_file', false, 'Archivo .env no encontrado');
        }
        console.log('');
    }

    async checkCriticalFiles() {
        console.log('📁 Verificando archivos del sistema...');
        
        const criticalFiles = [
            { path: 'server/server.js', name: 'Servidor principal' },
            { path: 'sync-system/services/SyncService.js', name: 'Servicio de sincronización' },
            { path: 'sync-system/core/SyncEngine.js', name: 'Motor de sincronización' },
            { path: 'sync-system/ai/SyncAI.js', name: 'Motor de IA' },
            { path: 'src/components/SyncButton.jsx', name: 'Componente React principal' },
            { path: 'package.json', name: 'Configuración de dependencias' }
        ];
        
        let allFilesPresent = true;
        for (const file of criticalFiles) {
            const filePath = path.join(this.projectRoot, file.path);
            if (fs.existsSync(filePath)) {
                console.log(`✅ ${file.name}`);
            } else {
                console.log(`❌ ${file.name} - FALTANTE`);
                allFilesPresent = false;
            }
        }
        
        this.addCheck('critical_files', allFilesPresent, 
            allFilesPresent ? 'Todos los archivos presentes' : 'Algunos archivos faltantes');
        console.log('');
    }

    async checkDirectories() {
        console.log('📂 Verificando estructura de directorios...');
        
        const requiredDirs = [
            { path: 'logs', name: 'Directorio de logs', canCreate: true },
            { path: 'backups', name: 'Directorio de backups', canCreate: true },
            { path: 'data', name: 'Directorio de datos', canCreate: true },
            { path: 'sync-system', name: 'Sistema de sincronización', canCreate: false },
            { path: 'src/components', name: 'Componentes React', canCreate: false }
        ];
        
        let allDirsOk = true;
        for (const dir of requiredDirs) {
            const dirPath = path.join(this.projectRoot, dir.path);
            if (fs.existsSync(dirPath)) {
                console.log(`✅ ${dir.name}`);
            } else if (dir.canCreate) {
                try {
                    fs.mkdirSync(dirPath, { recursive: true });
                    console.log(`✅ ${dir.name} - CREADO`);
                } catch (error) {
                    console.log(`❌ ${dir.name} - ERROR: ${error.message}`);
                    allDirsOk = false;
                }
            } else {
                console.log(`❌ ${dir.name} - FALTANTE`);
                allDirsOk = false;
            }
        }
        
        this.addCheck('directories', allDirsOk, 
            allDirsOk ? 'Estructura de directorios OK' : 'Problemas con directorios');
        console.log('');
    }

    async checkDependencies() {
        console.log('📦 Verificando dependencias...');
        
        try {
            const packagePath = path.join(this.projectRoot, 'package.json');
            if (!fs.existsSync(packagePath)) {
                this.addCheck('dependencies', false, 'package.json no encontrado');
                return;
            }
            
            const nodeModulesPath = path.join(this.projectRoot, 'node_modules');
            if (!fs.existsSync(nodeModulesPath)) {
                this.addCheck('dependencies', false, 'node_modules no encontrado - ejecuta npm install');
                console.log('❌ node_modules no encontrado');
                return;
            }
            
            // Verificar dependencias críticas
            const criticalDeps = [
                'express', 'socket.io', 'mongoose', 'chokidar',
                'jsonwebtoken', 'react', 'uuid'
            ];
            
            let allDepsPresent = true;
            for (const dep of criticalDeps) {
                const depPath = path.join(nodeModulesPath, dep);
                if (fs.existsSync(depPath)) {
                    console.log(`✅ ${dep}`);
                } else {
                    console.log(`❌ ${dep} - FALTANTE`);
                    allDepsPresent = false;
                }
            }
            
            this.addCheck('dependencies', allDepsPresent, 
                allDepsPresent ? 'Todas las dependencias instaladas' : 'Algunas dependencias faltantes');
                
        } catch (error) {
            this.addCheck('dependencies', false, `Error verificando dependencias: ${error.message}`);
        }
        console.log('');
    }

    async checkMongoDB() {
        console.log('🗄️  Verificando MongoDB...');
        
        try {
            await this.runCommand('mongosh', ['--eval', 'db.version()'], false);
            this.addCheck('mongodb', true, 'MongoDB accesible');
            console.log('✅ MongoDB corriendo y accesible');
        } catch (error) {
            this.addCheck('mongodb', false, 'MongoDB no accesible');
            console.log('❌ MongoDB no accesible');
            console.log('💡 Asegúrate de que MongoDB esté corriendo: mongod');
        }
        console.log('');
    }

    async checkPorts() {
        console.log('🔌 Verificando puertos...');
        
        const ports = [
            { port: 3000, name: 'Frontend React' },
            { port: 5000, name: 'Backend Express' },
            { port: 5001, name: 'Servicio de Sincronización' }
        ];
        
        for (const portInfo of ports) {
            try {
                const isInUse = await this.isPortInUse(portInfo.port);
                if (isInUse) {
                    console.log(`⚠️  Puerto ${portInfo.port} (${portInfo.name}) - EN USO`);
                } else {
                    console.log(`✅ Puerto ${portInfo.port} (${portInfo.name}) - DISPONIBLE`);
                }
            } catch (error) {
                console.log(`❓ Puerto ${portInfo.port} (${portInfo.name}) - ERROR: ${error.message}`);
            }
        }
        
        this.addCheck('ports', true, 'Verificación de puertos completada');
        console.log('');
    }

    async generateReport() {
        console.log('📊 RESUMEN DE VERIFICACIÓN');
        console.log('='.repeat(50));
        
        const passedChecks = this.results.checks.filter(check => check.passed).length;
        const totalChecks = this.results.checks.length;
        
        console.log(`✅ Verificaciones exitosas: ${passedChecks}/${totalChecks}`);
        console.log('');
        
        // Mostrar problemas encontrados
        const failedChecks = this.results.checks.filter(check => !check.passed);
        if (failedChecks.length > 0) {
            console.log('❌ PROBLEMAS ENCONTRADOS:');
            failedChecks.forEach(check => {
                console.log(`   • ${check.name}: ${check.message}`);
            });
            console.log('');
        }
        
        // Determinar estado general
        const healthScore = (passedChecks / totalChecks) * 100;
        if (healthScore >= 90) {
            this.results.overall = 'excellent';
            console.log('🎉 ESTADO GENERAL: EXCELENTE');
            console.log('✅ El sistema está listo para usar');
        } else if (healthScore >= 70) {
            this.results.overall = 'good';
            console.log('👍 ESTADO GENERAL: BUENO');
            console.log('⚠️  Algunos problemas menores detectados');
        } else if (healthScore >= 50) {
            this.results.overall = 'fair';
            console.log('⚠️  ESTADO GENERAL: REGULAR');
            console.log('🔧 Se requieren ajustes antes del uso');
        } else {
            this.results.overall = 'poor';
            console.log('❌ ESTADO GENERAL: PROBLEMAS CRÍTICOS');
            console.log('🚨 Sistema requiere configuración antes del uso');
        }
        
        console.log('');
        console.log('💡 COMANDOS ÚTILES:');
        console.log('   npm run init-sync  - Reinicializar sistema');
        console.log('   npm run dev        - Iniciar en desarrollo');
        console.log('   npm run test-sync  - Probar conexión de sincronización');
        console.log('   npm audit fix      - Corregir vulnerabilidades');
    }

    addCheck(name, passed, message) {
        this.results.checks.push({ name, passed, message });
    }

    isPortInUse(port) {
        return new Promise((resolve) => {
            const server = http.createServer();
            server.listen(port, () => {
                server.close(() => resolve(false));
            });
            server.on('error', () => resolve(true));
        });
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

// Ejecutar verificación si se llama directamente
if (require.main === module) {
    const checker = new SystemHealthChecker();
    checker.checkSystemHealth();
}

module.exports = SystemHealthChecker;