from django.urls import path

from . import views

urlpatterns = [
    path("sessao/", views.SessaoView.as_view(), name="sessao"),
    path("cadastro/", views.CadastroView.as_view(), name="cadastro"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
]
