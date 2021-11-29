/**
 *Transaction service related
 */
export class TransactionService {
  private static _instance: TransactionService;
  private updates: any[] = [];
  private inserts: any[] = [];

  constructor() {
    this.updates = [];
    this.inserts = [];
  }

  /**
   * Single instance
   * @returns RelationService
   */
  public static getInstance(newInstance: boolean = false): TransactionService {
    if (newInstance) {
      TransactionService._instance = new TransactionService();
    }
    return TransactionService._instance;
  }

  addUpdateQuery(query: any): void {
    this.updates.push(query);
  }

  addInsertQuery(query: any): void {
    this.inserts.push(query);
  }

  getQueries() {
    return {
      updates: this.updates || [],
      inserts: this.inserts || [],
    };
  }

  getUpdates() {
    return this.updates;
  }

  getInserts() {
    return this.inserts;
  }
}
