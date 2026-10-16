from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from locais.models import Local

from .serializers import DenunciaSerializer


class DenunciaView(APIView):
    """Abre uma denúncia sobre um local (RN-08). A análise é feita no admin."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=DenunciaSerializer, responses={201: DenunciaSerializer})
    def post(self, request, local_id):
        local = get_object_or_404(Local, pk=local_id)
        serializer = DenunciaSerializer(
            data=request.data, context={"request": request, "local": local}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(local=local, autor=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
