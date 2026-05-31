// Timestamps clave (UTC):
//   1779678000 → hora 3  (fuera de horario laboral 8-20) → regla 3
//   1779660000 → hora 22 (fuera del historial de lrodriguez) → regla 11
//   1779700xxx → hora 9  (ventana principal de eventos)
export const DEMO_CSV = `timestamp,usuario,ip,accion,resultado
1779700100,hacker01,203.0.113.45,login,fallo
1779700110,hacker01,203.0.113.45,login,fallo
1779700120,hacker01,203.0.113.45,login,fallo
1779700130,hacker01,203.0.113.45,login,fallo
1779700140,hacker01,203.0.113.45,login,fallo
1779700200,user_a,198.51.100.7,login,fallo
1779700210,user_b,198.51.100.7,login,fallo
1779700220,user_c,198.51.100.7,login,fallo
1779678000,admin_ti,192.168.1.10,login,exito
1779700300,scanner,45.33.32.156,login,fallo
1779700400,respaldo_bd,192.168.1.20,login,exito
1779700500,jgonzalez,10.0.0.50,login,exito
1779700600,jgonzalez,172.16.0.5,login,exito
1779700700,jgonzalez,203.0.113.10,login,exito
1779700800,jgonzalez,198.51.100.20,login,exito
1779700900,jperez,192.168.2.50,accion_admin,exito
1779701000,mlopez,10.20.30.40,descarga,exito
1779701010,mlopez,10.20.30.40,descarga,exito
1779701020,mlopez,10.20.30.40,descarga,exito
1779701030,mlopez,10.20.30.40,descarga,exito
1779701040,mlopez,10.20.30.40,descarga,exito
1779701050,mlopez,10.20.30.40,descarga,exito
1779701060,mlopez,10.20.30.40,descarga,exito
1779701070,mlopez,10.20.30.40,descarga,exito
1779701080,mlopez,10.20.30.40,descarga,exito
1779701090,mlopez,10.20.30.40,descarga,exito
1779701200,mperez,198.51.100.30,login,fallo
1779701210,mperez,198.51.100.30,login,fallo
1779701220,mperez,198.51.100.30,login,fallo
1779701300,mperez,198.51.100.30,login,exito
1779701400,attacker,45.33.32.156,login,exito
1779660000,lrodriguez,10.30.40.50,login,exito
1779703200,lrodriguez,192.168.4.10,login,exito
1779703600,lrodriguez,192.168.4.11,login,exito
1779701500,intruso99,203.0.113.77,login,fallo
1779701510,intruso99,203.0.113.77,login,fallo`;
