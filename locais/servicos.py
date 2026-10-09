"""Regras de negócio sobre locais (CLAUDE.md, Arquitetura).

As views chamam estas funções; nenhuma regra de negócio fica em view ou model.
"""

from datetime import timedelta

from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.db.models import Count, OuterRef, Q, QuerySet, Subquery
from django.utils import timezone

from .models import AvaliacaoLocal, Equipamento, FaixaHorario, Local, RegistroCondicao

# Decisão de projeto: cobre a área urbana de uma cidade média e impede
# consultas que varreriam a base inteira.
RAIO_MAXIMO_M = 10_000

# Decisão de projeto: avaliação de segurança envelhece como a condição (RN-02).
JANELA_AVALIACOES = timedelta(days=90)


def filtrar_por_equipamento(
    locais: QuerySet[Local],
    tipo: str | None = None,
    altura_maxima_cm: int | None = None,
) -> QuerySet[Local]:
    """Mantém os locais que têm um equipamento com o tipo e a altura pedidos (RN-03).

    Os filtros valem para o mesmo equipamento: "barra australiana com até
    90 cm" não aceita um local cuja barra baixa seja fixa.
    """
    filtro = Q()
    if tipo:
        filtro &= Q(equipamentos__tipo=tipo)
    if altura_maxima_cm is not None:
        filtro &= Q(equipamentos__altura_cm__lte=altura_maxima_cm)
    if not filtro:
        return locais
    # Um único filter(): as duas condições se aplicam ao mesmo equipamento.
    return locais.filter(filtro).distinct()


def buscar_proximos(
    ponto: Point,
    raio_m: int,
    tipo: str | None = None,
    altura_maxima_cm: int | None = None,
) -> QuerySet[Local]:
    """Locais a até `raio_m` metros de `ponto`, do mais perto ao mais longe (RN-06)."""
    if not 0 < raio_m <= RAIO_MAXIMO_M:
        raise ValueError(f"O raio deve estar entre 1 e {RAIO_MAXIMO_M} metros.")

    locais = Local.objects.filter(ponto__dwithin=(ponto, D(m=raio_m)))
    locais = filtrar_por_equipamento(locais, tipo, altura_maxima_cm)
    return locais.annotate(distancia=Distance("ponto", ponto)).order_by("distancia")


def com_condicao_atual(equipamentos: QuerySet[Equipamento]) -> QuerySet[Equipamento]:
    """Anota a condição do registro mais recente de cada equipamento (RN-02).

    Equipamento sem registro fica com `condicao_atual = None`.
    """
    mais_recente = RegistroCondicao.objects.filter(equipamento=OuterRef("pk")).order_by(
        "-registrado_em"
    )
    return equipamentos.annotate(
        condicao_atual=Subquery(mais_recente.values("condicao")[:1]),
        condicao_registrada_em=Subquery(mais_recente.values("registrado_em")[:1]),
    )


def resumo_seguranca(local: Local) -> dict[str, dict]:
    """Avaliações recentes do local, contadas por faixa de horário (RN-04).

    Segurança é propriedade do par local e horário: cada faixa tem seu próprio
    resumo de movimento e iluminação.
    """
    desde = timezone.now() - JANELA_AVALIACOES
    recentes = AvaliacaoLocal.objects.filter(local=local, registrado_em__gte=desde)

    resumo = {
        faixa.value: {"avaliacoes": 0, "movimento": {}, "iluminacao": {}}
        for faixa in FaixaHorario
    }
    por_movimento = recentes.values("faixa_horario", "movimento").annotate(
        total=Count("id")
    )
    for linha in por_movimento:
        faixa = resumo[linha["faixa_horario"]]
        faixa["movimento"][linha["movimento"]] = linha["total"]
        faixa["avaliacoes"] += linha["total"]

    por_iluminacao = (
        recentes.exclude(iluminacao="")
        .values("faixa_horario", "iluminacao")
        .annotate(total=Count("id"))
    )
    for linha in por_iluminacao:
        resumo[linha["faixa_horario"]]["iluminacao"][linha["iluminacao"]] = linha[
            "total"
        ]

    return resumo


def possiveis_duplicatas(nome: str, ponto: Point) -> QuerySet[Local]:
    """Locais já cadastrados que podem ser o mesmo lugar que se quer cadastrar (RN-01).

    Chamada antes de criar um Local: a API mostra os candidatos e pede
    confirmação, em vez de recusar o cadastro.
    """
    # TODO(human): devolver os locais candidatos a duplicata, do mais perto ao mais longe.
    raise NotImplementedError
