"""creation_tables_initiales

Revision ID: 45bf6855ae0f
Revises: 
Create Date: 2026-04-02 14:06:31.699355

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB
from geoalchemy2 import Geometry

revision: str = '45bf6855ae0f'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:

    op.create_table('zones',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('nom', sa.String(150), nullable=False),
        sa.Column('niveau', sa.String(50), nullable=False),
        sa.Column('parent_id', UUID(as_uuid=True), sa.ForeignKey('zones.id'), nullable=True),
        sa.Column('geom', Geometry('MULTIPOLYGON', srid=4326), nullable=True),
        sa.Column('metadata', JSONB, nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table('mosquito_species',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('nom_commun', sa.String(150), nullable=False),
        sa.Column('nom_scientifique', sa.String(150), nullable=False, unique=True),
        sa.Column('vecteur_paludisme', sa.Boolean(), default=False),
        sa.Column('niveau_danger', sa.Integer()),
        sa.Column('description', sa.Text()),
    )

    op.create_table('users',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(200), nullable=False, unique=True),
        sa.Column('mot_de_passe_hash', sa.String(255), nullable=False),
        sa.Column('role', sa.String(50), default='lecteur'),
        sa.Column('nom_complet', sa.String(200)),
        sa.Column('actif', sa.Boolean(), default=True),
        sa.Column('cree_le', sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table('sensors',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('zone_id', UUID(as_uuid=True), sa.ForeignKey('zones.id', ondelete='CASCADE'), nullable=False),
        sa.Column('numero_serie', sa.String(100), nullable=False, unique=True),
        sa.Column('modele', sa.String(100)),
        sa.Column('statut', sa.String(50), default='actif'),
        sa.Column('localisation', Geometry('POINT', srid=4326), nullable=True),
        sa.Column('installe_le', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('vu_le', sa.DateTime(), nullable=True),
    )

    op.create_table('sensor_data',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('sensor_id', UUID(as_uuid=True), sa.ForeignKey('sensors.id', ondelete='CASCADE'), nullable=False),
        sa.Column('payload_brut', JSONB),
        sa.Column('capture_a', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.create_table('sensor_detections',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('sensor_data_id', UUID(as_uuid=True), sa.ForeignKey('sensor_data.id', ondelete='CASCADE'), nullable=False),
        sa.Column('species_id', UUID(as_uuid=True), sa.ForeignKey('mosquito_species.id'), nullable=False),
        sa.Column('nombre_detecte', sa.Integer(), nullable=False),
    )

    op.create_table('risk_scores',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('zone_id', UUID(as_uuid=True), sa.ForeignKey('zones.id', ondelete='CASCADE'), nullable=False),
        sa.Column('score', sa.Float(), nullable=False),
        sa.Column('niveau_risque', sa.String(50)),
        sa.Column('facteurs', JSONB),
        sa.Column('version_algo', sa.String(50), default='v1.0'),
        sa.Column('calcule_a', sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table('alerts',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('zone_id', UUID(as_uuid=True), sa.ForeignKey('zones.id', ondelete='CASCADE'), nullable=False),
        sa.Column('score_id', UUID(as_uuid=True), sa.ForeignKey('risk_scores.id', ondelete='SET NULL'), nullable=True),
        sa.Column('type', sa.String(100), nullable=False),
        sa.Column('severite', sa.String(50)),
        sa.Column('message', sa.Text()),
        sa.Column('statut', sa.String(50), default='creee'),
        sa.Column('declenchee_a', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('acquittee_a', sa.DateTime(), nullable=True),
    )

    op.create_table('user_zones',
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('zone_id', UUID(as_uuid=True), sa.ForeignKey('zones.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('assigne_le', sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table('alert_recipients',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('alert_id', UUID(as_uuid=True), sa.ForeignKey('alerts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('canal', sa.String(50), default='dashboard'),
        sa.Column('statut_envoi', sa.String(50), default='en_attente'),
        sa.Column('envoye_a', sa.DateTime(), nullable=True),
    )

    # Index de performance
    op.create_index('idx_sensor_data_sensor_id', 'sensor_data', ['sensor_id', sa.text('capture_a DESC')])
    op.create_index('idx_risk_scores_zone', 'risk_scores', ['zone_id', sa.text('calcule_a DESC')])
    op.create_index('idx_alerts_zone_statut', 'alerts', ['zone_id', 'severite', 'statut'])
    op.create_index('idx_sensors_zone', 'sensors', ['zone_id'])
    op.create_index('idx_detections_data', 'sensor_detections', ['sensor_data_id'])


def downgrade() -> None:
    op.drop_index('idx_detections_data', table_name='sensor_detections')
    op.drop_index('idx_sensors_zone', table_name='sensors')
    op.drop_index('idx_alerts_zone_statut', table_name='alerts')
    op.drop_index('idx_risk_scores_zone', table_name='risk_scores')
    op.drop_index('idx_sensor_data_sensor_id', table_name='sensor_data')
    op.drop_table('alert_recipients')
    op.drop_table('user_zones')
    op.drop_table('alerts')
    op.drop_table('risk_scores')
    op.drop_table('sensor_detections')
    op.drop_table('sensor_data')
    op.drop_table('sensors')
    op.drop_table('users')
    op.drop_table('mosquito_species')
    op.drop_table('zones')