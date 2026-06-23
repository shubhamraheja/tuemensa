import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app


def test_health():
    async def _run():
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "OK"

    asyncio.run(_run())
