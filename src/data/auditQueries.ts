import type { AuditQuery } from '../types';

export const auditQueries: AuditQuery[] = [
    {
        id: 'Q1',
        title: 'Usuarios con actividad en múltiples subredes',
        description: 'Muestra qué usuarios estuvieron activos en más de N subredes distintas, permitiendo detectar movimiento lateral o reconocimiento de red.',
        category: 'Análisis de Red',
        prolog: `consulta_usuarios_red_dispersa(MinSubredes, Resultados) :-
    findall(U, log_entrada(_, U, _, _, _), UsuariosBrutos),
    sort(UsuariosBrutos, Usuarios),
    findall(U-N,
        (member(U, Usuarios),
         actividad_red_dispersa(U, N),
         N >= MinSubredes),
        Resultados).`,
    },
    {
        id: 'Q2',
        title: 'IPs que atacaron múltiples usuarios y lograron acceso',
        description: 'Identifica IPs que intentaron acceder con 3 o más cuentas distintas y además consiguieron al menos un login exitoso, indicando un ataque distribuido con resultado.',
        category: 'Fuerza Bruta',
        prolog: `consulta_ataques_exitosos(Resultados) :-
    findall(IP-Afectados-Comprometidos,
        (ataque_masivo_ip(IP),
         findall(U,  log_entrada(_, U, IP, login, fallo), UF),
         sort(UF, Afectados),
         findall(Ue, log_entrada(_, Ue, IP, login, exito), UE),
         sort(UE, Comprometidos),
         Comprometidos \\= []),
        Resultados).`,
    },
    {
        id: 'Q3',
        title: 'Informe completo de actividad por usuario',
        description: 'Genera un resumen de la actividad de un usuario: total de eventos registrados, intentos fallidos, accesos exitosos y alertas de seguridad asociadas.',
        category: 'Auditoría',
        prolog: `informe_usuario(Usuario,
             informe(Usuario, Total, Fallos, Exitos, Alertas)) :-
    findall(_, log_entrada(_, Usuario, _, _, _), Todos),
    length(Todos, Total),
    findall(_, log_entrada(_, Usuario, _, _, fallo), LF),
    length(LF, Fallos),
    findall(_, log_entrada(_, Usuario, _, _, exito), LE),
    length(LE, Exitos),
    findall(A, alertas_de_usuario(Usuario, A), Alertas).`,
    },
    {
        id: 'Q4',
        title: 'Historial cronológico de eventos por usuario',
        description: 'Reconstruye la secuencia completa de acciones de un usuario ordenadas en el tiempo, útil para análisis forense o investigación de incidentes.',
        category: 'Forense',
        prolog: `historial_usuario(Usuario, Timeline) :-
    findall(T-IP-Accion-Resultado,
        log_entrada(T, Usuario, IP, Accion, Resultado),
        Pares),
    msort(Pares, Timeline).`,
    },
];
