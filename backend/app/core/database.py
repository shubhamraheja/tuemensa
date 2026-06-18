from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings


async def init_db(document_models: list):
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db_name = settings.mongodb_uri.split("/")[-1]
    await init_beanie(database=client[db_name], document_models=document_models)
