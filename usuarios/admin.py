from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Usuario

# UserAdmin é a tela de usuário que o Django já traz (senha com hash,
# permissões, grupos). Só a reaproveitamos para o modelo customizado.
admin.site.register(Usuario, UserAdmin)
