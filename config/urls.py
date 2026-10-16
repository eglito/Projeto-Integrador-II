from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
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
]

# Serve as fotos no desenvolvimento. Em produção, quem serve é o bucket.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
