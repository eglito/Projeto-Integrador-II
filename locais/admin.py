from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin

from .models import AvaliacaoLocal, Equipamento, Local, RegistroCondicao


class EquipamentoInline(admin.TabularInline):
    model = Equipamento
    extra = 0
    fields = ["tipo", "nome_outro", "altura_cm", "largura_cm"]


@admin.register(Local)
class LocalAdmin(GISModelAdmin):
    list_display = ["nome", "municipio_ibge", "criado_por", "criado_em"]
    list_filter = ["municipio_ibge"]
    search_fields = ["nome", "endereco"]
    readonly_fields = ["criado_por", "criado_em"]
    inlines = [EquipamentoInline]
    # Centro do mapa de edição (OpenStreetMap). É só conveniência da tela:
    # nenhuma regra depende de Araraquara (RN-09).
    gis_widget_kwargs = {
        "attrs": {
            "default_lat": -21.7886713,
            "default_lon": -48.1773096,
            "default_zoom": 13,
        }
    }

    def save_model(self, request, obj, form, change):
        # RN-08: autoria visível também no que é cadastrado pelo admin.
        if not change:
            obj.criado_por = request.user
        super().save_model(request, obj, form, change)

    def save_formset(self, request, form, formset, change):
        # save(commit=False) vem primeiro: é ele que cria formset.deleted_objects.
        equipamentos = formset.save(commit=False)
        for equipamento in formset.deleted_objects:
            equipamento.delete()
        for equipamento in equipamentos:
            if equipamento.criado_por_id is None:
                equipamento.criado_por = request.user
            equipamento.save()
        formset.save_m2m()


@admin.register(RegistroCondicao)
class RegistroCondicaoAdmin(admin.ModelAdmin):
    list_display = ["equipamento", "condicao", "autor", "registrado_em"]
    list_filter = ["condicao"]
    list_select_related = ["equipamento__local", "autor"]


@admin.register(AvaliacaoLocal)
class AvaliacaoLocalAdmin(admin.ModelAdmin):
    list_display = [
        "local",
        "faixa_horario",
        "iluminacao",
        "movimento",
        "limpeza",
        "registrado_em",
    ]
    list_filter = ["faixa_horario", "movimento", "limpeza"]
    list_select_related = ["local"]
