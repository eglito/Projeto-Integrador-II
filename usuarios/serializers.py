from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

Usuario = get_user_model()

SENHA_ATUAL_AUSENTE = "Informe a sua senha atual para confirmar a troca."


class CampoNomeDeUsuario(serializers.CharField):
    """Nome de usuário normalizado (Unicode NFKC) antes dos validadores.

    Sem isto, "ｐｒａｔｉｃａｎｔｅ", com letras de largura total, passaria na
    unicidade e seria gravado como imitação visual de "praticante". Segue o
    UsernameField do Django: texto longo demais não é normalizado, porque o
    limite de tamanho já o recusa.
    """

    def to_internal_value(self, dado):
        valor = super().to_internal_value(dado)
        if self.max_length is not None and len(valor) > self.max_length:
            return valor
        return Usuario.normalize_username(valor)


def campo_nome_novo():
    """Nome para cadastrar ou trocar: normalizado, no formato e ainda livre.

    Substitui o campo que o ModelSerializer copiaria do model, para normalizar o
    nome e para a mensagem de nome em uso dizer como corrigir (CLAUDE.md,
    Acessibilidade).
    """
    return CampoNomeDeUsuario(
        max_length=Usuario._meta.get_field("username").max_length,
        validators=[
            UnicodeUsernameValidator(),
            UniqueValidator(
                queryset=Usuario.objects.all(),
                message="Este nome de usuário já está em uso. Escolha outro.",
            ),
        ],
    )


def campo_senha_atual():
    return serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
        error_messages={"required": SENHA_ATUAL_AUSENTE, "blank": SENHA_ATUAL_AUSENTE},
    )


def conferir_senha_atual(usuario, senha):
    """Quem achar a sessão aberta num computador emprestado não muda a conta (decisão 23)."""
    if not usuario.check_password(senha):
        raise serializers.ValidationError(
            "Senha atual incorreta. Digite a senha que você usa para entrar."
        )
    return senha


class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ["id", "username"]


class CadastroSerializer(serializers.ModelSerializer):
    """Cadastro com o mínimo de dados pessoais (LGPD): só usuário e senha."""

    username = campo_nome_novo()
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
    # Normalizado como no cadastro: a variante de largura total acha a conta.
    username = CampoNomeDeUsuario()
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


class ContaSerializer(serializers.ModelSerializer):
    """Troca do nome de usuário, confirmada pela senha atual (decisão 23).

    O nome aparece na autoria dos cadastros (RN-08). Recebe o próprio usuário
    como `instance`: o save() atualiza essa conta.
    """

    username = campo_nome_novo()
    senha_atual = campo_senha_atual()

    class Meta:
        model = Usuario
        fields = ["username", "senha_atual"]

    def validate_senha_atual(self, senha):
        return conferir_senha_atual(self.instance, senha)

    def update(self, usuario, dados):
        usuario.username = dados["username"]
        usuario.save(update_fields=["username"])
        return usuario


class TrocaSenhaSerializer(serializers.Serializer):
    """Troca de senha, confirmada pela senha atual (decisão 23).

    A nova senha passa pelos mesmos validadores do cadastro (settings.py).
    """

    senha_atual = campo_senha_atual()
    nova_senha = serializers.CharField(
        write_only=True, style={"input_type": "password"}
    )

    def validate_senha_atual(self, senha):
        return conferir_senha_atual(self.instance, senha)

    def validate(self, dados):
        # Uma "troca" pela mesma senha não muda nada e ainda derrubaria as
        # outras sessões da conta.
        if dados["nova_senha"] == dados["senha_atual"]:
            raise serializers.ValidationError(
                {"nova_senha": "A nova senha precisa ser diferente da atual."}
            )
        try:
            validate_password(dados["nova_senha"], user=self.instance)
        except DjangoValidationError as erro:
            raise serializers.ValidationError({"nova_senha": erro.messages}) from erro
        return dados

    def update(self, usuario, dados):
        usuario.set_password(dados["nova_senha"])
        usuario.save(update_fields=["password"])
        return usuario
