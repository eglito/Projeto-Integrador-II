from rest_framework.routers import DefaultRouter

from .views import LocalViewSet

# O router gera /locais/ (listagem) e /locais/{id}/ (detalhe) a partir do
# ViewSet, como um @RequestMapping que cobre o recurso inteiro.
router = DefaultRouter()
router.register("locais", LocalViewSet, basename="local")

urlpatterns = router.urls
