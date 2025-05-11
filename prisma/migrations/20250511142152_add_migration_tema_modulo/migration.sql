INSERT INTO "Modulo" (nombre, descripcion, "esPublico", "createdAt", "updatedAt")
SELECT DISTINCT 
    categoria,
    'Módulo de ' || categoria,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Tema"
WHERE categoria IS NOT NULL;



UPDATE "Tema" t
SET "moduloId" = m.id
FROM "Modulo" m
WHERE t.categoria = m.nombre;
