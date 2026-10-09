"""Autenticação por sessão para o front-end jQuery (mesmo domínio).

Fluxo: GET /api/auth/sessao/ entrega o cookie csrftoken; o jQuery o envia no
cabeçalho X-CSRFToken em todo POST.
"""

from django.contrib.auth import login, logout
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    CadastroSerializer,
    LoginSerializer,
    SessaoSerializer,
    UsuarioSerializer,
)


class ExigeCsrfMixin:
    """Cobra o token CSRF também de quem ainda não está logado.

    O DRF só verifica CSRF em sessões autenticadas. Sem esta verificação no
    login e no cadastro, outro site poderia autenticar a vítima numa conta
    do atacante ("login CSRF").
    """

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        SessionAuthentication().enforce_csrf(request)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class SessaoView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses=SessaoSerializer)
    def get(self, request):
        autenticado = request.user.is_authenticated
        usuario = UsuarioSerializer(request.user).data if autenticado else None
        return Response({"autenticado": autenticado, "usuario": usuario})


class CadastroView(ExigeCsrfMixin, APIView):
    permission_classes = [AllowAny]

    @extend_schema(request=CadastroSerializer, responses={201: UsuarioSerializer})
    def post(self, request):
        serializer = CadastroSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = serializer.save()
        login(request, usuario)
        return Response(UsuarioSerializer(usuario).data, status=status.HTTP_201_CREATED)


class LoginView(ExigeCsrfMixin, APIView):
    permission_classes = [AllowAny]

    @extend_schema(request=LoginSerializer, responses=UsuarioSerializer)
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        usuario = serializer.validated_data["usuario"]
        login(request, usuario)
        return Response(UsuarioSerializer(usuario).data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={204: None})
    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)
