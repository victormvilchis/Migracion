BaseBFS — estabilización de importación / importación masiva
Base requerida: feature/talent-platform @ ce194ff60174ace7396ac61fb6149edcaf853da3

Incluye:
- matching por identificadores fuertes con nombre sólo como fallback;
- duplicados por IS / Usuario BBVA / correo Softtek / correo BBVA;
- eliminación del falso conflicto por cambio de tecnología principal;
- clasificación explícita ERROR / CONFLICT / WARNING para certificaciones;
- estado Excel vs estado calculado como aviso cuando las reglas son determinísticas;
- conflictos manuales sólo ante diferencias efectivas;
- colisiones de intentos detectadas antes de modificar el resumen de certificación;
- resultRegistered únicamente tras INSERT real de intento;
- decisiones históricas ligadas también al estado actual;
- filas reconocidas con error ya no se consideran posibles bajas;
- aplicación parcial segura: filas/certificaciones pendientes no bloquean las válidas;
- detalle por fila y etapa para errores de aplicación;
- sanitización de errores técnicos SQL;
- persistencia de decisiones no invalida datos ya guardados si falla;
- pruebas nuevas de identidad/duplicados y ampliación de certificaciones.

No requiere migración SQL.
No ejecuta commit ni push.
