// Servicio simple de estado en memoria
// TODO: Migrar a Redis para persistencia entre reinicios
class StateService {
  constructor() {
    this.states = new Map();
    this.TTL = 30 * 60 * 1000; // 30 minutos por defecto
  }

  async setState(userId, key, value, ttl = this.TTL) {
    const userStates = this.states.get(userId) || new Map();
    
    userStates.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
    
    this.states.set(userId, userStates);
    
    // Limpiar estados expirados
    this._cleanupExpired();
  }

  async getState(userId, key) {
    const userStates = this.states.get(userId);
    if (!userStates) return null;
    
    const state = userStates.get(key);
    if (!state) return null;
    
    // Verificar si expiró
    if (Date.now() > state.expiresAt) {
      userStates.delete(key);
      return null;
    }
    
    return state.value;
  }

  async clearState(userId, key) {
    const userStates = this.states.get(userId);
    if (!userStates) return;
    
    userStates.delete(key);
    
    if (userStates.size === 0) {
      this.states.delete(userId);
    }
  }

  async clearAllStates(userId) {
    this.states.delete(userId);
  }

  _cleanupExpired() {
    const now = Date.now();
    
    for (const [userId, userStates] of this.states) {
      for (const [key, state] of userStates) {
        if (now > state.expiresAt) {
          userStates.delete(key);
        }
      }
      
      if (userStates.size === 0) {
        this.states.delete(userId);
      }
    }
  }
}

module.exports = new StateService();