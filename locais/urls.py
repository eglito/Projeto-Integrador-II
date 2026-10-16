from rest_framework.routers import DefaultRouter

from .views import EquipamentoViewSet, LocalViewSet

# O router gera as rotas a partir dos ViewSets, como um @RequestMapping que
# cobre o recurso inteiro: /locais/, /locais/{id}/, /equipamentos/{id}/ e as
# ações aninhadas (@action).
router = DefaultRouter()
router.register("locais", LocalViewSet, basename="local")
router.register("equipamentos", EquipamentoViewSet, basename="equipamento")

urlpatterns = router.urls
