from __future__ import annotations

from sqlalchemy import func, select

from app.models import Appointment, Specialty, User
from app.seed import seed_database


def test_seed_is_idempotent_and_demo_login_contract(client, session_factory):
    with session_factory() as db:
        before = (
            db.scalar(select(func.count()).select_from(User)),
            db.scalar(select(func.count()).select_from(Specialty)),
            db.scalar(select(func.count()).select_from(Appointment)),
        )
        seed_database(db)
        after = (
            db.scalar(select(func.count()).select_from(User)),
            db.scalar(select(func.count()).select_from(Specialty)),
            db.scalar(select(func.count()).select_from(Appointment)),
        )
        patient = db.scalar(select(User).where(User.email == "paciente@medsync.test"))
        assert patient.password_hash != "demo123"
        assert patient.password_hash.startswith("pbkdf2_sha256$")
    assert before == after

    response = client.post(
        "/api/auth/login",
        json={"email": "paciente@medsync.test", "password": "demo123"},
    )
    assert response.status_code == 200
    assert set(response.json()) == {"access_token", "token_type", "user"}
    assert response.json()["token_type"] == "bearer"
    assert response.json()["user"]["role"] == "patient"

    token = response.json()["access_token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "paciente@medsync.test"

    tampered = token[:-1] + ("a" if token[-1] != "a" else "b")
    assert client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {tampered}"}
    ).status_code == 401


def test_registration_and_admin_catalog_permissions(client, admin_headers, patient_headers):
    admin_registration = client.post(
        "/api/auth/register",
        json={
            "email": "forbidden-admin@medsync.test",
            "full_name": "Admin Indevido",
            "password": "demo123",
            "role": "admin",
        },
    )
    assert admin_registration.status_code == 403

    patient = client.post(
        "/api/auth/register",
        json={
            "email": "novo-paciente@medsync.test",
            "full_name": "Nova Paciente",
            "password": "segredo123",
            "role": "patient",
            "preferred_period": "afternoon",
        },
    )
    assert patient.status_code == 201
    assert patient.json()["email"] == "novo-paciente@medsync.test"
    assert client.post(
        "/api/auth/register",
        json={
            "email": "novo-paciente@medsync.test",
            "full_name": "Duplicada",
            "password": "segredo123",
            "role": "patient",
        },
    ).status_code == 409

    forbidden = client.post(
        "/api/specialties",
        headers=patient_headers,
        json={"name": "Neurologia de Teste"},
    )
    assert forbidden.status_code == 403

    specialty = client.post(
        "/api/specialties",
        headers=admin_headers,
        json={
            "name": "Neurologia de Teste",
            "description": "Especialidade criada pelo teste.",
        },
    )
    assert specialty.status_code == 201

    professional = client.post(
        "/api/professionals",
        headers=admin_headers,
        json={
            "email": "neurologista@medsync.test",
            "full_name": "Dra. Teste Neurologia",
            "password": "demo123",
            "specialty_id": specialty.json()["id"],
            "crm": "CRM-TEST-100",
        },
    )
    assert professional.status_code == 201
    body = professional.json()
    assert body["specialty"]["name"] == "Neurologia de Teste"
    assert body["email"] == "neurologista@medsync.test"


def test_specialties_and_professionals_are_public(client):
    specialties = client.get("/api/specialties")
    assert specialties.status_code == 200
    assert {item["name"] for item in specialties.json()} >= {
        "Clínica Geral",
        "Cardiologia",
        "Dermatologia",
        "Pediatria",
    }

    professionals = client.get("/api/professionals")
    assert professionals.status_code == 200
    assert len(professionals.json()) >= 4
    assert all("specialty" in item and "full_name" in item for item in professionals.json())
