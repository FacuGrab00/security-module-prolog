% =============================================================================
%  BASE DE CONOCIMIENTO — Hechos estáticos del sistema
%  IPs prohibidas, IPs de confianza, roles de usuarios y horario laboral.
% =============================================================================

% --- IPs PROHIBIDAS (lista negra inicial) ------------------------------------
ip_prohibida('45.33.32.156',   'Escaneo masivo de puertos detectado').
ip_prohibida('23.129.64.200',  'IP de origen anonimo no rastreable').
ip_prohibida('185.107.47.215', 'Equipo comprometido usado para ataques').
ip_prohibida('91.108.56.179',  'Ataque dirigido de origen desconocido').
ip_prohibida('104.244.79.6',   'Conexion via proxy anonimo').
ip_prohibida('0.0.0.0',        'Direccion IP no valida').

% --- IPs DE CONFIANZA (lista blanca) -----------------------------------------
ip_confiable('192.168.0.1').
ip_confiable('192.168.0.254').
ip_confiable('10.10.0.1').
ip_confiable('10.10.0.2').
ip_confiable('127.0.0.1').

% --- ROLES DE USUARIOS -------------------------------------------------------
rol_usuario(admin_ti,       administrador).
rol_usuario(director_sis,   administrador).
rol_usuario(root,           administrador).
rol_usuario(respaldo_bd,    servicio).
rol_usuario(monitor_red,    servicio).

% --- HORARIO LABORAL ---------------------------------------------------------
horario_permitido(8, 20).
