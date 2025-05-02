-- Migración de datos: convertir valores antiguos a nuevas franjas
-- Migrar DOS_HORAS y CUATRO_HORAS a FRANJA_CUATRO_A_SEIS_HORAS
UPDATE
    "Usuario"
SET
    "tipoDePlanificacionDuracionDeseada" = 'FRANJA_CUATRO_A_SEIS_HORAS'
WHERE
    "tipoDePlanificacionDuracionDeseada" IN ('DOS_HORAS', 'CUATRO_HORAS');

-- Migrar SEIS_HORAS y OCHO_HORAS a FRANJA_SEIS_A_OCHO_HORAS
UPDATE
    "Usuario"
SET
    "tipoDePlanificacionDuracionDeseada" = 'FRANJA_SEIS_A_OCHO_HORAS'
WHERE
    "tipoDePlanificacionDuracionDeseada" IN ('SEIS_HORAS', 'OCHO_HORAS');

-- Actualizar cualquier planificación mensual que use los valores antiguos
UPDATE
    "PlanificacionMensual"
SET
    "tipoDePlanificacion" = 'FRANJA_CUATRO_A_SEIS_HORAS'
WHERE
    "tipoDePlanificacion" IN ('DOS_HORAS', 'CUATRO_HORAS');

UPDATE
    "PlanificacionMensual"
SET
    "tipoDePlanificacion" = 'FRANJA_SEIS_A_OCHO_HORAS'
WHERE
    "tipoDePlanificacion" IN ('SEIS_HORAS', 'OCHO_HORAS');