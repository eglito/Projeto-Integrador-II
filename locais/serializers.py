import copy

from django.contrib.gis.geos import Point
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import (
    AvaliacaoLocal,
    Condicao,
    Equipamento,
    Local,
    RegistroCondicao,
    TipoEquipamento,
)
from .servicos import RAIO_MAXIMO_M, cadastrar_local, resumo_seguranca

# Decisão de projeto: sem raio informado, a busca cobre cerca de 25 minutos a pé.
RAIO_PADRAO_M = 2_000


class ValidaRestricoesMixin:
    """Aplica as restrições do model (CHECK e UNIQUE) na validação da API.

    O ModelSerializer não as verifica: sem isto, o banco recusaria o INSERT e a
    API responderia 500. As mensagens vêm de violation_error_message no model e
    dizem como corrigir.
    """

    def validar_restricoes(self, dados, **extras):
        # Na edição, parte do registro atual; na criação, de uma instância nova.
        instancia = copy.copy(self.instance) if self.instance else self.Meta.model()
        for campo, valor in {**dados, **extras}.items():
            setattr(instancia, campo, valor)
        try:
            instancia.validate_constraints()
        except DjangoValidationError as erro:
            raise serializers.ValidationError(erro.messages) from erro


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
            "tem_bancos",
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


class LocalEscritaSerializer(ValidaRestricoesMixin, serializers.ModelSerializer):
    """Cadastro (POST) e correção pelo autor (PATCH) de um local."""

    latitude = serializers.FloatField(write_only=True, min_value=-90, max_value=90)
    longitude = serializers.FloatField(write_only=True, min_value=-180, max_value=180)
    confirmar_novo = serializers.BooleanField(
        write_only=True,
        default=False,
        help_text=(
            "Envie true para cadastrar mesmo havendo possíveis duplicatas "
            "(depois de uma resposta 409)."
        ),
    )

    class Meta:
        model = Local
        fields = [
            "nome",
            "municipio_ibge",
            "endereco",
            "latitude",
            "longitude",
            "tem_bebedouro",
            "tem_sanitario",
            "tem_bancos",
            "confirmar_novo",
        ]

    def validate_nome(self, nome):
        # "Praça  dos   Advogados" e "Praça dos Advogados" são o mesmo nome.
        return " ".join(nome.split())

    def validate(self, dados):
        latitude = dados.pop("latitude", None)
        longitude = dados.pop("longitude", None)
        if (latitude is None) != (longitude is None):
            raise serializers.ValidationError(
                "Informe latitude e longitude juntas para definir a localização."
            )
        if latitude is not None:
            dados["ponto"] = Point(longitude, latitude, srid=4326)

        restricoes = {k: v for k, v in dados.items() if k != "confirmar_novo"}
        self.validar_restricoes(restricoes)
        return dados

    def create(self, dados):
        return cadastrar_local(self.context["request"].user, **dados)

    def update(self, local, dados):
        dados.pop("confirmar_novo", None)
        return super().update(local, dados)


class EquipamentoEscritaSerializer(ValidaRestricoesMixin, serializers.ModelSerializer):
    class Meta:
        model = Equipamento
        fields = ["tipo", "nome_outro", "altura_cm", "largura_cm"]

    def validate(self, dados):
        self.validar_restricoes(dados)
        return dados


class RegistroCondicaoSerializer(serializers.ModelSerializer):
    """Registro imutável: só leitura e criação, para preservar o histórico (RN-02)."""

    condicao_nome = serializers.CharField(source="get_condicao_display", read_only=True)
    autor = serializers.CharField(source="autor.username", read_only=True, default=None)

    class Meta:
        model = RegistroCondicao
        fields = ["id", "condicao", "condicao_nome", "autor", "registrado_em"]
        # A data é a do envio: ninguém registra condição no passado.
        read_only_fields = ["registrado_em"]


class AvaliacaoLocalSerializer(ValidaRestricoesMixin, serializers.ModelSerializer):
    """Avaliação imutável de segurança e limpeza numa faixa de horário (RN-04)."""

    autor = serializers.CharField(source="autor.username", read_only=True, default=None)

    class Meta:
        model = AvaliacaoLocal
        fields = [
            "id",
            "faixa_horario",
            "iluminacao",
            "movimento",
            "limpeza",
            "autor",
            "registrado_em",
        ]
        read_only_fields = ["registrado_em"]

    def validate(self, dados):
        self.validar_restricoes(dados)
        return dados
