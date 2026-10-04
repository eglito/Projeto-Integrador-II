from django.conf import settings
from django.db import models


class MotivoDenuncia(models.TextChoices):
    LOCAL_INEXISTENTE = "local_inexistente", "Local não existe"
    LOCAL_DUPLICADO = "local_duplicado", "Local duplicado"
    EQUIPAMENTO_INCORRETO = "equipamento_incorreto", "Equipamento incorreto"
    AVALIACAO_INCORRETA = "avaliacao_incorreta", "Avaliação incorreta"
    FOTO_INADEQUADA = "foto_inadequada", "Foto inadequada"


class StatusDenuncia(models.TextChoices):
    ABERTA = "aberta", "Aberta"
    PROCEDENTE = "procedente", "Procedente"
    IMPROCEDENTE = "improcedente", "Improcedente"


class Denuncia(models.Model):
    """Pedido de correção sobre um local, analisado no admin (RN-08, decisão D4)."""

    local = models.ForeignKey(
        "locais.Local", on_delete=models.CASCADE, related_name="denuncias"
    )
    autor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="denuncias",
    )
    motivo = models.CharField(max_length=21, choices=MotivoDenuncia.choices)
    status = models.CharField(
        max_length=12, choices=StatusDenuncia.choices, default=StatusDenuncia.ABERTA
    )
    criada_em = models.DateTimeField("criada em", auto_now_add=True)

    class Meta:
        verbose_name = "denúncia"
        verbose_name_plural = "denúncias"
        ordering = ["-criada_em"]

    def __str__(self):
        return f"{self.get_motivo_display()}: {self.local}"
