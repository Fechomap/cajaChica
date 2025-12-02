/**
 * Estado en memoria para manejar confirmaciones pendientes y conceptos.
 * En producción esto debería estar en Redis para persistencia.
 */

export interface PendingConfirmation {
  chatId: number;
  tipo: 'iniciarCaja' | 'agregarDinero' | 'restarDinero';
  cantidad?: number;
  concepto?: string;
}

export interface WaitingForConcept {
  chatId: number;
  tipo: 'agregarDinero' | 'restarDinero';
}

class SessionState {
  pendingConfirmations: Map<number, PendingConfirmation> = new Map();
  waitingForConcept: Map<number, WaitingForConcept> = new Map();

  setPendingConfirmation(userId: number, data: PendingConfirmation): void {
    this.pendingConfirmations.set(userId, data);
  }

  getPendingConfirmation(userId: number): PendingConfirmation | undefined {
    return this.pendingConfirmations.get(userId);
  }

  deletePendingConfirmation(userId: number): void {
    this.pendingConfirmations.delete(userId);
  }

  setWaitingForConcept(userId: number, data: WaitingForConcept): void {
    this.waitingForConcept.set(userId, data);
  }

  getWaitingForConcept(userId: number): WaitingForConcept | undefined {
    return this.waitingForConcept.get(userId);
  }

  deleteWaitingForConcept(userId: number): void {
    this.waitingForConcept.delete(userId);
  }
}

// Singleton
export const sessionState = new SessionState();
