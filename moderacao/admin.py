from django.contrib import admin

from .models import Denuncia


@admin.register(Denuncia)
class DenunciaAdmin(admin.ModelAdmin):
    list_display = ["local", "motivo", "status", "autor", "criada_em"]
    list_filter = ["status", "motivo"]
    # O moderador muda o status direto na lista, sem abrir cada denúncia.
    list_editable = ["status"]
    list_select_related = ["local", "autor"]

    def get_readonly_fields(self, request, obj=None):
        # Na criação (obj is None), local e motivo precisam estar no formulário.
        # Depois de criada, o conteúdo da denúncia é do autor: o moderador só
        # decide o status (RN-08).
        if obj is None:
            return ["autor", "criada_em"]
        return ["local", "autor", "motivo", "criada_em"]

    def save_model(self, request, obj, form, change):
        # RN-08: autoria visível também no que é cadastrado pelo admin.
        if not change:
            obj.autor = request.user
        super().save_model(request, obj, form, change)
