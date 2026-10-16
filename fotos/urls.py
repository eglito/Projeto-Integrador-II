from django.urls import path

from .views import ArmazenamentoLocalView, UploadView

urlpatterns = [
    path("api/uploads/", UploadView.as_view(), name="uploads"),
    # Simulação do bucket no desenvolvimento (README, decisão 15).
    path(
        "armazenamento-local/<str:token>/",
        ArmazenamentoLocalView.as_view(),
        name="armazenamento-local",
    ),
]
