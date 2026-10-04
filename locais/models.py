"""Locais de treino, equipamentos e registros datados sobre eles.

Cada model segue Docs/modelo_dados.md, que aponta a regra de negócio (RN) da
pesquisa por trás de cada campo.
"""

from django.conf import settings
from django.contrib.gis.db import models
from django.db.models import Q
from django.db.models.functions import Lower
from django.utils import timezone


class Municipio(models.IntegerChoices):
    """Municípios atendidos, pelo código IBGE (RN-09, decisão D3)."""

    ARARAQUARA = 3503208, "Araraquara (SP)"


class TipoEquipamento(models.TextChoices):
    BARRA_FIXA = "barra_fixa", "Barra fixa"
    BARRAS_PARALELAS = "barras_paralelas", "Barras paralelas"
    ESPALDAR = "espaldar", "Espaldar"
    BARRA_AUSTRALIANA = "barra_australiana", "Barra australiana"
    OUTRO = "outro", "Outro"


class Condicao(models.TextChoices):
    """Escala da condição do equipamento (RN-02, decisão D1)."""

    BOM = "bom", "Bom"
    DESGASTADO = "desgastado", "Desgastado"
    PRECARIO = "precario", "Precário"
    QUEBRADO = "quebrado", "Quebrado"


class FaixaHorario(models.TextChoices):
    MANHA = "manha", "Manhã"
    TARDE = "tarde", "Tarde"
    NOITE = "noite", "Noite"


class Iluminacao(models.TextChoices):
    BOA = "boa", "Boa"
    FRACA = "fraca", "Fraca"
    AUSENTE = "ausente", "Ausente"


class Movimento(models.TextChoices):
    MOVIMENTADO = "movimentado", "Movimentado"
    POUCO_MOVIMENTO = "pouco_movimento", "Pouco movimento"
    VAZIO = "vazio", "Vazio"


class Limpeza(models.TextChoices):
    LIMPO = "limpo", "Limpo"
    REGULAR = "regular", "Regular"
    SUJO = "sujo", "Sujo"


class Local(models.Model):
    nome = models.CharField("nome", max_length=120)
    municipio_ibge = models.PositiveIntegerField("município", choices=Municipio.choices)
    endereco = models.CharField("endereço", max_length=255, blank=True)
    # geography: distâncias em metros sem projeção regional (README, decisão 07).
    # O GeoDjango cria o índice GiST deste campo automaticamente.
    ponto = models.PointField("localização", geography=True, srid=4326)
    # null=True: "não informado" é diferente de "não tem".
    tem_bebedouro = models.BooleanField("tem bebedouro", null=True, blank=True)
    tem_sanitario = models.BooleanField("tem sanitário", null=True, blank=True)
    # SET_NULL: excluir a conta (direito previsto na LGPD) não apaga o local.
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="locais_criados",
        verbose_name="criado por",
    )
    criado_em = models.DateTimeField("criado em", auto_now_add=True)

    class Meta:
        verbose_name = "local"
        verbose_name_plural = "locais"
        ordering = ["nome"]
        constraints = [
            # RN-01: o mesmo nome não se repete na cidade, ignorando maiúsculas.
            models.UniqueConstraint(
                Lower("nome"),
                "municipio_ibge",
                name="local_nome_unico_por_municipio",
            ),
        ]

    def __str__(self):
        return self.nome


class Equipamento(models.Model):
    local = models.ForeignKey(
        Local, on_delete=models.CASCADE, related_name="equipamentos"
    )
    tipo = models.CharField(max_length=20, choices=TipoEquipamento.choices)
    nome_outro = models.CharField("nome (tipo outro)", max_length=60, blank=True)
    # RN-03: dimensões opcionais, nem todo colaborador terá trena.
    altura_cm = models.PositiveSmallIntegerField("altura (cm)", null=True, blank=True)
    largura_cm = models.PositiveSmallIntegerField("largura (cm)", null=True, blank=True)
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="equipamentos_criados",
        verbose_name="criado por",
    )
    criado_em = models.DateTimeField("criado em", auto_now_add=True)

    class Meta:
        verbose_name = "equipamento"
        verbose_name_plural = "equipamentos"
        constraints = [
            models.CheckConstraint(
                condition=(Q(tipo=TipoEquipamento.OUTRO) & ~Q(nome_outro=""))
                | (~Q(tipo=TipoEquipamento.OUTRO) & Q(nome_outro="")),
                name="equipamento_nome_outro_somente_tipo_outro",
            ),
            models.CheckConstraint(
                condition=Q(largura_cm__isnull=True)
                | Q(tipo=TipoEquipamento.BARRAS_PARALELAS),
                name="equipamento_largura_somente_paralelas",
            ),
            models.CheckConstraint(
                condition=Q(altura_cm__isnull=True) | Q(altura_cm__gt=0),
                name="equipamento_altura_positiva",
            ),
            models.CheckConstraint(
                condition=Q(largura_cm__isnull=True) | Q(largura_cm__gt=0),
                name="equipamento_largura_positiva",
            ),
        ]

    def __str__(self):
        nome = self.nome_outro or self.get_tipo_display()
        return f"{nome} ({self.local})"


class RegistroCondicao(models.Model):
    """Observação datada do estado de um equipamento (RN-02)."""

    equipamento = models.ForeignKey(
        Equipamento, on_delete=models.CASCADE, related_name="registros_condicao"
    )
    autor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="registros_condicao",
    )
    condicao = models.CharField("condição", max_length=12, choices=Condicao.choices)
    # default (e não auto_now_add) permite informar a data em testes e importações.
    registrado_em = models.DateTimeField("registrado em", default=timezone.now)

    class Meta:
        verbose_name = "registro de condição"
        verbose_name_plural = "registros de condição"
        ordering = ["-registrado_em"]
        indexes = [
            # Sustenta a busca do registro mais recente de cada equipamento.
            models.Index(
                fields=["equipamento", "-registrado_em"],
                name="registro_cond_equip_data_idx",
            ),
        ]

    def __str__(self):
        return f"{self.equipamento}: {self.get_condicao_display()}"


class AvaliacaoLocal(models.Model):
    """Relato de uma visita: segurança no horário e zeladoria (RN-04, 05, 07)."""

    local = models.ForeignKey(
        Local, on_delete=models.CASCADE, related_name="avaliacoes"
    )
    autor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="avaliacoes_local",
    )
    faixa_horario = models.CharField(
        "faixa de horário", max_length=5, choices=FaixaHorario.choices
    )
    iluminacao = models.CharField(
        "iluminação", max_length=7, choices=Iluminacao.choices, blank=True
    )
    movimento = models.CharField(max_length=15, choices=Movimento.choices)
    limpeza = models.CharField(max_length=7, choices=Limpeza.choices)
    registrado_em = models.DateTimeField("registrado em", default=timezone.now)

    class Meta:
        verbose_name = "avaliação do local"
        verbose_name_plural = "avaliações do local"
        ordering = ["-registrado_em"]
        constraints = [
            # RN-05: à noite, a iluminação é o primeiro fator de segurança citado.
            models.CheckConstraint(
                condition=~Q(faixa_horario=FaixaHorario.NOITE) | ~Q(iluminacao=""),
                name="avaliacao_iluminacao_obrigatoria_noite",
            ),
        ]
        indexes = [
            models.Index(
                fields=["local", "faixa_horario", "-registrado_em"],
                name="avaliacao_local_faixa_data_idx",
            ),
        ]

    def __str__(self):
        return f"{self.local}, {self.get_faixa_horario_display()}"
