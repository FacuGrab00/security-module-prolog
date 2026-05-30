:- module(audit_engine, []).

:- use_module(library(http/thread_httpd)).
:- use_module(library(http/http_dispatch)).
:- use_module(library(http/http_json)).
:- use_module(library(http/http_parameters)).
:- use_module(library(http/http_cors)).
:- use_module(library(csv)).
:- use_module(library(lists)).
:- use_module(library(aggregate)).
:- use_module(library(optparse)).

% --- Predicados dinámicos (modificables en runtime) --------------------------
:- dynamic log_entrada/5.
:- dynamic ip_prohibida/2.
:- dynamic ip_confiable/1.
:- dynamic rol_usuario/2.
:- dynamic horario_permitido/2.

:- set_setting(http:cors, [*]).

% --- Componentes del motor ---------------------------------------------------
:- include('engine/knowledge_base').
:- include('engine/rules').
:- include('engine/queries').
:- include('engine/csv_import').
:- include('engine/report').
:- include('engine/api/handlers').
:- include('engine/api/ip_lists').

% --- Inicio del servidor -----------------------------------------------------
iniciar_servidor(Puerto) :-
    http_server(http_dispatch, [port(Puerto)]),
    format(user_error, "~n  ╔════════════════════════════════════════╗~n", []),
    format(user_error, "  ║   MOTOR DE AUDITORÍA PROLOG — ACTIVO   ║~n", []),
    format(user_error, "  ║   http://localhost:~w               ║~n",    [Puerto]),
    format(user_error, "  ╚════════════════════════════════════════╝~n~n", []).

:- initialization(main, main).

opts_spec([
    [ opt(port),   type(integer), default(9090),
      shortflags([p]), longflags([port]),
      help('Puerto en el que escucha el servidor (default: 9090)') ],
    [ opt(help),   type(boolean), default(false),
      shortflags([h]), longflags([help]),
      help('Muestra esta ayuda') ]
]).

main :-
    opts_spec(Spec),
    current_prolog_flag(argv, Args),
    opt_parse(Spec, Args, Opts, _),
    ( option(help(true), Opts)
    ->  opt_help(Spec, HelpText),
        format("~w~n", [HelpText]),
        halt(0)
    ;   option(port(Puerto), Opts),
        iniciar_servidor(Puerto),
        thread_get_message(stop)
    ).
