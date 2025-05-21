-- Primero actualizamos las suscripciones existentes a los nuevos tipos
UPDATE "Suscripcion"
SET tipo = 'PREMIUM'
WHERE tipo = 'PRO';

UPDATE "Suscripcion"
SET tipo = 'ADVANCED'
WHERE tipo = 'NORMAL';

UPDATE "Suscripcion"
SET tipo = 'BASIC'
WHERE tipo = 'INDIVIDUAL';
