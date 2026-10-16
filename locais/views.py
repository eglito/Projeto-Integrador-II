from django.contrib.gis.geos import Point
from django.db.models import Prefetch
from django.urls import reverse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from .models import Equipamento, Local
from .permissoes import SomenteAutorEdita
from .serializers import (
    AvaliacaoLocalSerializer,
    BuscaLocaisSerializer,
    EquipamentoEscritaSerializer,
    EquipamentoSerializer,
    LocalDetalheSerializer,
    LocalEscritaSerializer,
    LocalSerializer,
    RegistroCondicaoSerializer,
)
from .servicos import (
    PossivelDuplicata,
    avaliacoes_recentes,
    buscar_proximos,
    com_condicao_atual,
    filtrar_por_equipamento,
)


class PaginacaoHistorico(PageNumberPagination):
    """Históricos crescem sem limite: são entregues em páginas de 20."""

    page_size = 20


def com_equipamentos(locais):
    """Carrega equipamentos e condição atual em 2 consultas, não 1 por local."""
    equipamentos = com_condicao_atual(Equipamento.objects.order_by("tipo", "id"))
    return locais.select_related("criado_por").prefetch_related(
        Prefetch("equipamentos", queryset=equipamentos)
    )


class LocalViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    """Locais de treino. A listagem serve o mapa e a lista textual (RN-10).

    Sem PUT nem DELETE: correção parcial pelo autor (PATCH) e exclusão só pela
    moderação, no admin.
    """

    queryset = com_equipamentos(Local.objects.all())
    permission_classes = [IsAuthenticatedOrReadOnly, SomenteAutorEdita]

    def get_serializer_class(self):
        if self.action in ("create", "partial_update"):
            return LocalEscritaSerializer
        if self.action == "retrieve":
            return LocalDetalheSerializer
        return LocalSerializer

    def detalhe(self, local):
        local = self.get_queryset().get(pk=local.pk)
        return LocalDetalheSerializer(local, context=self.get_serializer_context()).data

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

    @extend_schema(
        request=LocalEscritaSerializer,
        responses={201: LocalDetalheSerializer, 409: OpenApiTypes.OBJECT},
        description=(
            "Responde 409 com `possiveis_duplicatas` quando o local pode já existir "
            "(RN-01). Para cadastrar mesmo assim, reenvie com `confirmar_novo: true`."
        ),
    )
    def create(self, request):
        escrita = self.get_serializer(data=request.data)
        escrita.is_valid(raise_exception=True)
        try:
            local = escrita.save()
        except PossivelDuplicata as duplicata:
            candidatos = com_equipamentos(duplicata.candidatos)
            return Response(
                {
                    "detail": (
                        "Este local pode já estar cadastrado. Confira os candidatos: "
                        "se for um deles, avalie o local existente; se for outro "
                        "lugar, reenvie com confirmar_novo igual a true."
                    ),
                    "possiveis_duplicatas": LocalSerializer(candidatos, many=True).data,
                },
                status=status.HTTP_409_CONFLICT,
            )
        return Response(
            self.detalhe(local),
            status=status.HTTP_201_CREATED,
            headers={"Location": reverse("local-detail", args=[local.pk])},
        )

    @extend_schema(request=LocalEscritaSerializer, responses=LocalDetalheSerializer)
    def partial_update(self, request, pk=None):
        local = self.get_object()  # SomenteAutorEdita é verificada aqui
        escrita = self.get_serializer(local, data=request.data, partial=True)
        escrita.is_valid(raise_exception=True)
        escrita.save()
        return Response(self.detalhe(local))

    @extend_schema(
        request=EquipamentoEscritaSerializer, responses={201: EquipamentoSerializer}
    )
    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def equipamentos(self, request, pk=None):
        """Qualquer pessoa logada acrescenta equipamentos a um local."""
        local = self.get_object()
        escrita = EquipamentoEscritaSerializer(data=request.data)
        escrita.is_valid(raise_exception=True)
        equipamento = escrita.save(local=local, criado_por=request.user)
        anotado = com_condicao_atual(
            Equipamento.objects.filter(pk=equipamento.pk)
        ).get()
        return Response(
            EquipamentoSerializer(anotado).data,
            status=status.HTTP_201_CREATED,
            headers={"Location": reverse("equipamento-detail", args=[equipamento.pk])},
        )

    @extend_schema(methods=["GET"], responses=AvaliacaoLocalSerializer(many=True))
    @extend_schema(
        methods=["POST"],
        request=AvaliacaoLocalSerializer,
        responses={201: AvaliacaoLocalSerializer},
    )
    @action(
        detail=True,
        methods=["get", "post"],
        permission_classes=[IsAuthenticatedOrReadOnly],
        pagination_class=PaginacaoHistorico,
    )
    def avaliacoes(self, request, pk=None):
        """Avaliações dos últimos 90 dias (GET) e nova avaliação (POST)."""
        local = self.get_object()
        if request.method == "POST":
            serializer = AvaliacaoLocalSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(local=local, autor=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        pagina = self.paginate_queryset(
            avaliacoes_recentes(local).select_related("autor")
        )
        return self.get_paginated_response(
            AvaliacaoLocalSerializer(pagina, many=True).data
        )


class EquipamentoViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Equipamento acessado pelo próprio id; correção parcial só pelo autor."""

    queryset = com_condicao_atual(Equipamento.objects.all())
    serializer_class = EquipamentoSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, SomenteAutorEdita]

    @extend_schema(
        request=EquipamentoEscritaSerializer, responses=EquipamentoSerializer
    )
    def partial_update(self, request, pk=None):
        equipamento = self.get_object()
        escrita = EquipamentoEscritaSerializer(
            equipamento, data=request.data, partial=True
        )
        escrita.is_valid(raise_exception=True)
        escrita.save()
        atualizado = self.get_queryset().get(pk=equipamento.pk)
        return Response(EquipamentoSerializer(atualizado).data)

    @extend_schema(methods=["GET"], responses=RegistroCondicaoSerializer(many=True))
    @extend_schema(
        methods=["POST"],
        request=RegistroCondicaoSerializer,
        responses={201: RegistroCondicaoSerializer},
    )
    @action(
        detail=True,
        methods=["get", "post"],
        url_path="registros-condicao",
        permission_classes=[IsAuthenticatedOrReadOnly],
        pagination_class=PaginacaoHistorico,
    )
    def registros_condicao(self, request, pk=None):
        """Histórico de condição, do mais recente ao mais antigo, e novo registro."""
        equipamento = self.get_object()
        if request.method == "POST":
            serializer = RegistroCondicaoSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(equipamento=equipamento, autor=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        pagina = self.paginate_queryset(
            equipamento.registros_condicao.select_related("autor")
        )
        return self.get_paginated_response(
            RegistroCondicaoSerializer(pagina, many=True).data
        )
