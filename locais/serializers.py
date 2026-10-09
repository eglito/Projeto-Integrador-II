from rest_framework import serializers

from .models import Condicao, Equipamento, Local, TipoEquipamento
from .servicos import RAIO_MAXIMO_M, resumo_seguranca

# Decisão de projeto: sem raio informado, a busca cobre cerca de 25 minutos a pé.
RAIO_PADRAO_M = 2_000


class EquipamentoSerializer(serializers.ModelSerializer):
    tipo_nome = serializers.CharField(source="get_tipo_display", read_only=True)
    # Anotados por servicos.com_condicao_atual (RN-02). A condição vem sempre
    # com a data, para quem lê saber se a informação é recente.
    condicao_atual = serializers.CharField(read_only=True, allow_null=True)
    condicao_atual_nome = serializers.SerializerMethodField()
    condicao_registrada_em = serializers.DateTimeField(read_only=True, allow_null=True)

    class Meta:
        model = Equipamento
        fields = [
            "id",
            "tipo",
            "tipo_nome",
            "nome_outro",
            "altura_cm",
            "largura_cm",
            "condicao_atual",
            "condicao_atual_nome",
            "condicao_registrada_em",
        ]

    def get_condicao_atual_nome(self, equipamento) -> str | None:
        if equipamento.condicao_atual is None:
            return None
        return Condicao(equipamento.condicao_atual).label


class LocalSerializer(serializers.ModelSerializer):
    """Mesma resposta para o mapa e para a lista textual (RN-10)."""

    municipio_nome = serializers.CharField(
        source="get_municipio_ibge_display", read_only=True
    )
    # Nomes explícitos evitam a troca de ordem entre GeoJSON [lon, lat] e
    # Leaflet [lat, lon].
    latitude = serializers.FloatField(source="ponto.y", read_only=True)
    longitude = serializers.FloatField(source="ponto.x", read_only=True)
    distancia_m = serializers.SerializerMethodField()
    equipamentos = EquipamentoSerializer(many=True, read_only=True)

    class Meta:
        model = Local
        fields = [
            "id",
            "nome",
            "municipio_ibge",
            "municipio_nome",
            "endereco",
            "latitude",
            "longitude",
            "tem_bebedouro",
            "tem_sanitario",
            "distancia_m",
            "equipamentos",
        ]

    def get_distancia_m(self, local) -> int | None:
        """Só existe na busca por proximidade."""
        distancia = getattr(local, "distancia", None)
        return round(distancia.m) if distancia is not None else None


class LocalDetalheSerializer(LocalSerializer):
    criado_por = serializers.CharField(
        source="criado_por.username", read_only=True, default=None
    )
    seguranca = serializers.SerializerMethodField()

    class Meta(LocalSerializer.Meta):
        fields = [*LocalSerializer.Meta.fields, "criado_por", "criado_em", "seguranca"]

    def get_seguranca(self, local) -> dict:
        """Avaliações dos últimos 90 dias por faixa de horário (RN-04)."""
        return resumo_seguranca(local)


class BuscaLocaisSerializer(serializers.Serializer):
    """Parâmetros de consulta da listagem de locais."""

    latitude = serializers.FloatField(required=False, min_value=-90, max_value=90)
    longitude = serializers.FloatField(required=False, min_value=-180, max_value=180)
    raio = serializers.IntegerField(
        required=False,
        default=RAIO_PADRAO_M,
        min_value=1,
        max_value=RAIO_MAXIMO_M,
        help_text="Raio da busca em metros. Só vale com latitude e longitude.",
    )
    tipo = serializers.ChoiceField(choices=TipoEquipamento.choices, required=False)
    altura_maxima = serializers.IntegerField(
        required=False,
        min_value=1,
        help_text="Altura máxima do equipamento, em centímetros (RN-03).",
    )

    def validate(self, dados):
        if ("latitude" in dados) != ("longitude" in dados):
            raise serializers.ValidationError(
                "Informe latitude e longitude juntas para buscar por proximidade, "
                "ou nenhuma das duas para listar todos os locais."
            )
        return dados
