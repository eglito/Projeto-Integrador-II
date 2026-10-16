from django.core import signing
from django.http import HttpResponse, JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .armazenamento import (
    TAMANHO_MAXIMO_BYTES,
    armazenamento,
    conteudo_confere_com_tipo,
)
from .serializers import SolicitacaoUploadSerializer, UploadSerializer


class UploadView(APIView):
    """Passo 1 do envio de foto: entrega uma URL assinada e de curta duração."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=SolicitacaoUploadSerializer, responses={201: UploadSerializer}
    )
    def post(self, request):
        solicitacao = SolicitacaoUploadSerializer(data=request.data)
        solicitacao.is_valid(raise_exception=True)
        upload = armazenamento().gerar_upload(
            solicitacao.validated_data["tipo_conteudo"]
        )
        return Response(UploadSerializer(upload).data, status=status.HTTP_201_CREATED)


def erro(mensagem, codigo):
    return JsonResponse({"detail": mensagem}, status=codigo)


@method_decorator(csrf_exempt, name="dispatch")
class ArmazenamentoLocalView(View):
    """Passo 2, só no desenvolvimento: imita o PUT numa URL assinada do bucket.

    Fica fora da API documentada: em produção, este papel é do Cloud Storage.
    Sem CSRF porque, como no bucket real, quem autoriza é a assinatura da URL.
    """

    http_method_names = ["put"]

    def put(self, request, token):
        try:
            dados = armazenamento().ler_token(token)
        except signing.SignatureExpired:
            return erro("O link de envio expirou. Peça um novo em /api/uploads/.", 403)
        except signing.BadSignature:
            return erro("Link de envio inválido. Peça um novo em /api/uploads/.", 403)

        if request.content_type != dados["tipo"]:
            return erro(f"Envie o arquivo com Content-Type {dados['tipo']}.", 400)
        # Confere o tamanho declarado antes de ler o corpo da requisição.
        if int(request.META.get("CONTENT_LENGTH") or 0) > TAMANHO_MAXIMO_BYTES:
            return erro("A foto pode ter no máximo 2 MB. Reduza a imagem.", 413)
        if armazenamento().existe(dados["objeto"]):
            return erro("Este link já foi usado. Peça um novo em /api/uploads/.", 409)

        conteudo = request.body
        if not conteudo_confere_com_tipo(conteudo, dados["tipo"]):
            return erro(
                f"O arquivo não é uma imagem {dados['tipo']} válida. "
                "Confira o arquivo escolhido.",
                400,
            )

        armazenamento().salvar(dados["objeto"], conteudo)
        return HttpResponse(status=200)
