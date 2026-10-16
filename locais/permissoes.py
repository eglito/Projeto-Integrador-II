from rest_framework.permissions import SAFE_METHODS, BasePermission


class SomenteAutorEdita(BasePermission):
    """Ler é livre; alterar um local ou equipamento é só para quem o cadastrou.

    Os demais contribuem com registros, avaliações e denúncias (RN-08).
    """

    message = (
        "Só quem cadastrou pode alterar este item. Se a informação estiver "
        "errada, abra uma denúncia para a moderação."
    )

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return obj.criado_por_id == request.user.id
