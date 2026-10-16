from rest_framework import serializers

from .armazenamento import (
    PADRAO_OBJETO,
    TAMANHO_MAXIMO_BYTES,
    TIPOS_PERMITIDOS,
    armazenamento,
)


class SolicitacaoUploadSerializer(serializers.Serializer):
    tipo_conteudo = serializers.ChoiceField(
        choices=list(TIPOS_PERMITIDOS),
        error_messages={"invalid_choice": "Envie a foto em JPEG, PNG ou WebP."},
    )
    tamanho = serializers.IntegerField(
        min_value=1,
        max_value=TAMANHO_MAXIMO_BYTES,
        help_text="Tamanho do arquivo em bytes. Máximo de 2 MB.",
        error_messages={
            "max_value": (
                "A foto pode ter no máximo 2 MB. Reduza o tamanho da imagem e "
                "tente de novo."
            )
        },
    )


class UploadSerializer(serializers.Serializer):
    """Instruções para enviar o arquivo direto ao armazenamento."""

    objeto = serializers.CharField()
    url = serializers.CharField()
    metodo = serializers.CharField()
    cabecalhos = serializers.DictField(child=serializers.CharField())
    expira_em = serializers.DateTimeField()


class ObjetoFotoField(serializers.CharField):
    """Referência a um arquivo já enviado pelo fluxo de upload."""

    def to_internal_value(self, valor):
        objeto = super().to_internal_value(valor)
        if objeto and not (
            PADRAO_OBJETO.match(objeto) and armazenamento().existe(objeto)
        ):
            raise serializers.ValidationError(
                "Foto não encontrada. Envie o arquivo pelo fluxo de upload "
                "(POST /api/uploads/) e use o objeto devolvido."
            )
        return objeto
