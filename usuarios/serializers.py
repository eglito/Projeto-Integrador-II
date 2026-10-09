from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

Usuario = get_user_model()


class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ["id", "username"]


class CadastroSerializer(serializers.ModelSerializer):
    """Cadastro com o mínimo de dados pessoais (LGPD): só usuário e senha."""

    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    class Meta:
        model = Usuario
        fields = ["username", "password"]

    def validate(self, dados):
        # Os validadores do settings.py (tamanho mínimo, senha comum, senha
        # parecida com o usuário) já explicam em português como corrigir.
        try:
            validate_password(
                dados["password"], user=Usuario(username=dados["username"])
            )
        except DjangoValidationError as erro:
            raise serializers.ValidationError({"password": erro.messages}) from erro
        return dados

    def create(self, dados):
        return Usuario.objects.create_user(**dados)


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate(self, dados):
        usuario = authenticate(
            self.context["request"],
            username=dados["username"],
            password=dados["password"],
        )
        if usuario is None:
            # Mensagem única para usuário inexistente e senha errada: não revela
            # quais nomes de usuário existem.
            raise serializers.ValidationError(
                "Usuário ou senha incorretos. Confira os dois campos e tente de novo."
            )
        dados["usuario"] = usuario
        return dados


class SessaoSerializer(serializers.Serializer):
    autenticado = serializers.BooleanField()
    usuario = UsuarioSerializer(allow_null=True)
