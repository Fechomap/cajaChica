// Crear un nuevo archivo dbHelper.js
async function withRetry(operation, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await operation();
            return result;
        } catch (error) {
            console.error(`Intento ${attempt}/${maxRetries} fallido:`, error);
            lastError = error;
            
            if (attempt < maxRetries) {
                // Esperar antes del siguiente intento (tiempo exponencial)
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }
    
    throw lastError;
}

module.exports = { withRetry };