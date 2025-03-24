-- CreateMigration
INSERT INTO
    "Suscripcion" (
        "usuarioId",
        "tipo",
        "fechaInicio",
        "createdAt",
        "updatedAt"
    )
SELECT
    "id" as "usuarioId",
    'PRO' as "tipo",
    CURRENT_TIMESTAMP as "fechaInicio",
    CURRENT_TIMESTAMP as "createdAt",
    CURRENT_TIMESTAMP as "updatedAt"
FROM
    "Usuario" u
WHERE
    NOT EXISTS (
        SELECT
            1
        FROM
            "Suscripcion" s
        WHERE
            s."usuarioId" = u.id
    );