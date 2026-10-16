from django.urls import path

from .views import DenunciaView

urlpatterns = [
    path(
        "locais/<int:local_id>/denuncias/",
        DenunciaView.as_view(),
        name="local-denuncias",
    ),
]
