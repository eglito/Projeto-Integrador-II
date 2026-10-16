"""Armazenamento de fotos fora da aplicação (CLAUDE.md: upload direto ao bucket).

Fluxo, igual em desenvolvimento e em produção (README, decisão 15):

1. O front pede uma URL assinada em POST /api/uploads/.
2. Envia o arquivo direto para ela, com PUT.
3. Informa o `objeto` devolvido no passo 1 ao anexar a foto.

Em produção (Fase 5) a URL será do Cloud Storage. No desenvolvimento, a
ArmazenamentoLocal imita o bucket com uma rota do próprio Django.
"""

import re
import uuid
from datetime import timedelta

from django.core import signing
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.urls import reverse
from django.utils import timezone

TIPOS_PERMITIDOS = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
# O front redimensiona a foto antes de enviar: 2 MB sobra e poupa dados móveis.
TAMANHO_MAXIMO_BYTES = 2 * 1024 * 1024
VALIDADE_UPLOAD = timedelta(minutes=10)

# Nome gerado pelo servidor: nunca o nome do arquivo do celular, que pode conter
# dados pessoais ou caminhos como "../../".
PADRAO_OBJETO = re.compile(r"^fotos/[0-9a-f]{32}\.(jpg|png|webp)$")

_SAL = "fotos.upload"


def conteudo_confere_com_tipo(conteudo: bytes, tipo: str) -> bool:
    """Confere os primeiros bytes do arquivo, não só o tipo declarado pelo cliente."""
    if tipo == "image/jpeg":
        return conteudo.startswith(b"\xff\xd8\xff")
    if tipo == "image/png":
        return conteudo.startswith(b"\x89PNG\r\n\x1a\n")
    if tipo == "image/webp":
        return conteudo[:4] == b"RIFF" and conteudo[8:12] == b"WEBP"
    return False


class ArmazenamentoLocal:
    """Simula o bucket no desenvolvimento, gravando em MEDIA_ROOT."""

    def gerar_upload(self, tipo_conteudo: str) -> dict:
        objeto = f"fotos/{uuid.uuid4().hex}.{TIPOS_PERMITIDOS[tipo_conteudo]}"
        token = signing.dumps({"objeto": objeto, "tipo": tipo_conteudo}, salt=_SAL)
        return {
            "objeto": objeto,
            "url": reverse("armazenamento-local", args=[token]),
            "metodo": "PUT",
            "cabecalhos": {"Content-Type": tipo_conteudo},
            "expira_em": timezone.now() + VALIDADE_UPLOAD,
        }

    def ler_token(self, token: str) -> dict:
        """Levanta signing.BadSignature (ou SignatureExpired) se for inválido."""
        return signing.loads(token, salt=_SAL, max_age=VALIDADE_UPLOAD)

    def salvar(self, objeto: str, conteudo: bytes) -> None:
        default_storage.save(objeto, ContentFile(conteudo))

    def existe(self, objeto: str) -> bool:
        return default_storage.exists(objeto)

    def remover(self, objeto: str) -> None:
        default_storage.delete(objeto)

    def url_publica(self, objeto: str) -> str:
        return default_storage.url(objeto)


def armazenamento() -> ArmazenamentoLocal:
    """Implementação ativa. Na Fase 5, a do Cloud Storage entra por configuração."""
    return ArmazenamentoLocal()
