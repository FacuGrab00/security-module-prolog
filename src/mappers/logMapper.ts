import type {LogEntry} from '../types';
import type {PrologLog} from '../types/prologTypes';

export function prologLogToUI(l: PrologLog, i: number): LogEntry {
    return {
        id: String(i),
        timestamp: String(l.timestamp),
        user: String(l.usuario),
        ip: String(l.ip),
        result: l.resultado === 'exito' ? 'success' : 'failure',
        role: 'user' as const,
        action: String(l.accion).toUpperCase(),
        country: 'AR',
    };
}
