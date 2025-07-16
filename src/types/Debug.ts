export interface TableSchema {
  tableName: string;
  columns: string[];
  description: string;
}

export interface DebugData {
  [tableName: string]: any[];
}
