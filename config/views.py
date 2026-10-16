from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from locais.models import (
    Condicao,
    FaixaHorario,
    Iluminacao,
    Limpeza,
    Movimento,
    Municipio,
    TipoEquipamento,
)
from locais.serializers import RAIO_PADRAO_M
from locais.servicos import RAIO_MAXIMO_M
from moderacao.models import MotivoDenuncia


def opcoes(escolhas):
    return [{"valor": valor, "rotulo": rotulo} for valor, rotulo in escolhas.choices]


class OpcoesView(APIView):
    """Vocabulário controlado dos formulários e filtros, com os rótulos.

    O front-end monta seletores a partir daqui, sem repetir as listas em
    JavaScript: um valor novo no model aparece na tela sem mudar o front.
    """

    permission_classes = [AllowAny]

    @extend_schema(responses=OpenApiTypes.OBJECT)
    def get(self, request):
        return Response(
            {
                "municipios": opcoes(Municipio),
                "tipos_equipamento": opcoes(TipoEquipamento),
                "condicoes": opcoes(Condicao),
                "faixas_horario": opcoes(FaixaHorario),
                "iluminacao": opcoes(Iluminacao),
                "movimento": opcoes(Movimento),
                "limpeza": opcoes(Limpeza),
                "motivos_denuncia": opcoes(MotivoDenuncia),
                "busca": {
                    "raio_padrao_m": RAIO_PADRAO_M,
                    "raio_maximo_m": RAIO_MAXIMO_M,
                },
            }
        )
