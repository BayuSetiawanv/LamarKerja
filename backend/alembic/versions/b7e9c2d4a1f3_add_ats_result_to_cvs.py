"""add ats_result column to cvs

Revision ID: b7e9c2d4a1f3
Revises: 59f0bd734068
Create Date: 2026-09-19
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "b7e9c2d4a1f3"
down_revision = "59f0bd734068"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "cvs",
        sa.Column("ats_result", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("cvs", "ats_result")