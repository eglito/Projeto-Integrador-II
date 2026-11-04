"""Carrega os locais reais de Araraquara no banco de desenvolvimento (decisão 37).

Pode rodar quantas vezes for preciso: usa a mesma regra de duplicata da API
(RN-01) e pula o local que já existe, sem alterar o que está no banco.
"""

from django.contrib.gis.geos import Point
from django.core.management.base import BaseCommand
from django.db import transaction

from locais.dados_araraquara import COORDENADAS, EQUIPAMENTOS
from locais.models import Equipamento, Municipio, TipoEquipamento
from locais.servicos import PossivelDuplicata, cadastrar_local


class Command(BaseCommand):
    help = "Cadastra os locais reais de Araraquara que ainda não existem no banco."

    def handle(self, *args, **options):
        criados = 0
        for nome, (longitude, latitude) in COORDENADAS.items():
            try:
                # Local e equipamentos entram juntos, ou nenhum dos dois.
                with transaction.atomic():
                    # Sem autor: dado de exemplo, não contribuição de uma pessoa.
                    local = cadastrar_local(
                        autor=None,
                        nome=nome,
                        ponto=Point(longitude, latitude, srid=4326),
                        municipio_ibge=Municipio.ARARAQUARA,
                    )
                    for tipo in EQUIPAMENTOS.get(nome, []):
                        Equipamento.objects.create(
                            local=local, tipo=TipoEquipamento(tipo)
                        )
            except PossivelDuplicata as duplicata:
                existente = duplicata.candidatos.first()
                self.stdout.write(
                    f"Já existe: {nome}. Encontrado “{existente.nome}” "
                    f"(id {existente.pk}), a {existente.distancia.m:.0f} m."
                )
                continue
            criados += 1
            self.stdout.write(self.style.SUCCESS(f"Criado: {nome} (id {local.pk})."))

        self.stdout.write(
            f"Criados: {criados}. Já existiam: {len(COORDENADAS) - criados}."
        )
