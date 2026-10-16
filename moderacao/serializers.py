from rest_framework import serializers

from locais.serializers import ValidaRestricoesMixin

from .models import Denuncia, StatusDenuncia


class DenunciaSerializer(ValidaRestricoesMixin, serializers.ModelSerializer):
    class Meta:
        model = Denuncia
        fields = ["id", "motivo", "status", "criada_em"]
        # O status é decidido pela moderação, no admin.
        read_only_fields = ["status", "criada_em"]

    def validate(self, dados):
        # Uma denúncia aberta por pessoa, local e motivo (restrição no model).
        self.validar_restricoes(
            dados,
            local=self.context["local"],
            autor=self.context["request"].user,
            status=StatusDenuncia.ABERTA,
        )
        return dados
