from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from .views import OpcoesView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("usuarios.urls")),
    path("api/", include("locais.urls")),
    path("api/", include("moderacao.urls")),
    path("api/opcoes/", OpcoesView.as_view(), name="opcoes"),
    path("", include("fotos.urls")),
    # OpenAPI: o esquema em JSON/YAML e a interface navegável que o lê.
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
    # Front-end: a página do mapa, que consome a API acima.
    path("", include("paginas.urls")),
]

# Fotos enviadas. Sem o bucket (Fase 5 adiada), o próprio Django as entrega,
# também com DEBUG desligado. Serve para o MVP e a demonstração, não para tráfego real.
urlpatterns += [
    re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
]