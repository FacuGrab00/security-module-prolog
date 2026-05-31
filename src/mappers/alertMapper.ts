import type {SecurityAlert} from '../types';
import type {PrologAlert} from '../types/prologTypes';
import {RULE_CODE, TYPE_LABEL} from '../data/alertConstants';

function mapSeverity(s: string): SecurityAlert['severity'] {
    if (s === 'critica') return 'critical';
    if (s === 'alta') return 'high';
    if (s === 'media') return 'medium';
    return 'low';
}

function buildDescription(type: string, p: Record<string, unknown>): string {
    const u = p.user as string;
    const ip = p.ip as string;
    switch (type) {
        case 'ataque_fuerza_bruta':
            return `Usuario "${u}" registró 5+ intentos fallidos de login desde IP ${ip}.`;
        case 'ataque_masivo_ip':
            return `IP ${ip} intentó acceder con múltiples usuarios distintos (ataque distribuido).`;
        case 'acceso_ip_prohibida':
            return `Acceso registrado desde IP ${ip} en lista negra. Motivo: ${p.motivo}.`;
        case 'sesion_simultanea':
            return `Usuario "${u}" tiene sesiones activas simultáneas desde dos IPs distintas (posible robo de sesión).`;
        case 'acceso_horario_irregular':
            return `Administrador "${u}" accedió fuera del horario laboral (${new Date(Number(p.access_time) * 1000).toLocaleString('es-AR')}).`;
        case 'acceso_tras_intentos':
            return `Usuario "${u}" logró acceso exitoso tras múltiples intentos fallidos desde IP ${ip}.`;
        case 'login_cuenta_servicio':
            return `Cuenta de servicio "${u}" realizó un login interactivo no autorizado.`;
        case 'intento_escalada':
            return `Usuario normal "${u}" ejecutó una acción reservada para administradores.`;
        case 'usuario_desconocido':
            return `Usuario no registrado "${u}" intentó acceder desde IP ${ip}.`;
        case 'actividad_red_dispersa':
            return `Usuario "${u}" operó desde ${p.subnet_count} subredes distintas en la última hora (posible movimiento lateral).`;
        case 'descarga_masiva':
            return `Usuario "${u}" realizó 10 o más descargas exitosas (posible exfiltración de datos).`;
        case 'origen_sospechoso':
            return `Usuario "${u}" accedió exitosamente desde IP ${ip}, que figura en la lista negra.`;
        case 'horario_atipico':
            return `Usuario "${u}" accedió a las ${new Date(Number(p.access_time) * 1000).toLocaleString('es-AR')}, fuera de su horario habitual.`;
        default:
            return `Anomalía detectada — tipo: ${type}`;
    }
}

export function alertIP(alert: SecurityAlert): string | null {
    switch (alert.type) {
        case 'ataque_fuerza_bruta':
        case 'ataque_masivo_ip':
        case 'acceso_ip_prohibida':
        case 'acceso_tras_intentos':
        case 'usuario_desconocido':
        case 'origen_sospechoso':
            return alert.payload.ip;
        default:
            return null;
    }
}

export function prologAlertToUI(a: PrologAlert): SecurityAlert {
    const typeKey = a.type as SecurityAlert['type'];
    const payloadKey = Object.values(a.payload).join('-');
    const id = `${a.type}-${payloadKey}`;
    return {
        id,
        type: typeKey,
        label: TYPE_LABEL[a.type] ?? a.type,
        description: buildDescription(a.type, a.payload),
        severity: mapSeverity(a.severity),
        status: 'active',
        timestamp: new Date().toLocaleString('es-AR'),
        prologRule: RULE_CODE[a.type] ?? `${a.type}(...).`,
        payload: a.payload,
    } as unknown as SecurityAlert;
}
