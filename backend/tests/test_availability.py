from __future__ import annotations

from tests.conftest import login_headers


def test_professional_manages_only_own_availability(
    client, professional_headers, patient_headers
):
    current = client.get("/api/availability", headers=professional_headers)
    assert current.status_code == 200
    assert current.json()

    patient_attempt = client.get("/api/availability", headers=patient_headers)
    assert patient_attempt.status_code == 403

    created = client.post(
        "/api/availability",
        headers=professional_headers,
        json={"weekday": 5, "start_time": "08:00", "end_time": "09:00"},
    )
    assert created.status_code == 201, created.text
    rule = created.json()
    assert rule["weekday"] == 5

    overlap = client.post(
        "/api/availability",
        headers=professional_headers,
        json={"weekday": 5, "start_time": "08:30", "end_time": "09:30"},
    )
    assert overlap.status_code == 409

    other_professional = login_headers(client, "cardiologista@medsync.test")
    forbidden_delete = client.delete(
        f"/api/availability/{rule['id']}", headers=other_professional
    )
    assert forbidden_delete.status_code == 403

    deleted = client.delete(
        f"/api/availability/{rule['id']}", headers=professional_headers
    )
    assert deleted.status_code == 200


def test_availability_requires_half_hour_boundaries(client, professional_headers):
    response = client.post(
        "/api/availability",
        headers=professional_headers,
        json={"weekday": 6, "start_time": "08:15", "end_time": "09:00"},
    )
    assert response.status_code == 422
