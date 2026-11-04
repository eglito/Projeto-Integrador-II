from django.urls import path

from . import views

urlpatterns = [
    path("", views.MapaView.as_view(), name="mapa"),
]
