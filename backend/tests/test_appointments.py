from __future__ import annotations

from datetime import timedelta

from tests.conftest import login_headers


def _common_slot(client, headers):
    professionals = client.get("/api/professionals").json()
    slots_by_professional: dict[int, dict[str, dict]] = {}
    for professional in professionals[:4]:
        response = client.get(
            f"/api/professionals/{professional['id']}/slots",
            params={"days": 14},
            headers=headers,
        )
        assert response.status_code == 200, response.text
        assert set(response.json()) == {"professional_id", "slots"}
        slots_by_professional[professional["id"]] = {
            slot["starts_at"]: slot for slot in response.json()["slots"]
        }

    professional_ids = list(slots_by_professional)
    for index, first in enumerate(professional_ids):
        for second in professional_ids[index + 1 :]:
            common = set(slots_by_professional[first]) & set(slots_by_professional[second])
            if common:
                starts_at = sorted(common)[0]
                return first, second, starts_at, slots_by_professional[first][starts_at]
    raise AssertionError("Seed should expose a common slot for two professionals")


def test_slots_booking_conflicts_cancel_and_reschedule(client, patient_headers):
    first_professional, second_professional, starts_at, slot = _common_slot(
        client, patient_headers
    )
    assert {
        "starts_at",
        "ends_at",
        "period",
        "recommended",
        "score",
        "reason",
    } <= set(slot)

    requested_date = starts_at[:10]
    client_contract = client.get(
        f"/api/professionals/{first_professional}/slots",
        params={"date_from": requested_date, "date_to": requested_date},
        headers=patient_headers,
    )
    assert client_contract.status_code == 200, client_contract.text
    assert client_contract.json()["slots"]
    assert all(
        item["starts_at"].startswith(requested_date)
        for item in client_contract.json()["slots"]
    )

    created = client.post(
        "/api/appointments",
        headers=patient_headers,
        json={"professional_id": first_professional, "starts_at": starts_at},
    )
    assert created.status_code == 201, created.text
    first_appointment = created.json()
    assert first_appointment["professional"]["id"] == first_professional
    assert first_appointment["patient"]["email"] == "paciente@medsync.test"
    assert first_appointment["specialty"]["id"]
    assert first_appointment["status"] == "scheduled"

    patient_conflict = client.post(
        "/api/appointments",
        headers=patient_headers,
        json={"professional_id": second_professional, "starts_at": starts_at},
    )
    assert patient_conflict.status_code == 409
    assert "patient" in patient_conflict.json()["detail"].lower()

    registration = client.post(
        "/api/auth/register",
        json={
            "email": "conflito@medsync.test",
            "full_name": "Paciente Conflito",
            "password": "demo123",
            "role": "patient",
        },
    )
    assert registration.status_code == 201
    second_patient_headers = login_headers(client, "conflito@medsync.test")

    professional_conflict = client.post(
        "/api/appointments",
        headers=second_patient_headers,
        json={"professional_id": first_professional, "starts_at": starts_at},
    )
    assert professional_conflict.status_code == 409
    assert "professional" in professional_conflict.json()["detail"].lower()

    cancelled = client.patch(
        f"/api/appointments/{first_appointment['id']}/cancel",
        headers=patient_headers,
        json={"reason": "Mudança de planos"},
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"
    assert cancelled.json()["cancellation_reason"] == "Mudança de planos"

    rebooked = client.post(
        "/api/appointments",
        headers=second_patient_headers,
        json={"professional_id": first_professional, "starts_at": starts_at},
    )
    assert rebooked.status_code == 201, rebooked.text

    forbidden = client.post(
        f"/api/appointments/{rebooked.json()['id']}/cancel",
        headers=patient_headers,
        json={},
    )
    assert forbidden.status_code == 403

    available = client.get(
        f"/api/professionals/{first_professional}/slots",
        params={"days": 14},
        headers=second_patient_headers,
    )
    next_slot = next(
        item
        for item in available.json()["slots"]
        if item["starts_at"] != starts_at
    )
    rescheduled = client.patch(
        f"/api/appointments/{rebooked.json()['id']}/reschedule",
        headers=second_patient_headers,
        json={"starts_at": next_slot["starts_at"]},
    )
    assert rescheduled.status_code == 200, rescheduled.text
    assert rescheduled.json()["id"] == rebooked.json()["id"]
    assert rescheduled.json()["starts_at"] == next_slot["starts_at"]

    own_appointments = client.get("/api/appointments", headers=patient_headers)
    assert own_appointments.status_code == 200
    assert any(
        item["id"] == first_appointment["id"] and item["status"] == "cancelled"
        for item in own_appointments.json()
    )


def test_professional_sees_assigned_appointments_only(client):
    headers = login_headers(client, "medico@medsync.test")
    response = client.get("/api/appointments", headers=headers)
    assert response.status_code == 200
    assert response.json()
    assert all(
        appointment["professional"]["email"] == "medico@medsync.test"
        for appointment in response.json()
    )


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "medsync-api",
        "database": "ok",
    }
