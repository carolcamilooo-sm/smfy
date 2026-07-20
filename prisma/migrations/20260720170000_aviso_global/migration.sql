-- Recado do admin que aparece na barra lateral de todo mundo. Uma linha so:
-- e um mural, nao um historico — o aviso novo substitui o anterior.

CREATE TABLE "global_notices" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "content" TEXT NOT NULL,
    "authorName" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "global_notices_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "global_notices" ENABLE ROW LEVEL SECURITY;
