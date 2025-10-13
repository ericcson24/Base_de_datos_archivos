const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

// Define cache location - use absolute path to avoid relative path issues
const CACHE_FILE = path.resolve(__dirname, '../data/token-cache.json');

// Ensure directory exists
const dir = path.dirname(CACHE_FILE);
if (!fs.existsSync(dir)) {
    mkdirp.sync(dir);
    console.log('Created cache directory:', dir);
}

if (fs.existsSync(CACHE_FILE)) {
    fs.chmodSync(CACHE_FILE, 0o600); // Read/write for owner only
}

const beforeCacheAccess = async (cacheContext) => {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const data = fs.readFileSync(CACHE_FILE, 'utf-8');
            console.log(`Reading token cache: ${CACHE_FILE} (${data.length} bytes)`);
            cacheContext.tokenCache.deserialize(data);
        } else {
            console.log('Token cache file does not exist yet:', CACHE_FILE);
        }
    } catch (error) {
        console.error('Error reading token cache:', error);
    }
};

const afterCacheAccess = async (cacheContext) => {
    if (cacheContext.cacheHasChanged) {
        try {
            const serializedCache = cacheContext.tokenCache.serialize();
            fs.writeFileSync(CACHE_FILE, serializedCache);
            console.log(`Token cache saved: ${CACHE_FILE} (${serializedCache.length} bytes)`);
            
            // Diagnostic - check if cache contains refresh tokens
            if (serializedCache.includes('refreshToken')) {
                console.log('Cache contains refresh tokens ✅');
            } else {
                console.log('Warning: Cache doesn\'t contain refresh tokens ❌');
            }
        } catch (error) {
            console.error('Error writing token cache:', error);
        }
    }
};

module.exports = { beforeCacheAccess, afterCacheAccess };