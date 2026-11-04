"""Páginas do front-end (README, decisão 26).

A view só entrega o HTML. Os dados chegam depois, pela API, via jQuery
(Docs/API.md, seção 6.1).
"""

from django.views.generic import TemplateView


class MapaView(TemplateView):
    template_name = "paginas/mapa.html"
