export const RULE_CODE: Record<string, string> = {
    ataque_fuerza_bruta:
        'ataque_fuerza_bruta(Usuario, IP) :-\n' +
        '    \\+ ip_confiable(IP),\n' +
        '    setof(T, log_entrada(T, Usuario, IP, login, fallo), Tiempos),\n' +
        '    length(Tiempos, N), N >= 5.',

    ataque_masivo_ip:
        'ataque_masivo_ip(IP) :-\n' +
        '    \\+ ip_confiable(IP),\n' +
        '    setof(U, T^log_entrada(T, U, IP, login, fallo), Usuarios),\n' +
        '    length(Usuarios, N), N >= 3.',

    acceso_ip_prohibida:
        'acceso_ip_prohibida(IP, Motivo) :-\n' +
        '    ip_prohibida(IP, Motivo),\n' +
        '    \\+ ip_confiable(IP),\n' +
        '    once(log_entrada(_, _, IP, _, _)).',

    sesion_simultanea:
        'sesion_simultanea(Usuario) :-\n' +
        '    log_entrada(T1, Usuario, IP1, login, exito),\n' +
        '    log_entrada(T2, Usuario, IP2, login, exito),\n' +
        '    IP1 \\= IP2,\n' +
        '    \\+ ip_confiable(IP1), \\+ ip_confiable(IP2),\n' +
        '    Diferencia is abs(T2 - T1), Diferencia =< 300.',

    acceso_horario_irregular:
        'acceso_horario_irregular(Usuario, Timestamp) :-\n' +
        '    rol_usuario(Usuario, administrador),\n' +
        '    log_entrada(Timestamp, Usuario, _, login, exito),\n' +
        '    extraer_hora_dia(Timestamp, Hora),\n' +
        '    horario_permitido(Inicio, Fin),\n' +
        '    (Hora < Inicio ; Hora >= Fin).',

    acceso_tras_intentos:
        'acceso_tras_intentos(Usuario, IP) :-\n' +
        '    setof(T, log_entrada(T, Usuario, IP, login, fallo), TsFallos),\n' +
        '    length(TsFallos, N), N >= 3,\n' +
        '    findall(Te, log_entrada(Te, Usuario, IP, login, exito), TsExito),\n' +
        '    TsExito \\= [],\n' +
        '    last(TsFallos, UltimoFallo), last(TsExito, UltimoExito),\n' +
        '    UltimoExito > UltimoFallo.',

    login_cuenta_servicio:
        'login_cuenta_servicio(Usuario) :-\n' +
        '    rol_usuario(Usuario, servicio),\n' +
        '    log_entrada(_, Usuario, _, login, exito).',

    intento_escalada:
        'intento_escalada(Usuario) :-\n' +
        '    rol_usuario(Usuario, usuario_normal),\n' +
        '    log_entrada(_, Usuario, _, accion_admin, _).',

    usuario_desconocido:
        'usuario_desconocido(Usuario, IP) :-\n' +
        '    \\+ rol_usuario(Usuario, _),\n' +
        '    setof(_, T^log_entrada(T, Usuario, IP, login, fallo), _).',

    actividad_red_dispersa:
        'actividad_red_dispersa(Usuario, CantSubredes) :-\n' +
        '    aggregate_all(max(T0), log_entrada(T0, _, _, _, _), TsReciente),\n' +
        '    VentanaDesde is TsReciente - 3600,\n' +
        '    findall(Subred,\n' +
        '        (log_entrada(T, Usuario, IP, _, _),\n' +
        '         T >= VentanaDesde,\n' +
        '         extraer_subred(IP, Subred)),\n' +
        '        Subredes),\n' +
        '    sort(Subredes, SubredesUnicas),\n' +
        '    length(SubredesUnicas, CantSubredes),\n' +
        '    CantSubredes > 3.',

    descarga_masiva:
        'descarga_masiva(Usuario) :-\n' +
        '    findall(T, log_entrada(T, Usuario, _, descarga, exito), Ts),\n' +
        '    length(Ts, N),\n' +
        '    N >= 10.',

    origen_sospechoso:
        'origen_sospechoso(Usuario, IP) :-\n' +
        '    log_entrada(_, Usuario, IP, login, exito),\n' +
        '    ip_prohibida(IP, _).',

    horario_atipico:
        'horario_atipico(Usuario, Timestamp) :-\n' +
        '    extraer_hora_dia(Timestamp, HoraActual),\n' +
        '    log_entrada(Timestamp, Usuario, _, login, exito),\n' +
        '    findall(H,\n' +
        '        (log_entrada(T2, Usuario, _, login, exito),\n' +
        '         T2 \\= Timestamp,\n' +
        '         extraer_hora_dia(T2, H)),\n' +
        '        HistorialHoras),\n' +
        '    HistorialHoras \\= [],\n' +
        '    \\+ member(HoraActual, HistorialHoras).',
};

export const TYPE_LABEL: Record<string, string> = {
    ataque_fuerza_bruta:      'Fuerza Bruta',
    ataque_masivo_ip:         'Ataque Distribuido',
    acceso_ip_prohibida:      'IP Prohibida',
    sesion_simultanea:        'Sesión Simultánea',
    acceso_horario_irregular: 'Acceso Fuera de Horario',
    acceso_tras_intentos:     'Bypass Fuerza Bruta',
    login_cuenta_servicio:    'Login Cuenta de Servicio',
    intento_escalada:         'Intento de Escalada',
    usuario_desconocido:      'Usuario No Registrado',
    actividad_red_dispersa:   'Actividad en Múltiples Subredes',
    descarga_masiva:          'Descarga Masiva de Datos',
    origen_sospechoso:        'Origen Geográfico Sospechoso',
    horario_atipico:          'Acceso en Horario Atípico',
};
