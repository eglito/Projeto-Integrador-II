from django.contrib import admin

from .models import Denuncia


@admin.register(Denuncia)
class DenunciaAdmin(admin.ModelAdmin):
    list_display = ["local", "motivo", "status", "autor", "criada_em"]
    list_filter = ["status", "motivo"]
    # O moderador muda o status direto na lista, sem abrir cada denúncia.
    list_editable = ["status"]
    readonly_fields = ["local", "autor", "motivo", "criada_em"]
    list_select_related = ["local", "autor"]
