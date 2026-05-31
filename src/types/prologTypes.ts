export interface PrologAlert {
    severity: string;
    type: string;
    payload: Record<string, unknown>;
}

export interface PrologStats {
    total_events: number;
    failed_logins: number;
    successful_logins: number;
    unique_users: number;
}

export interface PrologLog {
    timestamp: number;
    usuario: string;
    ip: string;
    accion: string;
    resultado: string;
}
