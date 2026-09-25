from django.contrib.auth.models import AbstractUser


class Usuario(AbstractUser):
    """Usuário da aplicação.

    Por enquanto é idêntico ao usuário padrão do Django. Existe desde a
    primeira migration porque trocar o modelo de usuário depois que o banco
    tem dados exige recriar as tabelas. Campos novos entram aqui quando a
    pesquisa com usuários indicar a necessidade.
    """
