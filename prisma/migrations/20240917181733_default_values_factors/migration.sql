INSERT INTO
    "Factor" (id, value)
VALUES
    ('FLASHCARDS_BALANCE_NO_RESPONDIDAS', 60) ON CONFLICT (id) DO NOTHING;

INSERT INTO
    "Factor" (id, value)
VALUES
    ('FLASHCARDS_BALANCE_MAL', 20) ON CONFLICT (id) DO NOTHING;

INSERT INTO
    "Factor" (id, value)
VALUES
    ('FLASHCARDS_BALANCE_REVISAR', 10) ON CONFLICT (id) DO NOTHING;

INSERT INTO
    "Factor" (id, value)
VALUES
    ('FLASHCARDS_BALANCE_BIEN', 10) ON CONFLICT (id) DO NOTHING;