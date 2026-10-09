from django.contrib.gis.geos import Point
from django.db.models import Prefetch
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.response import Response

from .models import Equipamento, Local
from .serializers import BuscaLocaisSerializer, LocalDetalheSerializer, LocalSerializer
from .servicos import buscar_proximos, com_condicao_atual, filtrar_por_equipamento


def com_equipamentos(locais):
    """Carrega equipamentos e condição atual em 2 consultas, não 1 por local."""
    equipamentos = com_condicao_atual(Equipamento.objects.order_by("tipo", "id"))
    return locais.select_related("criado_por").prefetch_related(
        Prefetch("equipamentos", queryset=equipamentos)
    )


class LocalViewSet(viewsets.ReadOnlyModelViewSet):
    """Locais de treino. A listagem serve o mapa e a lista textual (RN-10)."""

    queryset = com_equipamentos(Local.objects.all())

    def get_serializer_class(self):
        if self.action == "retrieve":
            return LocalDetalheSerializer
        return LocalSerializer

    @extend_schema(parameters=[BuscaLocaisSerializer])
    def list(self, request):
        busca = BuscaLocaisSerializer(data=request.query_params)
        busca.is_valid(raise_exception=True)
        filtros = busca.validated_data
        equipamento = {
            "tipo": filtros.get("tipo"),
            "altura_maxima_cm": filtros.get("altura_maxima"),
        }

        if "latitude" in filtros:
            ponto = Point(filtros["longitude"], filtros["latitude"], srid=4326)
            locais = buscar_proximos(ponto, filtros["raio"], **equipamento)
        else:
            locais = filtrar_por_equipamento(Local.objects.all(), **equipamento)

        serializer = self.get_serializer(com_equipamentos(locais), many=True)
        return Response(serializer.data)
